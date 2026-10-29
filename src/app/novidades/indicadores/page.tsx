import { createClient } from "@/lib/supabase/server";
import {
  formatarPercentual,
  mtbfHoras,
  mttrHoras,
  percentual,
  slaNoPrazo,
} from "@/lib/novidades/calculos";
import { montarCronograma, type RotinaCronograma } from "@/lib/novidades/cronograma";
import { ABERTOS, dataBr } from "@/lib/novidades/formato";
import { Titulo, cardCls, inputCls, labelCls } from "../../governanca/ui";
import { exigirNovidades } from "../acesso";
import { hojeSp } from "../dados";
import { ChecklistLocal } from "../Editaveis";
import { NovidadesShell } from "../NovidadesShell";
import { CalculadoraDisponibilidade } from "./Calculadora";

export const dynamic = "force-dynamic";

type Ficha = {
  nome: string;
  valor: string;
  detalhe: string;
  decisao: string;
  formula: string;
  unidade: string;
  populacao: string;
  fontes: string;
  exclusoes: string;
  ausentes: string;
};

const CONFERENCIA = [
  "Período, população e critérios são comparáveis com o mês anterior?",
  "Alguma falha ou atividade apareceu mais de uma vez?",
  "Mudanças de prazo e de escopo estão identificadas?",
  "Concluído, não concluído e pendente estão separados?",
  "Tempo de resposta, espera, reparo e solução estão distinguidos?",
  "Quantos registros ficaram fora do cálculo?",
  "Pendências críticas aparecem além da média?",
];

function menosDias(iso: string, dias: number) {
  const d = new Date(iso + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() - dias);
  return d.toISOString().slice(0, 10);
}

export default async function IndicadoresPage({
  searchParams,
}: {
  searchParams: Promise<{ de?: string; ate?: string }>;
}) {
  const perfil = await exigirNovidades("/novidades/indicadores");
  const hoje = hojeSp();
  const sp = await searchParams;
  const de = sp.de || menosDias(hoje, 30);
  const ate = sp.ate && sp.ate < hoje ? sp.ate : hoje;
  const ini = `${de}T00:00:00-03:00`;
  const fim = `${ate}T23:59:59-03:00`;

  const supabase = await createClient();
  const [rotinasRes, prevRes, slaRes, chamadosRes, abertosRes, falhasRes] = await Promise.all([
    supabase.from("preventivas").select("*, local:preventiva_locais(nome)").eq("ativo", true),
    supabase
      .from("demandas")
      .select("preventiva_id, criado_em, concluido_em, status")
      .not("preventiva_id", "is", null)
      .gte("criado_em", `${Number(de.slice(0, 4)) - 1}-12-01`),
    supabase.from("sla_config").select("prioridade, horas_padrao").is("propriedade_id", null),
    supabase
      .from("demandas")
      .select("criado_em, iniciado_em, concluido_em, prioridade, preventiva_id, status")
      .eq("ambiente", "manutencao")
      .eq("arquivado", false)
      .gte("criado_em", menosDias(de, 60))
      .lte("criado_em", fim),
    supabase
      .from("demandas")
      .select("prazo_confirmado")
      .eq("ambiente", "manutencao")
      .eq("arquivado", false)
      .in("status", ABERTOS),
    supabase
      .from("equipamento_manutencoes")
      .select("equipamento_id, equipamento:equipamentos(codigo, nome)")
      .eq("tipo", "corretiva")
      .gte("realizado_em", ini)
      .lte("realizado_em", fim),
  ]);

  // Preventivas: ocorrências previstas dentro do período (até hoje).
  const rotinas: RotinaCronograma[] = (rotinasRes.data ?? []).map((r) => ({
    ...r,
    local: (r.local as { nome: string } | null)?.nome ?? "",
  }));
  let previstas = 0;
  let executadas = 0;
  let noPrazo = 0;
  const anos = [...new Set([Number(de.slice(0, 4)), Number(ate.slice(0, 4))])];
  for (const ano of anos) {
    const cron = montarCronograma(rotinas, prevRes.data ?? [], ano, hoje);
    for (const l of cron.linhas)
      for (const mes of l.meses)
        for (const o of mes) {
          if (o.data < de || o.data > ate) continue;
          previstas += 1;
          if (o.feitoEm) executadas += 1;
          if (o.estado === "no_prazo") noPrazo += 1;
        }
  }

  const chamados = chamadosRes.data ?? [];
  const horasSla: Record<string, number> = {};
  for (const s of slaRes.data ?? []) horasSla[s.prioridade] = s.horas_padrao;
  const sla = slaNoPrazo(chamados, horasSla, de, ate, new Date().toISOString());

  const corretivasConcluidas = chamados.filter(
    (c) => !c.preventiva_id && c.concluido_em && c.concluido_em >= ini && c.concluido_em <= fim,
  );
  const mttr = mttrHoras(corretivasConcluidas.map((c) => ({ inicio: c.iniciado_em, fim: c.concluido_em })));

  const abertos = abertosRes.data ?? [];
  const atrasadas = abertos.filter((a) => a.prazo_confirmado && a.prazo_confirmado.slice(0, 10) < hoje).length;

  const horasPeriodo = (Date.parse(fim) - Date.parse(ini)) / 3_600_000;
  const falhasPorEq = new Map<string, { nome: string; falhas: number }>();
  for (const f of falhasRes.data ?? []) {
    const eq = f.equipamento as { codigo: string; nome: string } | null;
    const atual = falhasPorEq.get(f.equipamento_id) ?? { nome: eq ? `${eq.codigo} · ${eq.nome}` : "?", falhas: 0 };
    atual.falhas += 1;
    falhasPorEq.set(f.equipamento_id, atual);
  }
  const rankingFalhas = [...falhasPorEq.values()].sort((a, b) => b.falhas - a.falhas).slice(0, 8);

  const fichas: Ficha[] = [
    {
      nome: "Preventiva no prazo",
      valor: formatarPercentual(percentual(noPrazo, previstas)),
      detalhe: `${noPrazo} de ${previstas} previstas`,
      decisao: "Fizemos o que vencia no período? Se cair, rever programação e capacidade.",
      formula: "Preventivas feitas antes da próxima data ÷ preventivas previstas no período × 100",
      unidade: "%",
      populacao: "Rotinas ativas em Preventivas",
      fontes: "Data prevista (projetada), abertura e conclusão do chamado da preventiva",
      exclusoes: "Rotinas inativas. Canceladas continuam no denominador",
      ausentes: "Previsão sem chamado conta como não feita",
    },
    {
      nome: "Execução total",
      valor: formatarPercentual(percentual(executadas, previstas)),
      detalhe: `${executadas} de ${previstas} previstas`,
      decisao: "Quanto do conjunto planejado foi feito, mesmo com atraso.",
      formula: "Preventivas executadas ÷ preventivas previstas × 100",
      unidade: "%",
      populacao: "Mesmo conjunto do indicador anterior",
      fontes: "Conclusão do chamado da preventiva",
      exclusoes: "Fechadas como não realizadas não entram no numerador",
      ausentes: "—",
    },
    {
      nome: "Pendências atrasadas",
      valor: String(atrasadas),
      detalhe: `taxa de atraso ${formatarPercentual(percentual(atrasadas, abertos.length))} de ${abertos.length} em aberto`,
      decisao: "O que ainda está atrasado hoje e precisa de dono e nova previsão.",
      formula: "Chamados em aberto com prazo confirmado antes de hoje",
      unidade: "quantidade",
      populacao: "Chamados abertos da Manutenção (sem arquivados)",
      fontes: "Status e prazo confirmado",
      exclusoes: "Chamados sem prazo confirmado não entram",
      ausentes: "Sem prazo = não dá para dizer se está atrasado",
    },
    {
      nome: "Atendimento dentro do SLA",
      valor: formatarPercentual(sla.valor),
      detalhe: `${sla.noPrazo} de ${sla.elegiveis} com prazo vencendo no período${sla.semRegra ? ` · ${sla.semRegra} sem regra de SLA` : ""}`,
      decisao: "Cumprimos o tempo combinado por prioridade?",
      formula: "Chamados concluídos até o limite ÷ chamados cujo limite venceu no período × 100",
      unidade: "%",
      populacao: "Chamados da Manutenção, limite pelo SLA padrão da prioridade",
      fontes: "Abertura, conclusão, prioridade e SLA cadastrado",
      exclusoes: "Limites que ainda não venceram (resultado parcial)",
      ausentes: "Prioridade sem SLA cadastrado fica fora e é contada à parte",
    },
    {
      nome: "MTTR (tempo médio de reparo)",
      valor: mttr.valor === null ? "Sem base" : `${mttr.valor.toLocaleString("pt-BR")} h`,
      detalhe: `${mttr.considerados} corretiva(s) concluída(s)${mttr.semInicio ? ` · ${mttr.semInicio} sem hora de início (fora)` : ""}`,
      decisao: "Quanto tempo um reparo leva do início ao fim.",
      formula: "Soma da duração (início → conclusão) ÷ número de reparos concluídos no período",
      unidade: "horas",
      populacao: "Chamados corretivos concluídos no período",
      fontes: "Iniciado em e concluído em",
      exclusoes: "Preventivas e reparos ainda abertos",
      ausentes: "Sem hora de início: fora do cálculo, contado à parte",
    },
    {
      nome: "MTBF (tempo médio entre falhas)",
      valor:
        rankingFalhas.length === 0
          ? "Sem falhas"
          : `${(mtbfHoras(horasPeriodo, rankingFalhas[0].falhas) ?? 0).toLocaleString("pt-BR")} h`,
      detalhe:
        rankingFalhas.length === 0
          ? "nenhuma corretiva registrada em equipamento no período"
          : `pior equipamento: ${rankingFalhas[0].nome}`,
      decisao: "Com que frequência o equipamento falha. Descreve o passado, não prevê a próxima falha.",
      formula: "Horas de operação ÷ número de falhas no mesmo intervalo",
      unidade: "horas",
      populacao: "Equipamentos com manutenção corretiva registrada",
      fontes: "Histórico do equipamento (QR code)",
      exclusoes: "Pedidos duplicados da mesma parada",
      ausentes: "Usa horas de calendário do período como aproximação das horas de operação",
    },
  ];

  return (
    <NovidadesShell perfil={perfil} largo>
      <Titulo
        titulo="Indicadores de manutenção"
        subtitulo="Os indicadores do guia da Leankeep calculados com os dados do Manuflow. Cada um traz a ficha de definição: fórmula, população, fontes, exclusões e tratamento de dados ausentes."
      />
      <form className={`${cardCls} mb-5 grid gap-3 sm:grid-cols-3`}>
        <div>
          <label className={labelCls}>De</label>
          <input type="date" name="de" defaultValue={de} className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Até</label>
          <input type="date" name="ate" defaultValue={ate} className={inputCls} />
        </div>
        <div className="flex items-end">
          <button className="w-full rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white">Calcular</button>
        </div>
      </form>
      <p className="mb-3 text-xs text-slate-500">
        Período {dataBr(de)} a {dataBr(ate)}. Denominador zero aparece como &quot;Sem base&quot;, nunca como 0%.
      </p>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {fichas.map((f) => (
          <details key={f.nome} className={`${cardCls} group`}>
            <summary className="cursor-pointer list-none">
              <p className="text-sm text-slate-500">{f.nome}</p>
              <p className="mt-1 text-3xl font-bold text-brand-700">{f.valor}</p>
              <p className="mt-1 text-xs text-slate-500">{f.detalhe}</p>
              <p className="mt-2 text-xs font-semibold text-brand-700 group-open:hidden">Ver ficha do indicador ▾</p>
            </summary>
            <dl className="mt-3 space-y-1.5 border-t border-slate-100 pt-3 text-xs">
              {(
                [
                  ["Pergunta e decisão", f.decisao],
                  ["Fórmula", f.formula],
                  ["Unidade", f.unidade],
                  ["População", f.populacao],
                  ["Campos de origem", f.fontes],
                  ["Exclusões", f.exclusoes],
                  ["Dados ausentes", f.ausentes],
                ] as const
              ).map(([t, v]) => (
                <div key={t}>
                  <dt className="font-semibold text-slate-600">{t}</dt>
                  <dd className="text-slate-600">{v}</dd>
                </div>
              ))}
            </dl>
          </details>
        ))}
      </div>

      {rankingFalhas.length > 0 && (
        <section className={`${cardCls} mt-5`}>
          <h2 className="font-bold text-slate-800">Equipamentos com mais falhas no período</h2>
          <ul className="mt-2 divide-y divide-slate-100 text-sm">
            {rankingFalhas.map((r) => (
              <li key={r.nome} className="flex justify-between py-1.5">
                <span>{r.nome}</span>
                <span className="text-slate-500">
                  {r.falhas} falha(s) · MTBF ≈ {(mtbfHoras(horasPeriodo, r.falhas) ?? 0).toLocaleString("pt-BR")} h
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="mt-5">
        <CalculadoraDisponibilidade />
      </div>

      <section className={`${cardCls} mt-5`}>
        <h2 className="mb-2 font-bold text-slate-800">Conferência antes de apresentar os números</h2>
        <ChecklistLocal itens={CONFERENCIA} />
        <p className="mt-3 text-xs text-slate-500">
          Ao juntar unidades, some numeradores e denominadores antes de calcular o percentual. Não faça média de
          percentuais. Custo menor pode ser serviço adiado: cruze com execução, falhas e backlog.
        </p>
      </section>
    </NovidadesShell>
  );
}
