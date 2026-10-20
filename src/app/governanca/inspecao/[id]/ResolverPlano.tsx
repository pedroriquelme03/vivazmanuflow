"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { formatDataHora } from "@/lib/governanca";

/** Líder e admin marcam o plano de ação como resolvido (ou reabrem). */
export function ResolverPlano({
  planoId,
  resolvidoEm,
  usuarioId,
  podeResolver,
}: {
  planoId: string;
  resolvidoEm: string | null;
  usuarioId: string;
  podeResolver: boolean;
}) {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function alternar() {
    setSalvando(true);
    setErro(null);
    const { error } = await supabase
      .from("gov_planos_acao")
      .update(
        resolvidoEm
          ? { resolvido_em: null, resolvido_por: null }
          : { resolvido_em: new Date().toISOString(), resolvido_por: usuarioId },
      )
      .eq("id", planoId);
    setSalvando(false);
    if (error) {
      return setErro(
        error.message.includes("resolvido")
          ? "Rode o SQL 20261020180000_checklist_ambiente.sql no Supabase."
          : error.message,
      );
    }
    router.refresh();
  }

  return (
    <div className="mt-2 flex flex-wrap items-center gap-2">
      {resolvidoEm && (
        <span className="rounded-full bg-sky-100 px-2 py-0.5 text-[11px] font-semibold text-sky-700">
          Resolvido em {formatDataHora(resolvidoEm)}
        </span>
      )}
      {podeResolver && (
        <button
          type="button"
          onClick={alternar}
          disabled={salvando}
          className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition disabled:opacity-50 ${
            resolvidoEm
              ? "border border-slate-300 bg-white text-slate-600 hover:bg-slate-50"
              : "bg-emerald-600 text-white hover:bg-emerald-700"
          }`}
        >
          {salvando ? "Salvando…" : resolvidoEm ? "Reabrir" : "Marcar plano como resolvido"}
        </button>
      )}
      {erro && <span className="text-xs text-red-700">{erro}</span>}
    </div>
  );
}
