"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  COOKIE_AMBIENTE,
  ROTULO_PAINEL,
  type PainelEquipe,
} from "@/lib/ambiente-equipe";
import { ROTA_CHECKLIST } from "@/lib/rotas";

const ATIVO: Record<PainelEquipe, string> = {
  ti: "bg-white text-[#1E293B]",
  manutencao: "bg-[#0891b2] text-white",
  checklist: "bg-[#059669] text-white",
};

function gravarPainel(painel: PainelEquipe) {
  document.cookie = `${COOKIE_AMBIENTE}=${painel}; Path=/; Max-Age=31536000; SameSite=Lax`;
}

export function TrocaAmbiente({
  valor,
  opcoes,
  role,
}: {
  valor: PainelEquipe;
  opcoes: readonly PainelEquipe[];
  role: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [escolhido, setEscolhido] = useState<PainelEquipe | null>(null);
  const atual = escolhido ?? valor;

  function escolher(proximo: PainelEquipe) {
    if (proximo === atual) return;
    setEscolhido(proximo);
    gravarPainel(proximo);
    if (proximo === "checklist") return router.push(ROTA_CHECKLIST);
    if (pathname.startsWith(ROTA_CHECKLIST)) {
      return router.push(role === "colaborador" ? "/colaborador" : "/lider");
    }
    router.refresh();
  }

  return (
    <div
      className="grid h-9 w-full gap-1 rounded-full bg-white/15 p-1 text-xs font-bold"
      style={{ gridTemplateColumns: `repeat(${opcoes.length}, minmax(0, 1fr))` }}
      role="group"
      aria-label="Ambiente"
    >
      {opcoes.map((opcao) => {
        const ativo = opcao === atual;
        return (
          <button
            key={opcao}
            type="button"
            onClick={() => escolher(opcao)}
            className={`truncate rounded-full px-1 shadow-none transition ${
              ativo ? `${ATIVO[opcao]} shadow` : "text-white/70 hover:text-white"
            }`}
            aria-pressed={ativo}
          >
            {ROTULO_PAINEL[opcao]}
          </button>
        );
      })}
    </div>
  );
}
