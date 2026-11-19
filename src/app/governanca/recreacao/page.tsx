import Link from "next/link";
import type { ReactNode } from "react";
import { createClient } from "@/lib/supabase/server";
import { exigirGovernanca } from "@/lib/governanca-acesso";
import { formatDataHora } from "@/lib/governanca";
import { formatarDataCurta, hojeEmSaoPaulo } from "@/lib/checklist-inspecao";
import {
  PUBLICOS,
  TURNOS,
  decimal,
  filtrarRegistros,
  lerFiltrosRecreacao,
  lerRegistro,
  metricasRecreacao,
  porcentagem,
  type FiltrosRecreacao,
  type Ocupacao,
  type RegistroAtividade,
} from "@/lib/recreacao-metricas";
import { GovernancaShell } from "../GovernancaShell";
import { AbasRelatorios, Titulo, Vazio, btnPrimario, btnSecundario, cardCls, inputCls, labelCls } from "../ui";
import { acessoRecreacao } from "@/lib/checklist-acessos";
import { BuscarOcupacao, Imprimir } from "./Botoes";

export const dynamic = "force-dynamic";

const POR_PAGINA = 500;

export default async function RecreacaoPage({
  searchParams,
}: {
  searchParams: Promise<Partial<Record<keyof FiltrosRecreacao, string>>>;
}) {
  const { perfil, papel } = await exigirGovernanca("/governanca/recreacao", "equipe");
  const supabase = await createClient();
  const { processo, pode } = await acessoRecreacao(supabase, perfil.id, papel);

  if (!processo || !pode) {
    return (
      <GovernancaShell perfil={perfil} papel={papel}>
        <AbasRelatorios atual="recreacao" admin={papel === "admin"} />
        <Titulo titulo="Métricas da Recreação" />
        <Vazio
          texto={
            processo
              ? "Só o líder da Recreação (e o administrador) vê estas métricas."
              : "O checklist de registro da Recreação ainda não foi criado. Rode o SQL 20261119130000_recreacao.sql no Supabase."
          }
        />
      </GovernancaShell>
    );
  }

  const hoje = hojeEmSaoPaulo();
  const f = lerFiltrosRecreacao(await searchParams, hoje);

  async function buscarRegistros() {
    const todas = [];
    for (let inicio = 0; ; inicio += POR_PAGINA) {
      const { data, error } = await supabase
        .from("gov_inspecoes")
        .select("id, data_referencia, camareira_id, inspetor_id, gov_camareiras(nome), usuarios(nome), gov_respostas(pergunta_id, pergunta_texto, valor)")
        .eq("processo_id", processo!.id)
        .eq("status", "finalizada")
        .gte("data_referencia", f.de)
        .lte("data_referencia", f.ate)
        .order("data_referencia")
        .order("id")
        .range(inicio, inicio + POR_PAGINA - 1);
      if (error) throw new Error(error.message);
      todas.push(...(data ?? []));
      if (!data || data.length < POR_PAGINA) return todas;
    }
  }

  const [brutas, { data: perguntas }, { data: ocupacoes }] = await Promise.all([
    buscarRegistros(),
    supabase
      .from("gov_perguntas")
      .select("id, chave, texto, opcoes, gov_secoes!inner(processo_id)")
      .eq("gov_secoes.processo_id", processo.id),
    supabase
      .from("gov_ocupacao_diaria")
      .select("data, adultos, criancas, buscado_em, atualizado_no_painel")
      .gte("data", f.de)
      .lte("data", f.ate)
      .order("data"),
  ]);

  const chaveDa = new Map((perguntas ?? []).map((p) => [p.id, p.chave]));
  const todos: RegistroAtividade[] = brutas.map((i) => {
    const r = lerRegistro(
      i.gov_respostas.map((x) => ({
        chave: (x.pergunta_id && chaveDa.get(x.pergunta_id)) || null,
        texto: x.pergunta_texto,
        valor: x.valor,
      })),
    );
    return {
      id: i.id,
      data: i.data_referencia,
      ...r,
      responsavelId: i.camareira_id ?? `u:${i.inspetor_id}`,
      responsavel: i.gov_camareiras?.nome ?? i.usuarios?.nome ?? "Sem nome",
    };
  });
  const registros = filtrarRegistros(todos, f);
  const ocupacao = new Map<string, Ocupacao>((ocupacoes ?? []).map((o) => [o.data, o]));
  const m = metricasRecreacao(registros, ocupacao, f);

  const opcoesAtividade = [
    ...new Set([
      ...((perguntas ?? []).find((p) => p.chave === "atividade")?.opcoes ?? []),
      ...todos.map((r) => r.atividade),
    ]),
  ].sort((a, b) => a.localeCompare(b));
  const responsaveis = [...new Map(todos.map((r) => [r.responsavelId ?? "", r.responsavel])).entries()].sort((a, b) =>
    a[1].localeCompare(b[1]),
  );
  const ultimaOcupacao = (ocupacoes ?? []).at(-1);
  const algumFiltro = Boolean(f.atividade || f.responsavel || f.publico || f.turno);

  return (
    <GovernancaShell perfil={perfil} papel={papel} largo>
      <AbasRelatorios atual="recreacao" admin={papel === "admin"} />
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <Titulo
          titulo="Métricas da Recreação"
          subtitulo={`Registros do checklist “${processo.nome}” e ocupação do painel operacional.`}
        />
        <div className="flex flex-wrap items-start gap-2 print:hidden">
          <BuscarOcupacao />
          <Imprimir />
        </div>
      </div>

      <form method="get" className={`${cardCls} mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-7 print:hidden`}>
        <label>
          <span className={labelCls}>De</span>
          <input className={inputCls} type="date" name="de" defaultValue={f.de} max={hoje} />
        </label>
        <label>
          <span className={labelCls}>Até</span>
          <input className={inputCls} type="date" name="ate" defaultValue={f.ate} max={hoje} />
        </label>
        <Seletor nome="atividade" rotulo="Atividade" valor={f.atividade} opcoes={opcoesAtividade.map((a) => [a, a])} />
        <Seletor nome="responsavel" rotulo="Responsável" valor={f.responsavel} opcoes={responsaveis} />
        <Seletor
          nome="publico"
          rotulo="Público"
          valor={f.publico}
          opcoes={[...PUBLICOS.map((p) => [p, p] as [string, string]), ["nao_informado", "Não informado"]]}
        />
        <Seletor nome="turno" rotulo="Turno" valor={f.turno} opcoes={TURNOS.map((t) => [t.valor, t.rotulo])} />
        <div className="col-span-2 flex items-end gap-2 sm:col-span-3 lg:col-span-1">
          <button className={`${btnPrimario} flex-1`}>Filtrar</button>
          {algumFiltro && (
            <Link href={`/governanca/recreacao?de=${f.de}&ate=${f.ate}`} className={btnSecundario}>
              Limpar
            </Link>
          )}
        </div>
      </form>

      <p className="mb-4 text-sm text-slate-500">
        {m.realizadas} atividade(s) de {formatarDataCurta(f.de)} a {formatarDataCurta(f.ate)} · ocupação em {m.diasComOcupacao}{" "}
        dia(s)
        {ultimaOcupacao && ` · última ocupação: ${formatarDataCurta(ultimaOcupacao.data)}, buscada ${formatDataHora(ultimaOcupacao.buscado_em)}`}
      </p>

      {m.diasSemOcupacao.length > 0 && (
        <p className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          ⚠ Sem ocupação em {m.diasSemOcupacao.map(formatarDataCurta).join(", ")}: as atividades desses dias contam nas
          participações, mas ficam fora da adesão.
        </p>
      )}

      {m.realizadas === 0 ? (
        <Vazio texto="Nenhum registro de atividade neste período e filtro." />
      ) : (
        <>
          <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
            <Numero titulo="Atividades realizadas" valor={m.realizadas} ajuda="Registros no período" />
            <Numero titulo="Participações" valor={m.participacoes} ajuda="Soma dos participantes" />
            <Numero titulo="Média por atividade" valor={decimal(m.mediaPorAtividade)} ajuda={`Mediana ${decimal(m.mediana)}`} />
            <Numero
              titulo="Adesão"
              valor={porcentagem(m.adesaoPonderada)}
              ajuda={`Participações ÷ hóspedes do público · média por atividade ${porcentagem(m.adesaoMedia)}`}
            />
            <Numero titulo="Hóspedes por dia" valor={decimal(m.mediaHospedes, 0)} ajuda="Média dos dias com ocupação" />
            <Numero titulo="Maior / menor" valor={`${m.maior} / ${m.menor}`} ajuda="Participantes numa atividade" />
            <Numero titulo="Atividades diferentes" valor={m.atividadesDiferentes} ajuda={`${m.responsaveis} responsável(is)`} />
            <Numero
              titulo="Sem ninguém"
              valor={m.semParticipantes}
              ajuda="Atividades com 0 participantes"
            />
          </div>

          <div className="mb-6 grid gap-4 lg:grid-cols-2">
            <Bloco titulo="Participações por dia">
              <Linha pontos={m.porDia.map((d) => ({ rotulo: formatarDataCurta(d.data).slice(0, 5), valor: d.participacoes, dica: `${formatarDataCurta(d.data)}: ${d.participacoes} participações em ${d.realizacoes} atividade(s)${d.hospedes !== null ? ` · ${d.hospedes} hóspedes` : ""}` }))} />
            </Bloco>
            <Bloco titulo="Média de participantes por horário">
              <Colunas
                itens={m.porHorario.map((h) => ({
                  rotulo: h.hora.slice(0, 2) + "h",
                  valor: h.media,
                  dica: `${h.hora}: média ${decimal(h.media)} em ${h.realizacoes} atividade(s)`,
                }))}
              />
            </Bloco>
            <Bloco titulo="Top 10 atividades por participação">
              <Barras itens={m.porAtividade.slice(0, 10).map((a) => ({ rotulo: a.nome, valor: a.participacoes, texto: `${a.participacoes} · ${a.realizacoes}×` }))} />
            </Bloco>
            <Bloco titulo="Participações por público">
              <Barras
                itens={m.porPublico.map((p) => ({
                  rotulo: p.publico,
                  valor: p.participacoes,
                  texto: `${p.participacoes} · ${m.participacoes ? Math.round((p.participacoes / m.participacoes) * 100) : 0}%`,
                }))}
              />
            </Bloco>
            <Bloco titulo="Participações por dia da semana">
              <Colunas
                itens={m.porDiaSemana.map((d) => ({
                  rotulo: d.dia,
                  valor: d.participacoes,
                  dica: `${d.dia}: ${d.participacoes} participações em ${d.realizacoes} atividade(s)`,
                }))}
              />
            </Bloco>
            <Bloco titulo="Participações por responsável">
              <Barras itens={m.porResponsavel.slice(0, 10).map((r) => ({ rotulo: r.nome, valor: r.participacoes, texto: `${r.participacoes} · ${r.realizacoes}×` }))} />
            </Bloco>
          </div>

          <Bloco titulo="Indicadores por atividade e público">
            <Tabela
              cabecalho={["Atividade", "Público", "Real.", "Part.", "Média", "Hóspedes (média)", "Adesão média", "Adesão ponderada"]}
              linhas={m.porAtividadePublico.map((l) => [
                l.nome,
                l.publico ?? "Não informado",
                l.realizacoes,
                l.participacoes,
                decimal(l.media),
                decimal(l.baseMedia, 0),
                porcentagem(l.adesaoMedia),
                porcentagem(l.adesaoPonderada),
              ])}
            />
          </Bloco>

          <div className="mt-4">
            <Bloco titulo="Indicadores por responsável">
              <Tabela
                cabecalho={["Responsável", "Atividades", "Participações", "Média", "Adesão média"]}
                linhas={m.porResponsavel.map((l) => [l.nome, l.realizacoes, l.participacoes, decimal(l.media), porcentagem(l.adesaoMedia)])}
              />
            </Bloco>
          </div>

          <div className="mt-4">
            <Bloco titulo="Registros">
              <Tabela
                cabecalho={["Data", "Hora", "Atividade", "Público", "Part.", "Responsável", ""]}
                linhas={[...registros]
                  .sort((a, b) => b.data.localeCompare(a.data) || (b.hora ?? "").localeCompare(a.hora ?? ""))
                  .map((r) => [
                    formatarDataCurta(r.data),
                    r.hora ?? "–",
                    r.observacoes ? `${r.atividade} · ${r.observacoes}` : r.atividade,
                    r.publico ?? "Não informado",
                    r.participantes,
                    r.responsavel,
                    <Link key={r.id} href={`/governanca/inspecao/${r.id}`} className="text-brand-700 hover:underline print:hidden">
                      Ver
                    </Link>,
                  ])}
              />
            </Bloco>
          </div>
        </>
      )}
    </GovernancaShell>
  );
}

function Seletor({ nome, rotulo, valor, opcoes }: { nome: string; rotulo: string; valor: string; opcoes: [string, string][] }) {
  return (
    <label>
      <span className={labelCls}>{rotulo}</span>
      <select className={inputCls} name={nome} defaultValue={valor}>
        <option value="">Todos</option>
        {opcoes.map(([v, r]) => (
          <option key={v} value={v}>
            {r}
          </option>
        ))}
      </select>
    </label>
  );
}

function Numero({ titulo, valor, ajuda }: { titulo: string; valor: ReactNode; ajuda: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <span className="text-sm text-slate-500">{titulo}</span>
      <p className="mt-1 text-2xl font-bold text-slate-800">{valor}</p>
      <p className="mt-1 text-xs text-slate-400">{ajuda}</p>
    </div>
  );
}

function Bloco({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <section className={`${cardCls} break-inside-avoid`}>
      <h2 className="mb-3 text-base font-semibold text-slate-800">{titulo}</h2>
      {children}
    </section>
  );
}

/** Barras deitadas: nome, barra e número escrito (a cor nunca é a única pista). */
function Barras({ itens }: { itens: { rotulo: string; valor: number; texto: string }[] }) {
  const max = Math.max(1, ...itens.map((i) => i.valor));
  if (!itens.length) return <p className="text-sm text-slate-500">Sem dados.</p>;
  return (
    <div className="space-y-1.5">
      {itens.map((i) => (
        <div key={i.rotulo} className="grid grid-cols-[minmax(0,9rem)_1fr_auto] items-center gap-2 text-sm" title={`${i.rotulo}: ${i.texto}`}>
          <span className="truncate text-slate-700">{i.rotulo}</span>
          <span className="flex h-2.5 overflow-hidden rounded-full bg-slate-100">
            <span className="h-full rounded-full bg-brand-500" style={{ width: `${(i.valor / max) * 100}%` }} />
          </span>
          <span className="whitespace-nowrap text-xs tabular-nums text-slate-500">{i.texto}</span>
        </div>
      ))}
    </div>
  );
}

/** Colunas em pé (horário, dia da semana). Passe o mouse para ver o número. */
function Colunas({ itens }: { itens: { rotulo: string; valor: number; dica: string }[] }) {
  if (!itens.length) return <p className="text-sm text-slate-500">Sem dados.</p>;
  const max = Math.max(1, ...itens.map((i) => i.valor));
  return (
    <div className="flex h-44 items-end gap-1">
      {itens.map((i) => (
        <div key={i.rotulo} className="group flex h-full min-w-0 flex-1 flex-col items-center justify-end" title={i.dica}>
          <span className="mb-0.5 text-[10px] tabular-nums text-slate-500">{i.valor ? decimal(i.valor, i.valor % 1 ? 1 : 0) : ""}</span>
          <span
            className="w-full max-w-10 rounded-t bg-brand-500 transition group-hover:bg-brand-700"
            style={{ height: `${(i.valor / max) * 80}%`, minHeight: i.valor ? 2 : 0 }}
          />
          <span className="mt-1 truncate text-[10px] text-slate-500">{i.rotulo}</span>
        </div>
      ))}
    </div>
  );
}

/** Linha no tempo, em SVG; cada ponto mostra o dia ao passar o mouse. */
function Linha({ pontos }: { pontos: { rotulo: string; valor: number; dica: string }[] }) {
  if (pontos.length === 0) return <p className="text-sm text-slate-500">Sem dados.</p>;
  // Proporção pensada para o celular (o texto não encolhe demais); no computador cresce até 16rem de altura.
  const L = 360;
  const A = 180;
  const m = { e: 30, d: 10, t: 12, b: 24 };
  const max = Math.max(1, ...pontos.map((p) => p.valor));
  const x = (i: number) => m.e + (pontos.length === 1 ? (L - m.e - m.d) / 2 : (i * (L - m.e - m.d)) / (pontos.length - 1));
  const y = (v: number) => A - m.b - (v / max) * (A - m.t - m.b);
  const passo = Math.ceil(pontos.length / 6);
  return (
    <svg viewBox={`0 0 ${L} ${A}`} className="mx-auto h-auto max-h-64 w-full" role="img" aria-label="Participações por dia">
      {[0, 0.5, 1].map((t) => (
        <g key={t}>
          <line x1={m.e} x2={L - m.d} y1={y(max * t)} y2={y(max * t)} className="stroke-slate-200" strokeWidth={1} />
          <text x={m.e - 6} y={y(max * t) + 3} textAnchor="end" className="fill-slate-400 text-[11px]">
            {Math.round(max * t)}
          </text>
        </g>
      ))}
      <polyline
        fill="none"
        className="stroke-brand-600"
        strokeWidth={2}
        strokeLinejoin="round"
        points={pontos.map((p, i) => `${x(i)},${y(p.valor)}`).join(" ")}
      />
      {pontos.map((p, i) => (
        <g key={i}>
          <circle cx={x(i)} cy={y(p.valor)} r={4} className="fill-brand-600 stroke-white" strokeWidth={2} />
          <circle cx={x(i)} cy={y(p.valor)} r={12} fill="transparent">
            <title>{p.dica}</title>
          </circle>
          {i % passo === 0 && (
            <text x={x(i)} y={A - 6} textAnchor="middle" className="fill-slate-500 text-[11px]">
              {p.rotulo}
            </text>
          )}
        </g>
      ))}
    </svg>
  );
}

function Tabela({ cabecalho, linhas }: { cabecalho: string[]; linhas: ReactNode[][] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[32rem] text-left text-sm">
        <thead>
          <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
            {cabecalho.map((c, i) => (
              <th key={i} className="px-2 py-2 font-semibold">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {linhas.map((l, i) => (
            <tr key={i} className="border-b border-slate-100 last:border-0">
              {l.map((c, j) => (
                <td key={j} className="px-2 py-1.5 tabular-nums text-slate-700">
                  {c}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
