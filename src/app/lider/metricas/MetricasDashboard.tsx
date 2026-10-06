"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Database, Enums } from "@/lib/database.types";
import type { AmbienteEquipe } from "@/lib/ambiente-equipe";
import { recursoAmbienteAusente } from "@/lib/ambiente-equipe";
import {
  horasDoDia,
  picoHorario,
  volumeLocaisDigitados,
} from "@/lib/metricas-ti";

type MetricasArgs = Database["public"]["Functions"]["metricas"]["Args"];

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
  por_sublocal?: { local: string; total: number }[];
  ranking: { nome: string; total: number; tempo_medio_min: number | null; pct_prazo: number | null }[];
  por_hora: { hora: number; total: number }[];
  por_dia_semana: { dow: number; total: number }[];
};

type Opcao = { id: string; nome: string };
type LocalOpcao = { id: string; nome: string; propriedade_id: string };
type SetorOpcao = { id: string; nome: string; propriedade_id: string | null };

type ColunaQuadro =
  | ""
  | Enums<"demanda_status">
  | "arquivado";

type Filtros = {
  dias: number;
  colaboradorId: string;
  setorId: string;
  propriedadeId: string;
  localId: string;
  prioridade: "" | Enums<"demanda_prioridade">;
  eventoId: string;
  somenteEventos: "" | "sim" | "nao";
  status: ColunaQuadro;
};

const PERIODOS = [
  { dias: 7, rotulo: "7 dias" },
  { dias: 30, rotulo: "30 dias" },
  { dias: 90, rotulo: "90 dias" },
  { dias: 180, rotulo: "6 meses" },
  { dias: 365, rotulo: "1 ano" },
];

const DOW = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const PRIO_LABEL: Record<string, string> = { alta: "Alta", media: "Média", baixa: "Baixa" };

const COLUNAS_STATUS: { valor: ColunaQuadro; rotulo: string }[] = [
  { valor: "aberta", rotulo: "Abertas" },
  { valor: "atribuida", rotulo: "Atribuídas" },
  { valor: "em_andamento", rotulo: "Em andamento" },
  { valor: "aguardando_validacao", rotulo: "Validação" },
  { valor: "concluida", rotulo: "Concluídas" },
  { valor: "arquivado", rotulo: "Arquivado" },
  { valor: "cancelada", rotulo: "Canceladas" },
];

const STATUS_FILTRO_LABEL: Record<string, string> = Object.fromEntries(
  COLUNAS_STATUS.map((c) => [c.valor, c.rotulo]),
);

const METRICAS_ZERADAS: Metricas = {
  total_criadas: 0,
  concluidas: 0,
  abertas_agora: 0,
  canceladas: 0,
  tempo_medio_min: null,
  sla_total: 0,
  sla_cumprido: 0,
  por_prioridade: [],
  por_setor: [],
  por_local: [],
  por_sublocal: [],
  ranking: [],
  por_hora: [],
  por_dia_semana: [],
};

const FILTROS_VAZIOS: Filtros = {
  dias: 30,
  colaboradorId: "",
  setorId: "",
  propriedadeId: "",
  localId: "",
  prioridade: "",
  eventoId: "",
  somenteEventos: "",
  status: "",
};

function fmtMin(min: number | null): string {
  if (min == null) return "—";
  if (min < 60) return `${min}min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h}h ${m}min` : `${h}h`;
}

export function MetricasDashboard({
  ambiente,
  colaboradores,
  setores,
  propriedades,
  locais,
  eventos,
}: {
  ambiente: AmbienteEquipe;
  colaboradores: Opcao[];
  setores: SetorOpcao[];
  propriedades: Opcao[];
  locais: LocalOpcao[];
  eventos: Opcao[];
}) {
  const supabase = useMemo(() => createClient(), []);
  const [filtros, setFiltros] = useState<Filtros>(FILTROS_VAZIOS);
  const [dados, setDados] = useState<Metricas | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const setoresFiltrados = useMemo(
    () =>
      setores.filter(
        (s) =>
          !filtros.propriedadeId ||
          s.propriedade_id === null ||
          s.propriedade_id === filtros.propriedadeId,
      ),
    [setores, filtros.propriedadeId],
  );

  const locaisFiltrados = useMemo(
    () =>
      locais.filter(
        (l) => !filtros.propriedadeId || l.propriedade_id === filtros.propriedadeId,
      ),
    [locais, filtros.propriedadeId],
  );

  const filtrosAtivos = useMemo(() => {
    const tags: string[] = [];
    if (filtros.colaboradorId) {
      tags.push(
        `Colaborador: ${colaboradores.find((c) => c.id === filtros.colaboradorId)?.nome ?? "?"}`,
      );
    }
    if (ambiente !== "ti" && filtros.setorId) {
      tags.push(`Setor: ${setores.find((s) => s.id === filtros.setorId)?.nome ?? "?"}`);
    }
    if (filtros.propriedadeId) {
      tags.push(
        `Local: ${propriedades.find((p) => p.id === filtros.propriedadeId)?.nome ?? "?"}`,
      );
    }
    if (ambiente !== "ti" && filtros.localId) {
      tags.push(`Sublocal: ${locais.find((l) => l.id === filtros.localId)?.nome ?? "?"}`);
    }
    if (filtros.prioridade) {
      tags.push(`Prioridade: ${PRIO_LABEL[filtros.prioridade]}`);
    }
    if (ambiente !== "ti" && filtros.eventoId) {
      tags.push(`Evento: ${eventos.find((e) => e.id === filtros.eventoId)?.nome ?? "?"}`);
    }
    if (ambiente !== "ti" && filtros.somenteEventos === "sim") {
      tags.push("Somente eventos");
    }
    if (ambiente !== "ti" && filtros.somenteEventos === "nao") {
      tags.push("Somente rotina");
    }
    if (filtros.status) {
      tags.push(`Status: ${STATUS_FILTRO_LABEL[filtros.status] ?? filtros.status}`);
    }
    return tags;
  }, [filtros, colaboradores, setores, propriedades, locais, eventos, ambiente]);

  const carregar = useCallback(async () => {
    setCarregando(true);
    setErro(null);
    const fim = new Date();
    const inicio = new Date(fim.getTime() - filtros.dias * 86400_000);

    const args: MetricasArgs = {
      p_inicio: inicio.toISOString(),
      p_fim: fim.toISOString(),
    };
    if (filtros.colaboradorId) args.p_colaborador_id = filtros.colaboradorId;
    if (ambiente !== "ti" && filtros.setorId) args.p_setor_id = filtros.setorId;
    if (filtros.propriedadeId) args.p_propriedade_id = filtros.propriedadeId;
    if (ambiente !== "ti" && filtros.localId) args.p_local_id = filtros.localId;
    if (filtros.prioridade) args.p_prioridade = filtros.prioridade;
    if (ambiente !== "ti" && filtros.eventoId) args.p_evento_id = filtros.eventoId;
    if (ambiente !== "ti" && filtros.somenteEventos === "sim") {
      args.p_somente_eventos = true;
    }
    if (ambiente !== "ti" && filtros.somenteEventos === "nao") {
      args.p_somente_eventos = false;
    }
    if (filtros.status === "arquivado") {
      args.p_arquivado = true;
    } else if (filtros.status) {
      args.p_status = filtros.status;
      args.p_arquivado = false;
    }

    const comAmbiente = { ...args, p_ambiente: ambiente };
    let { data, error } = await supabase.rpc("metricas", comAmbiente);
    const filtroIndisponivel =
      error != null &&
      (recursoAmbienteAusente(error.message) ||
        error.message.includes("p_ambiente") ||
        error.message.includes("Could not find"));
    if (filtroIndisponivel && ambiente === "ti") {
      setDados(METRICAS_ZERADAS);
      setCarregando(false);
      return;
    }
    if (filtroIndisponivel) {
      const semAmbiente = await supabase.rpc("metricas", args);
      data = semAmbiente.data;
      error = semAmbiente.error;
    }
    if (error) {
      setErro(
        error.message.includes("Could not find") || error.message.includes("function")
          ? "Rode o SQL em supabase/migrations/20260813200000_metricas_filtro_status.sql no Supabase."
          : error.message,
      );
      setDados(null);
    } else {
      setDados(data as unknown as Metricas);
    }
    setCarregando(false);
  }, [supabase, filtros, ambiente]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  useEffect(() => {
    setFiltros((atual) => {
      let mudou = false;
      const next = { ...atual };
      if (ambiente === "ti") {
        if (next.setorId) {
          next.setorId = "";
          mudou = true;
        }
        if (next.localId) {
          next.localId = "";
          mudou = true;
        }
        if (next.eventoId) {
          next.eventoId = "";
          mudou = true;
        }
        if (next.somenteEventos) {
          next.somenteEventos = "";
          mudou = true;
        }
      }
      if (
        atual.colaboradorId &&
        !colaboradores.some((c) => c.id === atual.colaboradorId)
      ) {
        next.colaboradorId = "";
        mudou = true;
      }
      return mudou ? next : atual;
    });
  }, [ambiente, colaboradores]);

  function setFiltro<K extends keyof Filtros>(chave: K, valor: Filtros[K]) {
    setFiltros((atual) => {
      const next = { ...atual, [chave]: valor };
      if (chave === "propriedadeId") {
        next.localId = "";
        next.setorId = "";
      }
      return next;
    });
  }

  const pctSla =
    dados && dados.sla_total > 0
      ? Math.round((dados.sla_cumprido / dados.sla_total) * 100)
      : null;

  const selectCls =
    "rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30";

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6">
      <div className="mb-5 rounded-xl border border-slate-200 bg-white p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h1 className="text-base font-bold text-slate-800">Relatórios</h1>
          <button
            type="button"
            onClick={() => setFiltros(FILTROS_VAZIOS)}
            className="text-xs font-medium text-slate-500 hover:text-brand-700"
          >
            Limpar filtros
          </button>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          {PERIODOS.map((p) => (
            <button
              key={p.dias}
              type="button"
              onClick={() => setFiltro("dias", p.dias)}
              className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition ${
                filtros.dias === p.dias
                  ? "bg-brand-600 text-white"
                  : "border border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100"
              }`}
            >
              {p.rotulo}
            </button>
          ))}
        </div>

        <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          <select
            className={selectCls}
            value={filtros.propriedadeId}
            onChange={(e) => setFiltro("propriedadeId", e.target.value)}
          >
            <option value="">Todos os locais principais</option>
            {propriedades.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nome}
              </option>
            ))}
          </select>

          {ambiente !== "ti" && (
            <>
              <select
                className={selectCls}
                value={filtros.localId}
                onChange={(e) => setFiltro("localId", e.target.value)}
              >
                <option value="">Todos os sublocais</option>
                {locaisFiltrados.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.nome}
                  </option>
                ))}
              </select>

              <select
                className={selectCls}
                value={filtros.setorId}
                onChange={(e) => setFiltro("setorId", e.target.value)}
              >
                <option value="">Todos os setores</option>
                {setoresFiltrados.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.nome}
                  </option>
                ))}
              </select>
            </>
          )}

          <select
            className={selectCls}
            value={filtros.colaboradorId}
            onChange={(e) => setFiltro("colaboradorId", e.target.value)}
          >
            <option value="">Todos os colaboradores</option>
            {colaboradores.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome}
              </option>
            ))}
          </select>

          <select
            className={selectCls}
            value={filtros.status}
            onChange={(e) =>
              setFiltro("status", e.target.value as Filtros["status"])
            }
          >
            <option value="">Todos os status</option>
            {COLUNAS_STATUS.map((c) => (
              <option key={c.valor} value={c.valor}>
                {c.rotulo}
              </option>
            ))}
          </select>

          <select
            className={selectCls}
            value={filtros.prioridade}
            onChange={(e) =>
              setFiltro(
                "prioridade",
                e.target.value as Filtros["prioridade"],
              )
            }
          >
            <option value="">Todas as prioridades</option>
            <option value="alta">Alta</option>
            <option value="media">Média</option>
            <option value="baixa">Baixa</option>
          </select>

          {ambiente !== "ti" && (
            <>
              <select
                className={selectCls}
                value={filtros.eventoId}
                onChange={(e) => setFiltro("eventoId", e.target.value)}
              >
                <option value="">Todos os eventos</option>
                {eventos.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.nome}
                  </option>
                ))}
              </select>

              <select
                className={selectCls}
                value={filtros.somenteEventos}
                onChange={(e) =>
                  setFiltro(
                    "somenteEventos",
                    e.target.value as Filtros["somenteEventos"],
                  )
                }
              >
                <option value="">Rotina + eventos</option>
                <option value="sim">Somente demandas de evento</option>
                <option value="nao">Somente manutenção de rotina</option>
              </select>
            </>
          )}
        </div>

        {filtrosAtivos.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {filtrosAtivos.map((t) => (
              <span
                key={t}
                className="rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-medium text-brand-800 ring-1 ring-brand-200"
              >
                {t}
              </span>
            ))}
          </div>
        )}
      </div>

      {erro && (
        <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {erro}
        </p>
      )}

      {carregando || !dados ? (
        <p className="py-16 text-center text-sm text-slate-400">
          {carregando ? "Carregando métricas…" : "Sem dados para os filtros."}
        </p>
      ) : (
        <div className="grid gap-5">
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

            <Painel titulo="Por prioridade">
              <BarList
                itens={dados.por_prioridade.map((p) => ({
                  rotulo: `${PRIO_LABEL[p.prioridade] ?? p.prioridade} · ${fmtMin(p.tempo_medio_min)}`,
                  valor: p.total,
                }))}
              />
            </Painel>

            {ambiente !== "ti" && (
              <>
                <Painel titulo="Volume por setor solicitante">
                  <BarList
                    itens={dados.por_setor.map((s) => ({
                      rotulo: s.setor,
                      valor: s.total,
                    }))}
                  />
                </Painel>

                <Painel titulo="Volume por local (top 8)">
                  <BarList
                    itens={dados.por_local.map((l) => ({
                      rotulo: l.local,
                      valor: l.total,
                    }))}
                  />
                </Painel>
              </>
            )}
          </div>

          {ambiente === "ti" && (
            <Painel titulo="Volume pelo local digitado">
              {dados.por_sublocal == null ? (
                <p className="text-sm text-amber-800">
                  Rode o SQL em{" "}
                  <code className="text-xs">
                    supabase/migrations/20261006180000_metricas_ti_sublocal.sql
                  </code>{" "}
                  no Supabase para listar os locais como a pessoa digitou.
                </p>
              ) : (
                <>
                  <p className="mb-3 text-xs text-slate-400">
                    Agrupa o texto escrito no chamado, sem cadastro de setor ou
                    sublocal (ex.: Recepção, computador da governança).
                  </p>
                  <BarList
                    itens={volumeLocaisDigitados(dados.por_sublocal)}
                    rotuloLargo
                  />
                </>
              )}
            </Painel>
          )}

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

          {ambiente === "ti" ? (
            <>
              <Painel titulo="Horários de pico (abertura)">
                <HourChartTi itens={dados.por_hora} />
              </Painel>
              <Painel titulo="Dias de pico (abertura)">
                <BarList
                  itens={[0, 1, 2, 3, 4, 5, 6].map((d) => ({
                    rotulo: DOW[d],
                    valor:
                      dados.por_dia_semana.find((x) => x.dow === d)?.total ?? 0,
                  }))}
                />
              </Painel>
            </>
          ) : (
            <div className="grid gap-5 md:grid-cols-2">
              <Painel titulo="Horários de pico (abertura)">
                <HourChart itens={dados.por_hora} />
              </Painel>
              <Painel titulo="Dias de pico (abertura)">
                <BarList
                  itens={[0, 1, 2, 3, 4, 5, 6].map((d) => ({
                    rotulo: DOW[d],
                    valor:
                      dados.por_dia_semana.find((x) => x.dow === d)?.total ?? 0,
                  }))}
                />
              </Painel>
            </div>
          )}
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

function BarList({
  itens,
  rotuloLargo = false,
}: {
  itens: { rotulo: string; valor: number }[];
  rotuloLargo?: boolean;
}) {
  const max = Math.max(1, ...itens.map((i) => i.valor));
  if (itens.length === 0)
    return <p className="text-sm text-slate-400">Sem dados no período.</p>;
  return (
    <div className="grid gap-2">
      {itens.map((i, idx) => (
        <div key={idx} className="flex items-center gap-2">
          <span
            className={`shrink-0 truncate text-xs text-slate-600 ${
              rotuloLargo ? "w-40" : "w-28"
            }`}
            title={i.rotulo}
          >
            {i.rotulo}
          </span>
          <div className="h-4 flex-1 overflow-hidden rounded bg-slate-100">
            <div
              className="h-full rounded bg-brand-500"
              style={{ width: `${(i.valor / max) * 100}%` }}
            />
          </div>
          <span className="w-8 shrink-0 text-right text-xs font-medium text-slate-500">
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

function HourChartTi({ itens }: { itens: { hora: number; total: number }[] }) {
  const dia = horasDoDia(itens);
  const max = Math.max(1, ...dia.map((i) => i.total));
  const pico = picoHorario(dia);
  const largura = 720;
  const altura = 200;
  const topo = 22;
  const base = 28;
  const faixa = altura - topo - base;
  const barra = largura / 24;

  return (
    <div>
      {pico ? (
        <p className="mb-3 text-sm text-slate-600">
          Pico às{" "}
          <span className="font-bold text-slate-900">
            {String(pico.hora).padStart(2, "0")}h
          </span>
          {" · "}
          <span className="font-bold text-brand-700">{pico.total}</span>{" "}
          chamado{pico.total === 1 ? "" : "s"}
        </p>
      ) : (
        <p className="mb-3 text-sm text-slate-400">Sem aberturas no período.</p>
      )}
      <div className="-mx-1 overflow-x-auto">
        <svg
          viewBox={`0 0 ${largura} ${altura}`}
          className="h-auto w-full min-w-[560px]"
          role="img"
          aria-label="Chamados abertos por hora do dia"
        >
        {[0.25, 0.5, 0.75, 1].map((p) => (
          <line
            key={p}
            x1={0}
            x2={largura}
            y1={topo + faixa * (1 - p)}
            y2={topo + faixa * (1 - p)}
            className="stroke-slate-100"
            strokeWidth={1}
          />
        ))}
        {dia.map((item) => {
          const h =
            item.total > 0 ? Math.max(8, (item.total / max) * faixa) : 3;
          const x = item.hora * barra + 3;
          const y = topo + faixa - h;
          const ehPico =
            pico != null && item.hora === pico.hora && item.total > 0;
          return (
            <g key={item.hora}>
              <title>
                {item.hora}h: {item.total}
              </title>
              <rect
                x={x}
                y={y}
                width={barra - 6}
                height={h}
                rx={5}
                className={
                  ehPico
                    ? "fill-brand-700"
                    : item.total > 0
                      ? "fill-brand-500"
                      : "fill-slate-100"
                }
              />
              {item.total > 0 && (
                <text
                  x={item.hora * barra + barra / 2}
                  y={y - 5}
                  textAnchor="middle"
                  className={ehPico ? "fill-brand-800" : "fill-slate-700"}
                  fontSize={11}
                  fontWeight={700}
                >
                  {item.total}
                </text>
              )}
              {item.hora % 3 === 0 && (
                <text
                  x={item.hora * barra + barra / 2}
                  y={altura - 8}
                  textAnchor="middle"
                  className="fill-slate-500"
                  fontSize={10}
                >
                  {item.hora}h
                </text>
              )}
            </g>
          );
        })}
        </svg>
      </div>
    </div>
  );
}
