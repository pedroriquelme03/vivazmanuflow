"use client";

import type { ReactNode } from "react";

/**
 * Peças das telas de cadastro (Cadastros da Manutenção/TI e do Checklist), para
 * todas terem a mesma cara: cartão, linha com Editar, janela de edição.
 */

export function CardCadastro({ children }: { children: ReactNode }) {
  return <div className="rounded-xl border border-slate-200 bg-white p-3 sm:p-4">{children}</div>;
}

export function LinhaCadastro({
  nome,
  ativo,
  extra,
  onRenomear,
  onToggle,
  onEditar,
  acoes,
}: {
  nome: string;
  ativo: boolean;
  extra?: string;
  onRenomear?: () => void;
  onToggle?: () => void;
  onEditar?: () => void;
  acoes?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2 border-t border-slate-100 py-3 first:border-t-0 sm:flex-row sm:items-center sm:justify-between">
      <div className={`min-w-0 ${ativo ? "" : "opacity-50"}`}>
        <p className="break-words text-sm font-medium text-slate-800">{nome}</p>
        {extra && <p className="break-words text-xs text-slate-400">{extra}</p>}
      </div>
      <div className="flex shrink-0 flex-wrap gap-1">
        {onEditar && (
          <button
            type="button"
            onClick={onEditar}
            className="rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-brand-700"
          >
            Editar
          </button>
        )}
        {acoes}
        {onRenomear && (
          <button onClick={onRenomear} className="rounded-md px-2 py-1 text-xs text-slate-500 hover:bg-slate-100">
            Renomear
          </button>
        )}
        {onToggle && (
          <button
            onClick={onToggle}
            className={`rounded-md px-2 py-1 text-xs font-medium ${
              ativo ? "text-slate-500 hover:bg-slate-100" : "text-emerald-600 hover:bg-emerald-50"
            }`}
          >
            {ativo ? "Desativar" : "Reativar"}
          </button>
        )}
      </div>
    </div>
  );
}

export function CampoModal({ rotulo, children }: { rotulo: string; children: ReactNode }) {
  return (
    <label className="grid gap-1">
      <span className="text-xs font-medium text-slate-500">{rotulo}</span>
      {children}
    </label>
  );
}

/** Janela de edição: no celular sobe de baixo; no PC fica no meio. */
export function JanelaCadastro({
  titulo,
  onFechar,
  children,
}: {
  titulo: string;
  onFechar: () => void;
  children: ReactNode;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:items-center sm:p-4"
      onClick={onFechar}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={titulo}
        className="max-h-[min(88dvh,calc(100dvh-1.5rem))] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <h2 className="text-base font-bold text-slate-900">{titulo}</h2>
          <button
            type="button"
            onClick={onFechar}
            className="rounded-lg px-2 py-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            aria-label="Fechar"
          >
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function ErroMsg({ erro }: { erro: string | null }) {
  if (!erro) return null;
  return <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{erro}</p>;
}

export function OkMsg({ texto }: { texto: string | null }) {
  if (!texto) return null;
  return <p className="mt-2 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{texto}</p>;
}

export function BtnAdd({
  onClick,
  rotulo = "Adicionar",
  disabled = false,
}: {
  onClick: () => void;
  rotulo?: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="w-full rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:opacity-60"
    >
      {rotulo}
    </button>
  );
}
