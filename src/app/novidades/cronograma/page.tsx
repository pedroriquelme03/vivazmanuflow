import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { rotuloRitmo, type UnidadePreventiva } from "@/lib/preventiva";
import { formatarPercentual } from "@/lib/novidades/calculos";
import {
  ESTADO_PREVISTO,
  montarCronograma,
  type EstadoPrevisto,
  type RotinaCronograma,
} from "@/lib/novidades/cronograma";
import { Kpi, Titulo, Vazio, cardCls } from "../../governanca/ui";
import { exigirNovidades } from "../acesso";
import { hojeSp } from "../dados";
import { NovidadesShell } from "../NovidadesShell";

export const dynamic = "force-dynamic";

const MESES = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

function dataCurta(iso: string) {
  return `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;
}

export default async function CronogramaPage({
  searchParams,
}: {
  searchParams: Promise<{ ano?: string }>;
}) {
  const perfil = await exigirNovidades("/novidades/cronograma");
  const hoje = hojeSp();
  const { ano: anoParam } = await searchParams;
  const ano = Number(anoParam) > 2000 ? Number(anoParam) : Number(hoje.slice(0, 4));

  const supabase = await createClient();
  const [rotinasRes, chamadosRes] = await Promise.all([
    supabase
      .from("preventivas")
      .select("*, local:preventiva_locais(nome)")
      .eq("ativo", true)
      .order("titulo"),
    supabase
      .from("demandas")
      .select("preventiva_id, criado_em, concluido_em, status")
      .not("preventiva_id", "is", null)
      .gte("criado_em", `${ano - 1}-12-01`)
      .lte("criado_em", `${ano + 1}-01-31`),
  ]);

  const rotinas: RotinaCronograma[] = (rotinasRes.data ?? []).map((r) => ({
    ...r,
    local: (r.local as { nome: string } | null)?.nome ?? "",
  }));
  const res = montarCronograma(rotinas, chamadosRes.data ?? [], ano, hoje);
  const maior = Math.max(1, ...res.meses.map((m) => m.previstas));
  const porLocal = new Map<string, typeof res.linhas>();
  for (const l of res.linhas) porLocal.set(l.rotina.local, [...(porLocal.get(l.rotina.local) ?? []), l]);

  return (
    <NovidadesShell perfil={perfil} largo>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <Titulo
          titulo={`Cronograma anual ${ano}`}
          subtitulo="Previsto x feito de cada preventiva ativa, mês a mês (como na planilha da Leankeep). As previsões são projetadas a partir da próxima abertura de cada rotina."
        />
        <div className="flex gap-2">
          <Link href={`?ano=${ano - 1}`} className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm">
            ← {ano - 1}
          </Link>
          <Link href={`?ano=${ano + 1}`} className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm">
            {ano + 1} →
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi titulo="Previstas até hoje" valor={res.previstasAteHoje} cor="text-slate-800" />
        <Kpi titulo="Executadas" valor={res.executadas} cor="text-emerald-600" />
        <Kpi titulo="% de execução" valor={formatarPercentual(res.execucao)} cor="text-brand-700" />
        <Kpi titulo="% no prazo" valor={formatarPercentual(res.execucaoNoPrazo)} cor="text-brand-700" />
      </div>
      <p className="mt-2 text-xs text-slate-500">
        Execução = executadas ÷ previstas até hoje. No prazo = feitas antes da próxima data prevista.
        Pendências vencidas sem execução: <b>{res.pendentesAtrasadas}</b>. Canceladas: <b>{res.canceladas}</b>{" "}
        (continuam no denominador).
      </p>

      <section className={`${cardCls} mt-5`}>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
          Previstas x executadas por mês
        </h2>
        <div className="grid grid-cols-12 items-end gap-1 sm:gap-2" style={{ height: 160 }}>
          {res.meses.map((m) => (
            <div key={m.mes} className="flex h-full flex-col justify-end">
              <div className="flex flex-1 items-end justify-center gap-0.5">
                <div
                  className="w-1/2 rounded-t bg-slate-300"
                  style={{ height: `${(m.previstas / maior) * 100}%` }}
                  title={`${m.previstas} previstas`}
                />
                <div
                  className="w-1/2 rounded-t bg-brand-600"
                  style={{ height: `${(m.executadas / maior) * 100}%` }}
                  title={`${m.executadas} executadas`}
                />
              </div>
            </div>
          ))}
        </div>
        <div className="mt-1 grid grid-cols-12 gap-1 text-center text-[10px] text-slate-500 sm:gap-2 sm:text-xs">
          {res.meses.map((m) => (
            <div key={m.mes}>
              <p className="font-semibold text-slate-700">{MESES[m.mes - 1]}</p>
              <p>{m.percentual === null ? "–" : `${Math.round(m.percentual)}%`}</p>
            </div>
          ))}
        </div>
        <div className="mt-3 flex gap-4 text-xs text-slate-600">
          <span className="flex items-center gap-1">
            <span className="h-3 w-3 rounded bg-slate-300" /> Previstas
          </span>
          <span className="flex items-center gap-1">
            <span className="h-3 w-3 rounded bg-brand-600" /> Executadas
          </span>
        </div>
      </section>

      <div className="mt-5 flex flex-wrap gap-2 text-xs">
        {(Object.keys(ESTADO_PREVISTO) as EstadoPrevisto[]).map((e) => (
          <span key={e} className={`rounded-full px-2 py-0.5 ${ESTADO_PREVISTO[e].cor}`}>
            {ESTADO_PREVISTO[e].rotulo}
          </span>
        ))}
      </div>

      {res.linhas.length === 0 ? (
        <div className="mt-4">
          <Vazio texto="Nenhuma preventiva ativa. Crie rotinas em Preventivas ou pela Biblioteca de atividades." />
        </div>
      ) : (
        <div className="mt-3 overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full min-w-[960px] text-sm">
            <thead className="bg-slate-50 text-xs text-slate-500">
              <tr>
                <th className="px-3 py-2 text-left">Rotina</th>
                <th className="px-2 py-2 text-left">Frequência</th>
                {MESES.map((m) => (
                  <th key={m} className="px-1 py-2 text-center">
                    {m}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[...porLocal.entries()].map(([local, linhas]) => (
                <LinhasLocal key={local} local={local} linhas={linhas} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </NovidadesShell>
  );
}

function LinhasLocal({
  local,
  linhas,
}: {
  local: string;
  linhas: ReturnType<typeof montarCronograma>["linhas"];
}) {
  return (
    <>
      <tr className="bg-brand-50/60">
        <td colSpan={14} className="px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-brand-800">
          {local || "Sem lugar"}
        </td>
      </tr>
      {linhas.map((l) => (
        <tr key={l.rotina.id} className="border-t border-slate-100 align-top">
          <td className="max-w-[260px] px-3 py-2 text-slate-700">{l.rotina.titulo}</td>
          <td className="whitespace-nowrap px-2 py-2 text-xs text-slate-500">
            {rotuloRitmo(l.rotina.intervalo_quantidade, l.rotina.intervalo_unidade as UnidadePreventiva)}
          </td>
          {l.meses.map((ocorrencias, i) => (
            <td key={i} className="px-1 py-2 text-center">
              <div className="flex flex-col items-center gap-0.5">
                {ocorrencias.map((o) => (
                  <span
                    key={o.data}
                    className={`rounded px-1 text-[10px] leading-4 ${ESTADO_PREVISTO[o.estado].cor}`}
                    title={`${ESTADO_PREVISTO[o.estado].rotulo} · previsto ${dataCurta(o.data)}${o.feitoEm ? ` · feito ${dataCurta(o.feitoEm)}` : ""}`}
                  >
                    {o.feitoEm ? dataCurta(o.feitoEm) : dataCurta(o.data)}
                  </span>
                ))}
              </div>
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}
