"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { DEMANDA_SELECT, type DemandaKanban, ordenarFilaPorPeso } from "@/lib/demanda-select";
import {
  PRAZO_COR,
  calcularUrgencia,
  formatarData,
} from "@/lib/demanda-ui";
import type { Enums } from "@/lib/database.types";
import { PrioridadeTag } from "@/components/PrioridadeTag";
import { AtribuirModal } from "./AtribuirModal";

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
}: {
  demandasIniciais: DemandaKanban[];
  colaboradores: Colaborador[];
  slaHoras: Record<string, number>;
}) {
  const supabase = useMemo(() => createClient(), []);
  const [demandas, setDemandas] = useState<DemandaKanban[]>(demandasIniciais);
  const [agora, setAgora] = useState(() => Date.now());
  const [editando, setEditando] = useState<DemandaKanban | null>(null);

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
    ordenarFilaPorPeso(demandas.filter((d) => d.status === s));
  const canceladas = demandas.filter((d) => d.status === "cancelada").length;

  return (
    <main className="flex-1 overflow-x-auto p-4">
      <div className="mb-3 flex items-center justify-between">
        <h1 className="text-lg font-bold">Demandas</h1>
        {canceladas > 0 && (
          <span className="text-xs text-slate-400">
            {canceladas} cancelada(s)
          </span>
        )}
      </div>

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
      </div>

      {editando && (
        <AtribuirModal
          demanda={editando}
          colaboradores={colaboradores}
          slaHoras={slaHoras}
          onFechar={() => setEditando(null)}
          onSalvo={() => {
            setEditando(null);
            recarregar();
          }}
        />
      )}
    </main>
  );
}

function Card({
  demanda,
  agora,
  onEditar,
}: {
  demanda: DemandaKanban;
  agora: number;
  onEditar: () => void;
}) {
  const podeAtribuir =
    demanda.status === "aberta" ||
    demanda.status === "atribuida" ||
    demanda.status === "em_andamento";
  const urgencia =
    demanda.status === "concluida" || demanda.status === "cancelada"
      ? null
      : calcularUrgencia(demanda.prazo_confirmado, demanda.atribuido_em, agora);

  const pesoMax =
    demanda.afeta_experiencia || (demanda.peso ?? 0) >= 10;

  return (
    <article
      className={`rounded-lg border bg-white p-3 shadow-sm ${
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
        {demanda.local?.nome ? ` · ${demanda.local.nome}` : ""}
        {demanda.solicitante?.nome
          ? `${demanda.propriedade?.nome || demanda.local?.nome ? " · " : ""}${demanda.solicitante.nome}`
          : ""}
      </p>

      {demanda.colaborador?.nome && (
        <p className="mt-1.5 text-xs font-medium text-slate-600">
          👤 {demanda.colaborador.nome}
        </p>
      )}

      {urgencia && (
        <span
          className={`mt-2 inline-block rounded-full px-2 py-0.5 text-xs font-medium ${PRAZO_COR[urgencia.nivel]}`}
        >
          {urgencia.label}
        </span>
      )}

      {demanda.status === "concluida" && (
        <p className="mt-2 text-xs text-emerald-600">
          Concluída {formatarData(demanda.concluido_em)}
        </p>
      )}

      {podeAtribuir && (
        <button
          onClick={onEditar}
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
