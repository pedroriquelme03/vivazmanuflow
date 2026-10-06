"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  COOKIE_AMBIENTE,
  type AmbienteEquipe,
} from "@/lib/ambiente-equipe";

export function TrocaAmbiente({ valor }: { valor: AmbienteEquipe }) {
  const router = useRouter();
  const [atual, setAtual] = useState(valor);
  const tiAtivo = atual === "ti";

  useEffect(() => {
    setAtual(valor);
  }, [valor]);

  function escolher(proximo: AmbienteEquipe) {
    if (proximo === atual) return;
    setAtual(proximo);
    document.cookie = `${COOKIE_AMBIENTE}=${proximo}; Path=/; Max-Age=31536000; SameSite=Lax`;
    router.refresh();
  }

  return (
    <div
      className="relative grid h-9 w-full grid-cols-2 rounded-full bg-white/15 p-1 text-xs font-bold"
      role="group"
      aria-label="Ambiente"
    >
      <span
        className={`absolute top-1 bottom-1 left-1 w-[calc(50%-0.25rem)] rounded-full shadow transition-transform ${
          tiAtivo
            ? "translate-x-0 bg-white"
            : "translate-x-full bg-[#0891b2]"
        }`}
      />
      <button
        type="button"
        onClick={() => escolher("ti")}
        className={`relative z-10 rounded-full ${tiAtivo ? "text-[#1E293B]" : "text-white/70"}`}
        aria-pressed={tiAtivo}
      >
        TI
      </button>
      <button
        type="button"
        onClick={() => escolher("manutencao")}
        className={`relative z-10 rounded-full ${tiAtivo ? "text-white/70" : "text-white"}`}
        aria-pressed={!tiAtivo}
      >
        Manutenção
      </button>
    </div>
  );
}
