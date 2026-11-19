import type { createClient } from "@/lib/supabase/server";
import type { GovPapel } from "@/lib/governanca";
import { SEM_ACESSOS_SETOR, type AcessosSetor } from "@/lib/menu-checklist";
import { CODIGO_REGISTRO_RECREACAO } from "@/lib/recreacao-metricas";

type Supabase = Awaited<ReturnType<typeof createClient>>;

/** Setor Governança: o relatório diário das UHs é só dele. */
export function ehSetorGovernanca(nome: string) {
  return /^governan[cç]a$/i.test(nome.trim());
}

/**
 * O checklist de registro da Recreação e se a pessoa pode ver as métricas:
 * admin, ou líder marcado no setor do checklist (Checklist > Setores).
 * Quem só aplica não vê.
 */
export async function acessoRecreacao(supabase: Supabase, usuarioId: string, papel: GovPapel) {
  const { data: processo } = await supabase
    .from("gov_processos")
    .select("id, nome, setor_id")
    .eq("codigo_origem", CODIGO_REGISTRO_RECREACAO)
    .maybeSingle();
  if (!processo) return { processo: null, pode: false };
  if (papel === "admin") return { processo, pode: true };
  if (papel !== "lider") return { processo, pode: false };
  const { data } = await supabase
    .from("gov_usuario_setores")
    .select("setor_id")
    .eq("usuario_id", usuarioId)
    .eq("setor_id", processo.setor_id)
    .maybeSingle();
  return { processo, pode: Boolean(data) };
}

/** O que o menu mostra conforme o setor da pessoa (o banco confere de novo em cada tela). */
export async function acessosDoSetor(supabase: Supabase, usuarioId: string, papel: GovPapel | null): Promise<AcessosSetor> {
  if (!papel) return SEM_ACESSOS_SETOR;
  if (papel === "admin") return { governanca: true, recreacao: true };
  const [{ data: meus }, recreacao] = await Promise.all([
    supabase.from("gov_usuario_setores").select("gov_setores(nome)").eq("usuario_id", usuarioId),
    acessoRecreacao(supabase, usuarioId, papel),
  ]);
  return {
    governanca: (meus ?? []).some((m) => m.gov_setores && ehSetorGovernanca(m.gov_setores.nome)),
    recreacao: recreacao.pode,
  };
}
