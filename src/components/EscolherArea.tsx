import Link from "next/link";
import type { AmbienteEquipe } from "@/lib/ambiente-equipe";

const BOTAO: Record<AmbienteEquipe, { rotulo: string; classe: string }> = {
  ti: {
    rotulo: "Abrir chamado de TI",
    classe: "bg-[#1E293B] shadow-slate-900/20 hover:bg-[#0f172a]",
  },
  manutencao: {
    rotulo: "Abrir chamado de Manutenção",
    classe: "bg-[#0891b2] shadow-cyan-600/25 hover:bg-[#0e7490]",
  },
};

/**
 * Primeiro passo de abrir chamado: escolher a área. Nada vem marcado, para
 * ninguém mandar chamado de TI como Manutenção (e vice-versa) sem perceber.
 * Com `rota`, cada botão é um link para `rota?tipo=ti|manutencao` (telas);
 * com `onEscolher`, é um botão que avisa a escolha (janela do quadro).
 */
export function EscolherArea({
  nome,
  ambientes,
  rota,
  onEscolher,
  className = "",
}: {
  nome: string;
  ambientes: readonly AmbienteEquipe[];
  className?: string;
} & (
  | { rota: string; onEscolher?: never }
  | { onEscolher: (ambiente: AmbienteEquipe) => void; rota?: never }
)) {
  const ordem = (["ti", "manutencao"] as const).filter((a) => ambientes.includes(a));
  const texto =
    ordem.length === 2
      ? "Abra um chamado de TI ou de Manutenção."
      : `Abra um chamado de ${ordem[0] === "ti" ? "TI" : "Manutenção"}.`;
  return (
    <div className={`flex flex-col items-center justify-center text-center ${className}`}>
      <h1 className="text-xl font-bold">Olá, {nome}</h1>
      <p className="mt-0.5 text-sm text-slate-500">{texto}</p>
      <div className="mt-6 grid w-full max-w-xs gap-3">
        {ordem.map((ambiente) => {
          const { rotulo, classe } = BOTAO[ambiente];
          const estilo = `block w-full cursor-pointer rounded-2xl px-5 py-4 text-center text-base font-semibold text-white shadow-lg transition ${classe}`;
          return onEscolher ? (
            <button
              key={ambiente}
              type="button"
              onClick={() => onEscolher(ambiente)}
              className={estilo}
            >
              {rotulo}
            </button>
          ) : (
            <Link key={ambiente} href={`${rota}?tipo=${ambiente}`} className={estilo}>
              {rotulo}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
