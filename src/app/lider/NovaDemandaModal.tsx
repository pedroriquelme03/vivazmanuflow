"use client";

import { FormAbrir, type FormAbrirProps } from "@/app/abrir/FormAbrir";

export type OpcoesNovaDemanda = Omit<FormAbrirProps, "onSucesso">;

export function NovaDemandaModal({
  opcoes,
  onFechar,
  onSucesso,
}: {
  opcoes: OpcoesNovaDemanda;
  onFechar: () => void;
  onSucesso: (token: string) => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4"
      onClick={onFechar}
    >
      <div
        className="flex max-h-[92vh] w-full max-w-md flex-col overflow-hidden rounded-t-2xl bg-white shadow-xl sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
          <div>
            <h2 className="text-base font-bold text-slate-900">Nova demanda</h2>
            <p className="mt-0.5 text-xs text-slate-500">
              A demanda entra no quadro assim que for criada.
            </p>
          </div>
          <button
            type="button"
            onClick={onFechar}
            className="shrink-0 rounded-lg px-2 py-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            aria-label="Fechar"
          >
            ✕
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          <FormAbrir {...opcoes} onSucesso={onSucesso} />
        </div>
      </div>
    </div>
  );
}
