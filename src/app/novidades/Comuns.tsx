"use client";

import { useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { STATUS_LABEL } from "@/lib/demanda-ui";
import { numeroOs } from "@/lib/novidades/formato";
import type { Enums } from "@/lib/database.types";
import { inputCls } from "../governanca/ui";

export function BotaoImprimir({ rotulo = "Imprimir / salvar PDF" }: { rotulo?: string }) {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 print:hidden"
    >
      {rotulo}
    </button>
  );
}

export type ChamadoResumo = {
  id: string;
  titulo: string;
  status: Enums<"demanda_status">;
  criado_em: string;
  local: string | null;
};

export function SeletorChamado({
  chamados,
  atual,
}: {
  chamados: ChamadoResumo[];
  atual: string | null;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [busca, setBusca] = useState("");
  const lista = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return chamados
      .filter(
        (c) =>
          !q ||
          c.titulo.toLowerCase().includes(q) ||
          (c.local ?? "").toLowerCase().includes(q) ||
          c.id.startsWith(q),
      )
      .slice(0, 80);
  }, [busca, chamados]);

  return (
    <div className="space-y-2 print:hidden">
      <input
        className={inputCls}
        placeholder="Buscar chamado por título, local ou número..."
        value={busca}
        onChange={(e) => setBusca(e.target.value)}
      />
      <div className="max-h-64 overflow-y-auto rounded-xl border border-slate-200 bg-white">
        <button
          type="button"
          onClick={() => router.push(`${pathname}?id=branco`)}
          className={`block w-full border-b border-slate-100 px-3 py-2 text-left text-sm font-semibold text-brand-700 hover:bg-slate-50 ${atual === "branco" ? "bg-brand-50" : ""}`}
        >
          + OS em branco (para preencher à mão)
        </button>
        {lista.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => router.push(`${pathname}?id=${c.id}`)}
            className={`flex w-full items-center gap-2 border-b border-slate-100 px-3 py-2 text-left text-sm hover:bg-slate-50 ${atual === c.id ? "bg-brand-50" : ""}`}
          >
            <span className="font-mono text-xs text-slate-400">{numeroOs(c.id)}</span>
            <span className="min-w-0 flex-1 truncate text-slate-700">{c.titulo}</span>
            <span className="hidden text-xs text-slate-500 sm:inline">{c.local}</span>
            <span className="shrink-0 text-xs text-slate-500">{STATUS_LABEL[c.status]}</span>
          </button>
        ))}
        {lista.length === 0 && <p className="px-3 py-2 text-sm text-slate-500">Nada encontrado.</p>}
      </div>
    </div>
  );
}
