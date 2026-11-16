import type { createClient } from "@/lib/supabase/server";
import { setoresDaPessoa } from "@/lib/checklist-setores";
import { GRUPOS_PADRAO, type GrupoItem } from "@/lib/checklist-patrimonio";
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

/** Grupos de itens (Eletrônicos, Mobília...); sem o SQL dos grupos, os três de sempre. */
export async function carregarGruposItem(supabase: Supabase): Promise<GrupoItem[]> {
  const { data, error } = await supabase.from("gov_grupos_item").select("codigo, nome, exemplos, ordem, ativo").order("ordem");
  return error || !data?.length ? GRUPOS_PADRAO : data;
}

/**
 * Árvore de locais (categorias, tipos, classificações) e onde cada checklist se
 * aplica. Sem o SQL da árvore, volta vazio e tudo segue como antes.
 */
export async function carregarArvore(supabase: Supabase) {
  const [{ data: lugares }, { data: ligacoes }] = await Promise.all([
    supabase.from("gov_lugares").select("*").order("ordem"),
    supabase.from("gov_processo_lugares").select("processo_id, lugar_id"),
  ]);
  const porProcesso: Record<string, string[]> = {};
  for (const l of ligacoes ?? []) (porProcesso[l.processo_id] ??= []).push(l.lugar_id);
  return { lugares: lugares ?? [], ligacoes: porProcesso };
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
