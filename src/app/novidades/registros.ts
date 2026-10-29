"use client";

import { createClient } from "@/lib/supabase/client";
import type { Json } from "@/lib/database.types";

export type TipoRegistro = "inventario" | "criticidade" | "backlog" | "backlog_capacidade" | "pmoc";

/** Grava (ou substitui) o documento do tipo + referência. */
export async function salvarRegistro(tipo: TipoRegistro, refId: string, dados: unknown) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { error } = await supabase.from("novidades_registros").upsert(
    {
      tipo,
      ref_id: refId,
      dados: dados as Json,
      atualizado_por: user?.id ?? null,
      atualizado_em: new Date().toISOString(),
    },
    { onConflict: "tipo,ref_id" },
  );
  if (error) throw new Error(error.message);
}
