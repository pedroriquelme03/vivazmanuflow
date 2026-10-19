import { redirect } from "next/navigation";
import { getPerfil, rotaInicial } from "@/lib/auth";
import { papelGovernanca } from "@/lib/governanca";

/**
 * Garante que o usuário logado pode usar o módulo de Governança.
 * Com `soAdmin`, só o administrador passa.
 */
export async function exigirGovernanca(caminho: string, soAdmin = false) {
  const perfil = await getPerfil();
  if (!perfil) redirect(`/login?next=${encodeURIComponent(caminho)}`);

  const papel = papelGovernanca(perfil.role, perfil.governanca_papel);
  if (!papel) redirect(rotaInicial(perfil.role));
  if (soAdmin && papel !== "admin") redirect("/governanca");

  return { perfil, papel };
}
