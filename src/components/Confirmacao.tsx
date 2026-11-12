"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";

type Pedido = {
  titulo: string;
  texto?: ReactNode;
  /** Texto do botão que confirma (ex.: "Excluir"). */
  confirmar?: string;
  cancelar?: string;
  /** Ação que apaga ou desfaz algo: botão vermelho. */
  perigo?: boolean;
};

/**
 * Janela de confirmação no lugar do confirm() do navegador.
 * Uso: const [confirmar, janela] = useConfirmacao(); ... if (await confirmar({...})) ...
 * e renderizar {janela} no componente.
 */
export function useConfirmacao() {
  const [pedido, setPedido] = useState<Pedido | null>(null);
  const responder = useRef<((ok: boolean) => void) | null>(null);

  const confirmar = useCallback(
    (p: Pedido) =>
      new Promise<boolean>((resolve) => {
        responder.current = resolve;
        setPedido(p);
      }),
    [],
  );

  const fechar = useCallback((ok: boolean) => {
    responder.current?.(ok);
    responder.current = null;
    setPedido(null);
  }, []);

  return [confirmar, pedido ? <JanelaConfirmacao {...pedido} onFechar={fechar} /> : null] as const;
}

function JanelaConfirmacao({
  titulo,
  texto,
  confirmar = "Confirmar",
  cancelar = "Voltar",
  perigo = false,
  onFechar,
}: Pedido & { onFechar: (ok: boolean) => void }) {
  const botaoConfirmar = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    botaoConfirmar.current?.focus();
    const tecla = (e: KeyboardEvent) => e.key === "Escape" && onFechar(false);
    window.addEventListener("keydown", tecla);
    return () => window.removeEventListener("keydown", tecla);
  }, [onFechar]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 p-4 sm:items-center"
      onMouseDown={(e) => e.target === e.currentTarget && onFechar(false)}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirmacao-titulo"
        className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl"
      >
        <div className="flex items-start gap-3">
          <span
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-lg ${
              perigo ? "bg-red-100 text-red-600" : "bg-amber-100 text-amber-600"
            }`}
            aria-hidden
          >
            !
          </span>
          <div className="min-w-0">
            <h2 id="confirmacao-titulo" className="text-base font-semibold text-slate-800">
              {titulo}
            </h2>
            {texto && <div className="mt-1 text-sm text-slate-600">{texto}</div>}
          </div>
        </div>
        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={() => onFechar(false)}
            className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            {cancelar}
          </button>
          <button
            ref={botaoConfirmar}
            type="button"
            onClick={() => onFechar(true)}
            className={`rounded-xl px-4 py-2.5 text-sm font-semibold text-white ${
              perigo ? "bg-red-600 hover:bg-red-700" : "bg-brand-600 hover:bg-brand-700"
            }`}
          >
            {confirmar}
          </button>
        </div>
      </div>
    </div>
  );
}
