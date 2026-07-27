"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Metricas = {
  total_criadas: number;
  concluidas: number;
  abertas_agora: number;
  canceladas: number;
  tempo_medio_min: number | null;
  sla_total: number;
  sla_cumprido: number;
  por_prioridade: { prioridade: string; total: number; tempo_medio_min: number | null }[];
  por_setor: { setor: string; total: number }[];
  por_local: { local: string; total: number }[];
  ranking: { nome: string; total: number; tempo_medio_min: number | null; pct_prazo: number | null }[];
  por_hora: { hora: number; total: number }[];
  por_dia_semana: { dow: number; total: number }[];
};

const PERIODOS = [
  { dias: 7, rotulo: "7 dias" },
  { dias: 30, rotulo: "30 dias" },
  { dias: 90, rotulo: "90 dias" },
];

const DOW = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const PRIO_LABEL: Record<string, string> = { alta: "Alta", media: "Média", baixa: "Baixa" };

function fmtMin(min: number | null): string {
  if (min == null) return "—";
  if (min < 60) return `${min}min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h}h ${m}min` : `${h}h`;
}

export function MetricasDashboard() {
  const supabase = useMemo(() => createClient(), []);
  const [dias, setDias] = useState(30);
  const [dados, setDados] = useState<Metricas | null>(null);
  const [carregando, setCarregando] = useState(true);

  const carregar = useCallback(
    async (nDias: number) => {
      setCarregando(true);
      const fim = new Date();
      const inicio = new Date(fim.getTime() - nDias * 86400_000);
      const { data } = await supabase.rpc("metricas", {
        p_inicio: inicio.toISOString(),
        p_fim: fim.toISOString(),
      });
      setDados(data as unknown as Metricas);
      setCarregando(false);
    },
    [supabase],
  );

  useEffect(() => {
    carregar(dias);
  }, [dias, carregar]);

  const pctSla =
    dados && dados.sla_total > 0
      ? Math.round((dados.sla_cumprido / dados.sla_total) * 100)
      : null;

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6">
      {/* Seletor de período */}
      <div className="mb-5 flex gap-2">
        {PERIODOS.map((p) => (
          <button
            key={p.dias}
            onClick={() => setDias(p.dias)}
            className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition ${
              dias === p.dias
                ? "bg-brand-600 text-white"
                : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
            }`}
          >
            {p.rotulo}
          </button>
        ))}
      </div>

      {carregando || !dados ? (
        <p className="py-16 text-center text-sm text-slate-400">Carregando métricas…</p>
      ) : (
        <div className="grid gap-5">
          {/* KPIs */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Kpi titulo="Criadas no período" valor={dados.total_criadas} />
            <Kpi titulo="Concluídas" valor={dados.concluidas} cor="text-emerald-600" />
            <Kpi titulo="Abertas agora" valor={dados.abertas_agora} cor="text-amber-600" />
            <Kpi
              titulo="SLA cumprido"
              valor={pctSla == null ? "—" : `${pctSla}%`}
              cor={pctSla != null && pctSla >= 80 ? "text-emerald-600" : "text-red-600"}
            />
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            {/* Tempo médio + SLA */}
            <Painel titulo="Tempo médio de atendimento">
              <p className="text-3xl font-bold text-slate-800">
                {fmtMin(dados.tempo_medio_min)}
              </p>
              <p className="mt-1 text-xs text-slate-400">
                Do início do atendimento até a conclusão.
              </p>
              {dados.sla_total > 0 && (
                <div className="mt-4">
                  <div className="mb-1 flex justify-between text-xs text-slate-500">
                    <span>Dentro do prazo</span>
                    <span>
                      {dados.sla_cumprido}/{dados.sla_total}
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-emerald-500"
                      style={{ width: `${pctSla ?? 0}%` }}
                    />
                  </div>
                </div>
              )}
            </Painel>

            {/* Por prioridade */}
            <Painel titulo="Por prioridade">
              <BarList
                itens={dados.por_prioridade.map((p) => ({
                  rotulo: `${PRIO_LABEL[p.prioridade] ?? p.prioridade} · ${fmtMin(p.tempo_medio_min)}`,
                  valor: p.total,
                }))}
              />
            </Painel>

            {/* Por setor */}
            <Painel titulo="Volume por setor solicitante">
              <BarList
                itens={dados.por_setor.map((s) => ({ rotulo: s.setor, valor: s.total }))}
              />
            </Painel>

            {/* Por local */}
            <Painel titulo="Volume por local (top 8)">
              <BarList
                itens={dados.por_local.map((l) => ({ rotulo: l.local, valor: l.total }))}
              />
            </Painel>
          </div>

          {/* Ranking colaboradores */}
          <Painel titulo="Ranking de colaboradores">
            {dados.ranking.length === 0 ? (
              <p className="text-sm text-slate-400">Sem conclusões no período.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-slate-400">
                      <th className="pb-2 font-medium">Colaborador</th>
                      <th className="pb-2 text-right font-medium">Concluídas</th>
                      <th className="pb-2 text-right font-medium">Tempo médio</th>
                      <th className="pb-2 text-right font-medium">No prazo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dados.ranking.map((r) => (
                      <tr key={r.nome} className="border-t border-slate-100">
                        <td className="py-2 font-medium text-slate-700">{r.nome}</td>
                        <td className="py-2 text-right">{r.total}</td>
                        <td className="py-2 text-right">{fmtMin(r.tempo_medio_min)}</td>
                        <td className="py-2 text-right">
                          {r.pct_prazo == null ? "—" : `${r.pct_prazo}%`}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Painel>

          {/* Picos */}
          <div className="grid gap-5 md:grid-cols-2">
            <Painel titulo="Horários de pico (abertura)">
              <HourChart itens={dados.por_hora} />
            </Painel>
            <Painel titulo="Dias de pico (abertura)">
              <BarList
                itens={[0, 1, 2, 3, 4, 5, 6].map((d) => ({
                  rotulo: DOW[d],
                  valor: dados.por_dia_semana.find((x) => x.dow === d)?.total ?? 0,
                }))}
              />
            </Painel>
          </div>
        </div>
      )}
    </main>
  );
}

function Kpi({
  titulo,
  valor,
  cor = "text-slate-800",
}: {
  titulo: string;
  valor: number | string;
  cor?: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <p className="text-xs text-slate-500">{titulo}</p>
      <p className={`mt-1 text-2xl font-bold ${cor}`}>{valor}</p>
    </div>
  );
}

function Painel({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4">
      <h2 className="mb-3 text-sm font-semibold text-slate-600">{titulo}</h2>
      {children}
    </section>
  );
}

function BarList({ itens }: { itens: { rotulo: string; valor: number }[] }) {
  const max = Math.max(1, ...itens.map((i) => i.valor));
  if (itens.length === 0)
    return <p className="text-sm text-slate-400">Sem dados no período.</p>;
  return (
    <div className="grid gap-2">
      {itens.map((i, idx) => (
        <div key={idx} className="flex items-center gap-2">
          <span className="w-28 shrink-0 truncate text-xs text-slate-600" title={i.rotulo}>
            {i.rotulo}
          </span>
          <div className="h-4 flex-1 overflow-hidden rounded bg-slate-100">
            <div
              className="h-full rounded bg-brand-500"
              style={{ width: `${(i.valor / max) * 100}%` }}
            />
          </div>
          <span className="w-6 shrink-0 text-right text-xs font-medium text-slate-500">
            {i.valor}
          </span>
        </div>
      ))}
    </div>
  );
}

function HourChart({ itens }: { itens: { hora: number; total: number }[] }) {
  const mapa = new Map(itens.map((i) => [i.hora, i.total]));
  const max = Math.max(1, ...itens.map((i) => i.total));
  return (
    <div className="flex h-32 items-end gap-0.5">
      {Array.from({ length: 24 }, (_, h) => {
        const v = mapa.get(h) ?? 0;
        return (
          <div key={h} className="flex flex-1 flex-col items-center gap-1">
            <div
              className="w-full rounded-t bg-brand-500"
              style={{ height: `${(v / max) * 100}%`, minHeight: v > 0 ? "3px" : "0" }}
              title={`${h}h: ${v}`}
            />
            {h % 6 === 0 && <span className="text-[9px] text-slate-400">{h}h</span>}
          </div>
        );
      })}
    </div>
  );
}
