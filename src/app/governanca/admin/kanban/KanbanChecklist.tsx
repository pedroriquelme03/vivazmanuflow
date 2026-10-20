"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  COLUNAS_KANBAN,
  formatDataHora,
  normalizarBusca,
  tempoDesde,
  type ColunaKanban,
} from "@/lib/governanca";
import { inputCls } from "../../ui";

export type CartaoKanban = {
  id: string;
  coluna: ColunaKanban;
  checklist: string;
  categoria: string | null;
  uh: string | null;
  camareira: string | null;
  aplicador: string | null;
  inicio: string;
  fim: string | null;
  respondidos: number;
  planosAbertos: number;
  planosTotal: number;
};

const COR_COLUNA: Record<ColunaKanban, string> = {
  andamento: "border-t-amber-400",
  ok: "border-t-emerald-500",
  pendencia: "border-t-red-500",
  resolvida: "border-t-sky-500",
};

export function KanbanChecklist({ cartoes }: { cartoes: CartaoKanban[] }) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [busca, setBusca] = useState("");
  const [agora, setAgora] = useState<number | null>(null);
  const espera = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Realtime: inspeção nova, resposta salva ou plano resolvido atualizam o quadro.
  useEffect(() => {
    const recarregar = () => {
      if (espera.current) clearTimeout(espera.current);
      espera.current = setTimeout(() => router.refresh(), 800);
    };
    const canal = supabase
      .channel("kanban-checklist")
      .on("postgres_changes", { event: "*", schema: "public", table: "gov_inspecoes" }, recarregar)
      .on("postgres_changes", { event: "*", schema: "public", table: "gov_respostas" }, recarregar)
      .on("postgres_changes", { event: "*", schema: "public", table: "gov_planos_acao" }, recarregar)
      .subscribe();
    return () => {
      if (espera.current) clearTimeout(espera.current);
      supabase.removeChannel(canal);
    };
  }, [supabase, router]);

  // Relógio só no cliente, depois da hidratação.
  useEffect(() => {
    const primeiro = setTimeout(() => setAgora(Date.now()), 0);
    const t = setInterval(() => setAgora(Date.now()), 60000);
    return () => {
      clearTimeout(primeiro);
      clearInterval(t);
    };
  }, []);

  const filtrados = useMemo(() => {
    const q = normalizarBusca(busca);
    if (!q) return cartoes;
    return cartoes.filter((c) =>
      normalizarBusca(
        [c.checklist, c.categoria, c.uh, c.camareira, c.aplicador].filter(Boolean).join(" "),
      ).includes(q),
    );
  }, [cartoes, busca]);

  return (
    <>
      <input
        className={`${inputCls} mb-4 max-w-sm`}
        type="search"
        value={busca}
        onChange={(e) => setBusca(e.target.value)}
        placeholder="Buscar por checklist, UH, camareira ou aplicador…"
      />
      <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-4">
        {COLUNAS_KANBAN.map((col) => {
          const itens = filtrados.filter((c) => c.coluna === col.id);
          return (
            <section
              key={col.id}
              className={`flex w-72 shrink-0 flex-col rounded-2xl border border-t-4 border-slate-200 bg-slate-50 ${COR_COLUNA[col.id]}`}
            >
              <header className="px-3 pb-2 pt-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-bold text-slate-800">{col.titulo}</h2>
                  <span className="rounded-full bg-white px-2 py-0.5 text-xs font-semibold text-slate-600 ring-1 ring-slate-200">
                    {itens.length}
                  </span>
                </div>
                <p className="text-xs text-slate-500">{col.ajuda}</p>
              </header>
              <div className="flex max-h-[calc(100dvh-16rem)] flex-col gap-2 overflow-y-auto px-3 pb-3">
                {itens.length === 0 && (
                  <p className="rounded-xl border border-dashed border-slate-300 p-4 text-center text-xs text-slate-400">
                    Nada aqui
                  </p>
                )}
                {itens.map((c) => (
                  <Link
                    key={c.id}
                    href={`/governanca/inspecao/${c.id}`}
                    className="block rounded-xl border border-slate-200 bg-white p-3 shadow-sm transition hover:border-brand-300"
                  >
                    {c.categoria && (
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                        {c.categoria}
                      </p>
                    )}
                    <p className="text-sm font-semibold text-slate-800">{c.checklist}</p>
                    {(c.uh || c.camareira) && (
                      <p className="text-xs text-slate-500">
                        {[c.uh ? `UH ${c.uh}` : null, c.camareira].filter(Boolean).join(" · ")}
                      </p>
                    )}
                    <p className="mt-1 text-xs text-slate-500">
                      {c.aplicador ?? "—"} ·{" "}
                      {c.coluna === "andamento"
                        ? agora
                          ? `começou ${tempoDesde(c.inicio, agora)}`
                          : formatDataHora(c.inicio)
                        : formatDataHora(c.fim ?? c.inicio)}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-1.5 text-[11px] font-semibold">
                      {c.coluna === "andamento" && (
                        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-amber-800">
                          {c.respondidos} {c.respondidos === 1 ? "item salvo" : "itens salvos"}
                        </span>
                      )}
                      {c.planosAbertos > 0 && (
                        <span className="rounded-full bg-red-100 px-2 py-0.5 text-red-700">
                          {c.planosAbertos} {c.planosAbertos === 1 ? "plano aberto" : "planos abertos"}
                        </span>
                      )}
                      {c.planosTotal > 0 && c.planosAbertos === 0 && (
                        <span className="rounded-full bg-sky-100 px-2 py-0.5 text-sky-700">
                          {c.planosTotal} {c.planosTotal === 1 ? "plano resolvido" : "planos resolvidos"}
                        </span>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </>
  );
}
