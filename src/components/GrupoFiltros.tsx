"use client";

import { useState, type ReactNode } from "react";

/** Filtros começam fechados. O clique abre o bloco. */
export function GrupoFiltros({
  ativo = false,
  children,
}: {
  ativo?: boolean;
  children: ReactNode;
}) {
  const [aberto, setAberto] = useState(false);

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50">
      <button
        type="button"
        aria-expanded={aberto}
        onClick={() => setAberto((valor) => !valor)}
        className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left text-sm font-semibold text-slate-700"
      >
        <span className="flex items-center gap-2">
          Filtros
          {ativo && (
            <span className="rounded-full bg-brand-600 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
              Ativo
            </span>
          )}
        </span>
        <span className="text-xs font-semibold text-slate-500">
          {aberto ? "Fechar" : "Abrir"}
        </span>
      </button>
      {aberto && (
        <div className="flex flex-col gap-2 border-t border-slate-200 px-3 py-3">
          {children}
        </div>
      )}
    </div>
  );
}
