"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

const LARGURA_MENU = 256;

/**
 * Botão "⋯" que abre um menu pequeno com as ações menos usadas (mover, excluir),
 * para a linha não ficar cheia de botões. Fecha ao clicar fora ou com Esc.
 */
export function MenuAcoes({ rotulo, children }: { rotulo: string; children: (fechar: () => void) => ReactNode }) {
  const [aberto, setAberto] = useState(false);
  // Posição do menu em relação ao botão: alinhado à direita dele, mas sempre dentro
  // da tela (no celular o botão pode estar no meio ou à esquerda).
  const [esquerda, setEsquerda] = useState(0);
  const caixa = useRef<HTMLDivElement>(null);

  function alternar() {
    const botao = caixa.current?.getBoundingClientRect();
    if (botao) {
      const margem = 8;
      const ideal = botao.right - LARGURA_MENU;
      const dentro = Math.min(Math.max(ideal, margem), window.innerWidth - LARGURA_MENU - margem);
      setEsquerda(dentro - botao.left);
    }
    setAberto((a) => !a);
  }

  useEffect(() => {
    if (!aberto) return;
    const fora = (e: MouseEvent) => {
      if (!caixa.current?.contains(e.target as Node)) setAberto(false);
    };
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setAberto(false);
    document.addEventListener("mousedown", fora);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", fora);
      document.removeEventListener("keydown", esc);
    };
  }, [aberto]);

  return (
    <div ref={caixa} className="relative">
      <button
        type="button"
        aria-label={rotulo}
        title="Mais ações"
        aria-haspopup="menu"
        aria-expanded={aberto}
        onClick={alternar}
        className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-lg leading-none text-slate-500 hover:bg-slate-100 hover:text-slate-800"
      >
        ⋯
      </button>
      {aberto && (
        <div
          role="menu"
          style={{ width: LARGURA_MENU, left: esquerda }}
          className="absolute top-full z-20 mt-1 max-h-80 overflow-y-auto rounded-xl border border-slate-200 bg-white py-1 shadow-lg"
        >
          {children(() => setAberto(false))}
        </div>
      )}
    </div>
  );
}

export function ItemMenu({
  onClick,
  perigo = false,
  children,
}: {
  onClick: () => void;
  perigo?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className={`block w-full px-3 py-2 text-left text-sm hover:bg-slate-50 ${perigo ? "text-red-700" : "text-slate-700"}`}
    >
      {children}
    </button>
  );
}

export function TituloMenu({ children }: { children: ReactNode }) {
  return <p className="px-3 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">{children}</p>;
}
