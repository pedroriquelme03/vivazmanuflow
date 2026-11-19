"use client";

import { useState, useTransition } from "react";
import { btnSecundario } from "../ui";
import { buscarOcupacaoAgora } from "./actions";

export function BuscarOcupacao() {
  const [pendente, iniciar] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; texto: string } | null>(null);
  return (
    <div className="flex flex-col items-start gap-1">
      <button
        type="button"
        className={btnSecundario}
        disabled={pendente}
        onClick={() =>
          iniciar(async () => {
            const r = await buscarOcupacaoAgora();
            setMsg({ ok: r.ok, texto: r.mensagem });
          })
        }
      >
        {pendente ? "Buscando…" : "Buscar ocupação agora"}
      </button>
      {msg && (
        <span role="status" className={`text-xs ${msg.ok ? "text-emerald-700" : "text-red-700"}`}>
          {msg.texto}
        </span>
      )}
    </div>
  );
}

export function Imprimir() {
  return (
    <button type="button" className={`${btnSecundario} print:hidden`} onClick={() => window.print()}>
      Imprimir / salvar PDF
    </button>
  );
}
