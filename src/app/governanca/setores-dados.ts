import type { createClient } from "@/lib/supabase/server";
import { setoresDaPessoa } from "@/lib/checklist-setores";
import type { GovPapel } from "@/lib/governanca";

type Supabase = Awaited<ReturnType<typeof createClient>>;

/** Propriedades e setores do checklist, para agrupar e escolher por setor. */
export async function carregarSetores(supabase: Supabase) {
  const [{ data: propriedades }, { data: setores }] = await Promise.all([
    supabase.from("propriedades").select("id, nome, ativo").order("nome"),
    supabase.from("gov_setores").select("*").order("nome"),
  ]);
  return { propriedades: propriedades ?? [], setores: setores ?? [] };
}

/**
 * Além das propriedades e setores, os setores que a pessoa usa: o admin, todos;
 * líder e aplicador, os marcados para eles em Checklist > Setores.
 */
export async function carregarSetoresDaPessoa(supabase: Supabase, usuarioId: string, papel: GovPapel) {
  const [base, { data: liberados }] = await Promise.all([
    carregarSetores(supabase),
    papel === "admin"
      ? Promise.resolve({ data: [] })
      : supabase.from("gov_usuario_setores").select("setor_id").eq("usuario_id", usuarioId),
  ]);
  const ids = (liberados ?? []).map((l) => l.setor_id);
  return { ...base, meusSetores: setoresDaPessoa(papel, base.setores, ids) };
}
