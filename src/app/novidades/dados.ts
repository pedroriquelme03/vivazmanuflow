import { createClient } from "@/lib/supabase/server";

/**
 * Lê os documentos de um tipo como mapa ref_id → dados. Se a tabela ainda não
 * existe no banco, devolve `faltaTabela` para a tela avisar.
 */
export async function lerRegistros<T>(tipo: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("novidades_registros")
    .select("ref_id, dados, atualizado_em")
    .eq("tipo", tipo);
  const mapa: Record<string, T> = {};
  for (const r of data ?? []) mapa[r.ref_id] = r.dados as T;
  return { mapa, faltaTabela: Boolean(error) };
}

export function hojeSp() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());
}
