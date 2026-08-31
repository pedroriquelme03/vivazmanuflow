"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { DEMANDA_SELECT, type DemandaKanban, ordenarFilaPorPeso } from "@/lib/demanda-select";
import {
  PRAZO_COR,
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

const COLUNAS: { status: Status; titulo: string }[] = [
  { status: "aberta", titulo: "Abertas" },
  { status: "atribuida", titulo: "Atribuídas" },
  { status: "em_andamento", titulo: "Em andamento" },
  { status: "aguardando_validacao", titulo: "Validação" },
  { status: "concluida", titulo: "Concluídas" },
];

export function KanbanLider({
  demandasIniciais,
  colaboradores,
  slaHoras,
  opcoesNovaDemanda,
}: {
  demandasIniciais: DemandaKanban[];
  colaboradores: Colaborador[];
  slaHoras: Record<string, number>;
  opcoesNovaDemanda: OpcoesNovaDemanda;
}) {
  const supabase = useMemo(() => createClient(), []);
  const [demandas, setDemandas] = useState<DemandaKanban[]>(demandasIniciais);
  const [agora, setAgora] = useState(() => Date.now());
  const [editando, setEditando] = useState<DemandaKanban | null>(null);
  const [detalhe, setDetalhe] = useState<DemandaKanban | null>(null);
  const [criando, setCriando] = useState(false);
  const [sucesso, setSucesso] = useState<string | null>(null);

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

  // Atualiza o cronômetro a cada 60s.
  useEffect(() => {
    const t = setInterval(() => setAgora(Date.now()), 60000);
    return () => clearInterval(t);
  }, []);

  const porStatus = (s: Status) =>
    ordenarFilaPorPeso(
      demandas.filter((d) => d.status === s && !d.arquivado),
    );
  const arquivadas = ordenarFilaPorPeso(
    demandas.filter((d) => Boolean(d.arquivado)),
  );
  const canceladas = demandas.filter(
    (d) => d.status === "cancelada" && !d.arquivado,
  ).length;

  return (
    <main className="flex-1 overflow-x-auto p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <h1 className="text-lg font-bold">Demandas</h1>
          {canceladas > 0 && (
            <span className="text-xs text-slate-400">
              {canceladas} cancelada(s)
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={() => setCriando(true)}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-brand-600 px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-brand-700"
        >
          <span className="text-base leading-none">＋</span>
          Nova demanda
        </button>
      </div>

      {sucesso && (
        <div className="mb-3 flex items-center justify-between gap-3 rounded-lg bg-emerald-50 px-4 py-2.5 text-sm font-medium text-emerald-800 ring-1 ring-emerald-200">
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

      <div className="flex gap-4 pb-4" style={{ minWidth: "min-content" }}>
        {COLUNAS.map((col) => {
          const itens = porStatus(col.status);
          return (
            <section
              key={col.status}
              className="flex w-72 shrink-0 flex-col rounded-xl bg-slate-100/70 p-2"
            >
              <header className="flex items-center justify-between px-2 py-1.5">
                <h2 className="text-sm font-semibold text-slate-700">
                  {col.titulo}
                </h2>
                <span className="rounded-full bg-white px-2 py-0.5 text-xs font-medium text-slate-500">
                  {itens.length}
                </span>
              </header>

              <div className="flex flex-col gap-2">
                {itens.map((d) => (
                  <Card
                    key={d.id}
                    demanda={d}
                    agora={agora}
                    onAbrir={() => setDetalhe(d)}
                    onEditar={() => setEditando(d)}
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
        })}

        <section className="flex w-72 shrink-0 flex-col rounded-xl bg-slate-200/70 p-2">
          <header className="flex items-center justify-between px-2 py-1.5">
            <h2 className="text-sm font-semibold text-slate-700">Arquivado</h2>
            <span className="rounded-full bg-white px-2 py-0.5 text-xs font-medium text-slate-500">
              {arquivadas.length}
            </span>
          </header>
          <div className="flex flex-col gap-2">
            {arquivadas.map((d) => (
              <Card
                key={d.id}
                demanda={d}
                agora={agora}
                onAbrir={() => setDetalhe(d)}
                onEditar={() => setEditando(d)}
              />
            ))}
            {arquivadas.length === 0 && (
              <p className="px-2 py-6 text-center text-xs text-slate-400">
                Nada aqui.
              </p>
            )}
          </div>
        </section>
      </div>

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
      className={`cursor-pointer rounded-lg border bg-white p-3 shadow-sm transition hover:border-brand-400 hover:shadow-md ${
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
