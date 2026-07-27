import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/lib/database.types";

export type Perfil = Tables<"usuarios"> & {
  email: string | undefined;
  propriedade_nome: string | null;
};

/**
 * Retorna o perfil (tabela `usuarios`) do usuário logado, ou `null`.
 * Usa getUser() (valida o token no servidor de Auth).
 */
export async function getPerfil(): Promise<Perfil | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("usuarios")
    .select("*, propriedades(nome)")
    .eq("id", user.id)
    .single();

  if (!data || !data.ativo) return null;

  const { propriedades, ...usuario } = data as typeof data & {
    propriedades: { nome: string } | null;
  };
  return {
    ...usuario,
    email: user.email,
    propriedade_nome: propriedades?.nome ?? null,
  };
}

/** Caminho inicial de cada papel. */
export function rotaInicial(role: Tables<"usuarios">["role"]) {
  return role === "colaborador" ? "/colaborador" : "/lider";
}
