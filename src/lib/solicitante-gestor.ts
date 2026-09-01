import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

type Prop = { id: string; ativo: boolean };

function chave(propriedadeId: string, nome: string) {
  return `${propriedadeId}::${nome.trim().toLowerCase()}`;
}

/** Evita o mesmo nome duas vezes no dropdown (cópias no banco). */
export function solicitantesUnicos<T extends { nome: string; propriedade_id: string }>(
  lista: T[],
): T[] {
  const visto = new Set<string>();
  return lista.filter((s) => {
    const k = chave(s.propriedade_id, s.nome);
    if (visto.has(k)) return false;
    visto.add(k);
    return true;
  });
}

/** Só cria se aquele nome ainda não existe naquele local. */
export async function garantirSolicitantesGestor(
  supabase: SupabaseClient<Database>,
  opts: {
    nome: string;
    propriedadeId: string | null;
    propriedades: Prop[];
  },
) {
  const nome = opts.nome.trim();
  if (!nome) return false;

  const alvos = opts.propriedadeId
    ? opts.propriedades.filter((p) => p.id === opts.propriedadeId)
    : opts.propriedades.filter((p) => p.ativo);
  if (alvos.length === 0) return false;

  const { data: existentes } = await supabase
    .from("solicitantes")
    .select("nome, propriedade_id")
    .in(
      "propriedade_id",
      alvos.map((p) => p.id),
    );

  const jaTem = new Set(
    (existentes ?? []).map((s) => chave(s.propriedade_id, s.nome)),
  );

  const novos = alvos.filter((p) => !jaTem.has(chave(p.id, nome)));
  if (novos.length === 0) return false;

  const { error } = await supabase.from("solicitantes").insert(
    novos.map((p) => ({
      nome,
      propriedade_id: p.id,
      ativo: true,
    })),
  );
  if (error) return false;
  return true;
}
