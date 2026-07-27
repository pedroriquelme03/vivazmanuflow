"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { rotaInicial } from "@/lib/auth";

export type LoginState = { error?: string };

export async function login(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim();
  const senha = String(formData.get("senha") ?? "");
  const next = String(formData.get("next") ?? "");

  if (!email || !senha) {
    return { error: "Informe e-mail e senha." };
  }

  const supabase = await createClient();
  const { data: auth, error } = await supabase.auth.signInWithPassword({
    email,
    password: senha,
  });

  if (error || !auth.user) {
    return { error: "E-mail ou senha inválidos." };
  }

  const { data: perfil } = await supabase
    .from("usuarios")
    .select("role, ativo")
    .eq("id", auth.user.id)
    .single();

  if (!perfil || !perfil.ativo) {
    await supabase.auth.signOut();
    return { error: "Este usuário não tem acesso ativo ao sistema." };
  }

  redirect(next && next.startsWith("/") ? next : rotaInicial(perfil.role));
}
