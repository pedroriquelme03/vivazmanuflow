"use client";

import { useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { DemandaKanban } from "@/lib/demanda-select";
import type { TablesUpdate } from "@/lib/database.types";
import { PRIORIDADE_LABEL } from "@/lib/demanda-ui";
import { PrioridadeTag } from "@/components/PrioridadeTag";

type Colaborador = { id: string; nome: string; propriedade_id: string | null };

/** Converte um Date para o valor de um input datetime-local (hora local). */
function paraInputLocal(d: Date): string {
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

export function AtribuirModal({
  demanda,
  colaboradores,
  slaHoras,
  onFechar,
  onSalvo,
}: {
  demanda: DemandaKanban;
  colaboradores: Colaborador[];
  slaHoras: Record<string, number>;
  onFechar: () => void;
  onSalvo: () => void;
}) {
  const supabase = createClient();

  const disponiveis = useMemo(
    () =>
      colaboradores.filter(
        (c) =>
          c.propriedade_id === null ||
          c.propriedade_id === demanda.propriedade_id,
      ),
    [colaboradores, demanda.propriedade_id],
  );

  const prazoInicial = useMemo(() => {
    if (demanda.prazo_confirmado)
      return paraInputLocal(new Date(demanda.prazo_confirmado));
    const horas = slaHoras[demanda.prioridade] ?? 24;
    return paraInputLocal(new Date(Date.now() + horas * 3600_000));
  }, [demanda, slaHoras]);

  const [colaboradorId, setColaboradorId] = useState(demanda.colaborador_id ?? "");
  const [prazo, setPrazo] = useState(prazoInicial);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function salvar() {
    setErro(null);
    if (!colaboradorId) return setErro("Escolha um colaborador.");
    if (!prazo) return setErro("Defina o prazo.");

    setSalvando(true);
    const updates: TablesUpdate<"demandas"> = {
      colaborador_id: colaboradorId,
      prazo_confirmado: new Date(prazo).toISOString(),
    };
    if (demanda.status === "aberta") {
      updates.status = "atribuida";
      updates.atribuido_em = new Date().toISOString();
    }
    const { error } = await supabase
      .from("demandas")
      .update(updates)
      .eq("id", demanda.id);

    if (error) {
      setErro("Não foi possível salvar. Tente novamente.");
      setSalvando(false);
      return;
    }
    onSalvo();
  }

  async function cancelarDemanda() {
    if (!confirm("Cancelar esta demanda?")) return;
    setSalvando(true);
    const { error } = await supabase
      .from("demandas")
      .update({ status: "cancelada" })
      .eq("id", demanda.id);
    if (error) {
      setErro("Não foi possível cancelar.");
      setSalvando(false);
      return;
    }
    onSalvo();
  }

  const inputCls =
    "w-full rounded-lg border border-slate-300 px-3 py-2.5 text-base outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30";

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4"
      onClick={onFechar}
    >
      <div
        className="w-full max-w-md rounded-t-2xl bg-white p-5 shadow-xl sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-2">
          <div>
            <h2 className="text-base font-bold">Atribuir demanda</h2>
            <p className="mt-0.5 text-sm text-slate-500">{demanda.titulo}</p>
            <p className="mt-1 text-xs text-slate-400">
              {[demanda.propriedade?.nome, demanda.local?.nome]
                .filter(Boolean)
                .join(" · ")}
            </p>
          </div>
          <PrioridadeTag prioridade={demanda.prioridade} />
        </div>

        <div className="mt-4 grid gap-4">
          <div className="grid gap-1.5">
            <label className="text-sm font-medium text-slate-700">
              Colaborador responsável
            </label>
            <select
              value={colaboradorId}
              onChange={(e) => setColaboradorId(e.target.value)}
              className={inputCls}
            >
              <option value="">Selecione…</option>
              {disponiveis.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome}
                </option>
              ))}
            </select>
            {disponiveis.length === 0 && (
              <p className="text-xs text-amber-600">
                Nenhum colaborador cadastrado para esta propriedade.
              </p>
            )}
          </div>

          <div className="grid gap-1.5">
            <label className="text-sm font-medium text-slate-700">
              Prazo (o cronômetro passa a valer a partir daqui)
            </label>
            <input
              type="datetime-local"
              value={prazo}
              onChange={(e) => setPrazo(e.target.value)}
              className={inputCls}
            />
            <p className="text-xs text-slate-400">
              Sugestão baseada no SLA de prioridade{" "}
              {PRIORIDADE_LABEL[demanda.prioridade]} (
              {slaHoras[demanda.prioridade] ?? 24}h).
            </p>
          </div>

          {erro && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              {erro}
            </p>
          )}

          <div className="flex gap-2">
            <button
              onClick={onFechar}
              disabled={salvando}
              className="flex-1 rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
            >
              Voltar
            </button>
            <button
              onClick={salvar}
              disabled={salvando}
              className="flex-1 rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:opacity-60"
            >
              {salvando ? "Salvando…" : "Confirmar"}
            </button>
          </div>

          {demanda.status !== "concluida" && (
            <button
              onClick={cancelarDemanda}
              disabled={salvando}
              className="text-center text-xs font-medium text-slate-400 hover:text-red-600"
            >
              Cancelar esta demanda
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
