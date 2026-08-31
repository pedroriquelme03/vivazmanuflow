"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { DEMANDA_SELECT, type DemandaKanban, ordenarFilaPorPeso } from "@/lib/demanda-select";
import {
  PRAZO_COR,
  PRIORIDADE_LABEL,
  calcularUrgencia,
  formatarData,
  nomeSublocal,
  urlFotoNaoPerturbe,
  urlFotoColaboradorMaisRecente,
} from "@/lib/demanda-ui";
import type { Enums } from "@/lib/database.types";
import { PrioridadeTag } from "@/components/PrioridadeTag";
import { AtribuirModal } from "./AtribuirModal";
import { DetalheDemandaModal } from "./DetalheDemandaModal";
import { NovaDemandaModal, type OpcoesNovaDemanda } from "./NovaDemandaModal";

type Colaborador = { id: string; nome: string; propriedade_id: string | null };
type Status = Enums<"demanda_status">;
type Prioridade = Enums<"demanda_prioridade">;

const SETE_DIAS_MS = 7 * 24 * 60 * 60 * 1000;

function normalizar(texto: string) {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function textoDemanda(d: DemandaKanban) {
  return normalizar(
    [
      d.titulo,
      d.descricao,
      d.solicitante?.nome,
      d.colaborador?.nome,
      d.sublocal,
      d.local?.nome,
    ]
      .filter(Boolean)
      .join(" "),
  );
}

function concluidaNosUltimos7Dias(d: DemandaKanban, agora: number) {
  if (!d.concluido_em) return false;
  return agora - new Date(d.concluido_em).getTime() <= SETE_DIAS_MS;
}

const COLUNAS: { status: Status; titulo: string }[] = [
  { status: "aberta", titulo: "Abertas" },
  { status: "atribuida", titulo: "Atribuídas" },
  { status: "em_andamento", titulo: "Em andamento" },
  { status: "aguardando_validacao", titulo: "Validação" },
  { status: "concluida", titulo: "Concluídas" },
];

function ColunaQuadro({
  titulo,
  subtitulo,
  itens,
  agora,
  className = "bg-slate-100/70",
  onAbrir,
  onEditar,
}: {
  titulo: string;
  subtitulo?: string;
  itens: DemandaKanban[];
  agora: number;
  className?: string;
  onAbrir: (d: DemandaKanban) => void;
  onEditar: (d: DemandaKanban) => void;
}) {
  return (
    <section
      className={`flex h-full min-w-[17.5rem] flex-1 flex-col overflow-hidden rounded-xl p-2 ${className}`}
    >
      <header className="shrink-0 px-2 py-1.5">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-slate-700">{titulo}</h2>
          <span className="rounded-full bg-white px-2 py-0.5 text-xs font-medium text-slate-500">
            {itens.length}
          </span>
        </div>
        {subtitulo && (
          <p className="mt-0.5 text-[11px] text-slate-400">{subtitulo}</p>
        )}
      </header>
      <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto overscroll-contain">
        {itens.map((d) => (
          <Card
            key={d.id}
            demanda={d}
            agora={agora}
            onAbrir={() => onAbrir(d)}
            onEditar={() => onEditar(d)}
          />
        ))}
        {itens.length === 0 && (
          <p className="px-2 py-6 text-center text-xs text-slate-400">
            Nada aqui.
          </p>
        )}
      </div>
    </section>
  );
}

export function KanbanLider({
  demandasIniciais,
  colaboradores,
  slaHoras,
  agoraInicial,
  opcoesNovaDemanda,
}: {
  demandasIniciais: DemandaKanban[];
  colaboradores: Colaborador[];
  slaHoras: Record<string, number>;
  agoraInicial: number;
  opcoesNovaDemanda: OpcoesNovaDemanda;
}) {
  const supabase = useMemo(() => createClient(), []);
  const [demandas, setDemandas] = useState<DemandaKanban[]>(demandasIniciais);
  const [agora, setAgora] = useState(agoraInicial);
  const [editando, setEditando] = useState<DemandaKanban | null>(null);
  const [detalhe, setDetalhe] = useState<DemandaKanban | null>(null);
  const [criando, setCriando] = useState(false);
  const [sucesso, setSucesso] = useState<string | null>(null);
  const [busca, setBusca] = useState("");
  const [colaboradorFiltro, setColaboradorFiltro] = useState("");
  const [prioridadeFiltro, setPrioridadeFiltro] = useState<"" | Prioridade>("");
  const [verArquivado, setVerArquivado] = useState(false);

  const recarregar = useCallback(async () => {
    const { data } = await supabase
      .from("demandas")
      .select(DEMANDA_SELECT)
      .order("peso", { ascending: false })
      .order("criado_em", { ascending: true });
    if (data) setDemandas(data as unknown as DemandaKanban[]);
  }, [supabase]);

  // Realtime: qualquer mudança em demandas recarrega o quadro.
  useEffect(() => {
    const canal = supabase
      .channel("kanban-lider")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "demandas" },
        () => recarregar(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(canal);
    };
  }, [supabase, recarregar]);

  // Relógio só no cliente, depois da hidratação (evita 1h 31m vs 1h 32m).
  useEffect(() => {
    setAgora(Date.now());
    const t = setInterval(() => setAgora(Date.now()), 60000);
    return () => clearInterval(t);
  }, []);

  const buscaNorm = normalizar(busca.trim());
  const temBusca = buscaNorm.length > 0;
  const temFiltro = temBusca || Boolean(colaboradorFiltro) || Boolean(prioridadeFiltro);

  const demandasFiltradas = useMemo(() => {
    return demandas.filter((d) => {
      if (colaboradorFiltro && d.colaborador_id !== colaboradorFiltro) return false;
      if (prioridadeFiltro && d.prioridade !== prioridadeFiltro) return false;
      if (temBusca && !textoDemanda(d).includes(buscaNorm)) return false;
      return true;
    });
  }, [demandas, buscaNorm, temBusca, colaboradorFiltro, prioridadeFiltro]);

  const porStatus = (s: Status) => {
    let itens = demandasFiltradas.filter((d) => d.status === s && !d.arquivado);
    if (s === "concluida" && !temBusca) {
      itens = itens.filter((d) => concluidaNosUltimos7Dias(d, agora));
    }
    return ordenarFilaPorPeso(itens);
  };
  const arquivadas = ordenarFilaPorPeso(
    demandasFiltradas.filter((d) => Boolean(d.arquivado)),
  );
  const canceladas = demandasFiltradas.filter(
    (d) => d.status === "cancelada" && !d.arquivado,
  ).length;

  const filtroCls =
    "rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30";

  return (
    <main className="flex h-[calc(100dvh-8.75rem)] flex-col overflow-hidden p-3 md:h-[calc(100dvh-1rem)] md:p-4">
      <div className="mb-3 flex shrink-0 flex-col gap-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <h1 className="text-lg font-bold">Demandas</h1>
            {canceladas > 0 && (
              <span className="text-xs text-slate-400">
                {canceladas} cancelada(s)
              </span>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={() => setVerArquivado(true)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-sm font-semibold text-slate-600 transition hover:border-slate-400 hover:bg-slate-50 sm:px-3"
            >
              Arquivado
              {arquivadas.length > 0 && (
                <span className="rounded-full bg-slate-200 px-1.5 py-0.5 text-[11px] font-bold text-slate-600">
                  {arquivadas.length}
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={() => setCriando(true)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-brand-700 sm:px-3.5"
            >
              <span className="text-base leading-none">＋</span>
              <span className="sm:hidden">Nova</span>
              <span className="hidden sm:inline">Nova demanda</span>
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
          <input
            type="search"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar título, solicitante, sublocal…"
            className={`w-full min-w-0 sm:min-w-[12rem] sm:flex-1 ${filtroCls}`}
          />
          <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-1 sm:flex-wrap sm:items-center">
            <select
              value={colaboradorFiltro}
              onChange={(e) => setColaboradorFiltro(e.target.value)}
              className={`min-w-0 w-full sm:w-auto sm:max-w-[14rem] ${filtroCls}`}
            >
              <option value="">Colaborador</option>
              {colaboradores.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome}
                </option>
              ))}
            </select>
            <select
              value={prioridadeFiltro}
              onChange={(e) =>
                setPrioridadeFiltro(e.target.value as "" | Prioridade)
              }
              className={`min-w-0 w-full sm:w-auto ${filtroCls}`}
            >
              <option value="">Prioridade</option>
              {(["alta", "media", "baixa"] as const).map((p) => (
                <option key={p} value={p}>
                  {PRIORIDADE_LABEL[p]}
                </option>
              ))}
            </select>
            {temFiltro && (
              <button
                type="button"
                onClick={() => {
                  setBusca("");
                  setColaboradorFiltro("");
                  setPrioridadeFiltro("");
                }}
                className="col-span-2 py-1 text-center text-xs font-semibold text-slate-500 hover:text-slate-800 sm:col-span-1 sm:text-left"
              >
                Limpar
              </button>
            )}
          </div>
        </div>
      </div>

      {sucesso && (
        <div className="mb-3 flex shrink-0 items-center justify-between gap-3 rounded-lg bg-emerald-50 px-4 py-2.5 text-sm font-medium text-emerald-800 ring-1 ring-emerald-200">
          <span>✅ {sucesso}</span>
          <button
            type="button"
            onClick={() => setSucesso(null)}
            className="shrink-0 text-emerald-600 hover:text-emerald-800"
            aria-label="Fechar aviso"
          >
            ✕
          </button>
        </div>
      )}

      <div className="flex min-h-0 min-w-0 flex-1 flex-nowrap gap-3 overflow-x-auto overflow-y-hidden">
        {COLUNAS.map((col) => {
          const itens = porStatus(col.status);
          return (
            <ColunaQuadro
              key={col.status}
              titulo={col.titulo}
              subtitulo={
                col.status === "concluida"
                  ? temBusca
                    ? "incluindo antigas na busca"
                    : "últimos 7 dias"
                  : undefined
              }
              itens={itens}
              agora={agora}
              onAbrir={setDetalhe}
              onEditar={setEditando}
            />
          );
        })}
      </div>

      {verArquivado && (
        <div className="fixed inset-0 z-40 flex justify-end">
          <button
            type="button"
            className="absolute inset-0 bg-slate-900/40"
            aria-label="Fechar arquivado"
            onClick={() => setVerArquivado(false)}
          />
          <aside className="relative z-10 flex h-full w-full max-w-sm flex-col bg-white shadow-xl">
            <header className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
              <div>
                <h2 className="text-sm font-bold text-slate-800">Arquivado</h2>
                <p className="text-xs text-slate-400">
                  {arquivadas.length} demanda(s)
                </p>
              </div>
              <button
                type="button"
                onClick={() => setVerArquivado(false)}
                className="rounded-lg px-2 py-1 text-slate-500 hover:bg-slate-100"
                aria-label="Fechar"
              >
                ✕
              </button>
            </header>
            <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto p-3">
              {arquivadas.map((d) => (
                <Card
                  key={d.id}
                  demanda={d}
                  agora={agora}
                  onAbrir={() => {
                    setVerArquivado(false);
                    setDetalhe(d);
                  }}
                  onEditar={() => {
                    setVerArquivado(false);
                    setEditando(d);
                  }}
                />
              ))}
              {arquivadas.length === 0 && (
                <p className="px-2 py-8 text-center text-sm text-slate-400">
                  Nada arquivado.
                </p>
              )}
            </div>
          </aside>
        </div>
      )}

      {detalhe && !editando && (
        <DetalheDemandaModal
          demanda={detalhe}
          agora={agora}
          onFechar={() => setDetalhe(null)}
          onAtribuir={() => {
            setEditando(detalhe);
          }}
          onAtualizou={() => {
            setDetalhe(null);
            recarregar();
          }}
        />
      )}

      {editando && (
        <AtribuirModal
          demanda={editando}
          colaboradores={colaboradores}
          slaHoras={slaHoras}
          onFechar={() => setEditando(null)}
          onSalvo={() => {
            setEditando(null);
            setDetalhe(null);
            recarregar();
          }}
        />
      )}

      {criando && (
        <NovaDemandaModal
          opcoes={opcoesNovaDemanda}
          onFechar={() => setCriando(false)}
          onSucesso={() => {
            setCriando(false);
            setSucesso("Demanda criada com sucesso!");
            recarregar();
            window.setTimeout(() => setSucesso(null), 5000);
          }}
        />
      )}
    </main>
  );
}

function Card({
  demanda,
  agora,
  onAbrir,
  onEditar,
}: {
  demanda: DemandaKanban;
  agora: number;
  onAbrir: () => void;
  onEditar: () => void;
}) {
  const podeAtribuir =
    !demanda.arquivado &&
    (demanda.status === "aberta" ||
      demanda.status === "atribuida" ||
      demanda.status === "em_andamento");
  const urgencia =
    demanda.status === "concluida" || demanda.status === "cancelada"
      ? null
      : calcularUrgencia(demanda.prazo_confirmado, demanda.atribuido_em, agora);

  const pesoMax =
    demanda.afeta_experiencia || (demanda.peso ?? 0) >= 10;
  const fotoNaoPerturbe = urlFotoNaoPerturbe(
    demanda.motivo_nao_conclusao,
    demanda.anexos,
  );
  const fotoConclusao =
    demanda.status === "aguardando_validacao"
      ? urlFotoColaboradorMaisRecente(demanda.anexos)
      : null;

  return (
    <article
      role="button"
      tabIndex={0}
      onClick={onAbrir}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onAbrir();
        }
      }}
      className={`cursor-pointer rounded-lg border bg-white p-3 shadow-sm transition hover:border-brand-400 hover:shadow-md min-w-0 ${
        pesoMax ? "card-peso-max" : "border-slate-200"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-semibold leading-tight text-slate-800">
          {demanda.titulo}
        </p>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <PrioridadeTag prioridade={demanda.prioridade} />
          <span
            className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
              pesoMax
                ? "bg-red-100 text-red-700"
                : "bg-slate-100 text-slate-600"
            }`}
          >
            Peso {demanda.peso ?? "—"}
          </span>
        </div>
      </div>

      {pesoMax && (
        <p className="mt-1 text-[11px] font-semibold text-red-600">
          Afeta experiência do hóspede
        </p>
      )}

      {demanda.evento?.nome && (
        <p className="mt-1 text-[11px] font-semibold text-violet-700">
          🎉 Evento: {demanda.evento.nome}
        </p>
      )}

      <p className="mt-1 text-xs text-slate-500">
        {demanda.propriedade?.nome ? `${demanda.propriedade.nome}` : ""}
        {nomeSublocal(demanda.sublocal, demanda.local?.nome)
          ? ` · ${nomeSublocal(demanda.sublocal, demanda.local?.nome)}`
          : ""}
        {demanda.solicitante?.nome
          ? `${demanda.propriedade?.nome || nomeSublocal(demanda.sublocal, demanda.local?.nome) ? " · " : ""}${demanda.solicitante.nome}`
          : ""}
      </p>

      {demanda.colaborador?.nome ? (
        <p className="mt-1.5 text-xs font-medium text-slate-600">
          👤 {demanda.colaborador.nome}
        </p>
      ) : (
        <p className="mt-1.5 text-xs font-medium text-amber-600">
          👤 Sem responsável
        </p>
      )}

      {urgencia && (
        <span
          suppressHydrationWarning
          className={`mt-2 inline-block rounded-full px-2 py-0.5 text-xs font-medium ${PRAZO_COR[urgencia.nivel]}`}
        >
          {urgencia.label}
        </span>
      )}

      {demanda.motivo_nao_conclusao && (
        <div className="mt-2 rounded-md bg-amber-50 px-2 py-1.5">
          <p className="text-xs font-semibold text-amber-900">
            Motivo: {demanda.motivo_nao_conclusao}
          </p>
          {fotoNaoPerturbe && (
              <a
                href={fotoNaoPerturbe}
                target="_blank"
                rel="noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="mt-1.5 block"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={fotoNaoPerturbe}
                  alt="Foto do não perturbe"
                  className="h-24 w-full rounded object-cover"
                />
              </a>
            )}
        </div>
      )}

      {demanda.status === "aguardando_validacao" && (
        <div className="mt-2 rounded-md bg-sky-50 px-2 py-1.5">
          <p className="text-xs font-semibold text-sky-800">
            Aguardando conferência
          </p>
          {fotoConclusao && (
            <span className="mt-1.5 block">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={fotoConclusao}
                alt="Foto da conclusão"
                className="h-24 w-full rounded object-cover"
              />
            </span>
          )}
        </div>
      )}

      {demanda.status === "concluida" && (
        <p className="mt-2 text-xs text-emerald-600">
          Concluída {formatarData(demanda.concluido_em)}
        </p>
      )}

      {podeAtribuir && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onEditar();
          }}
          className="mt-2.5 w-full rounded-md bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-brand-700"
        >
          {demanda.status === "aberta"
            ? "Atribuir e definir prazo"
            : "Reatribuir / editar prazo"}
        </button>
      )}
    </article>
  );
}
