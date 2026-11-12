"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Escrita = PromiseLike<{ error: { message: string; code?: string } | null }>;

const SQL_SETORES =
  "O banco ainda não tem os setores do checklist. Rode o SQL em supabase/migrations/20261112120000_checklist_setores.sql no Supabase.";

/** Tabela ou coluna que ainda não existe no banco (SQL não rodado). */
function faltaNoBanco(error: { message: string; code?: string }) {
  return (
    error.code === "42P01" ||
    error.code === "42703" ||
    error.code === "PGRST204" ||
    error.code === "PGRST205" ||
    error.message.includes("schema cache")
  );
}

/**
 * Escritas das telas do Checklist: roda, mostra o erro (se houver) e recarrega
 * a página. `mensagens` troca o erro do banco por um texto claro, pelo código
 * do Postgres (ex.: 23505 nome repetido, 23503 em uso).
 */
export function useGravar() {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const [erro, setErro] = useState<string | null>(null);

  async function gravar(
    acao: Escrita,
    mensagens: Record<string, string> = {},
    { recarregar = true }: { recarregar?: boolean } = {},
  ) {
    const { error } = await acao;
    if (error) {
      setErro(mensagens[error.code ?? ""] ?? (faltaNoBanco(error) ? SQL_SETORES : error.message));
      return false;
    }
    setErro(null);
    if (recarregar) router.refresh();
    return true;
  }

  return { supabase, erro, setErro, gravar };
}
