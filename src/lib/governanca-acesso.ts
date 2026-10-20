import { redirect } from "next/navigation";
import { getPerfil, rotaInicial } from "@/lib/auth";
import { papelGovernanca } from "@/lib/governanca";

/**
 * Garante que o usuário logado tem o ambiente Checklist marcado.
 * Com `soAdmin`, só o administrador passa; com `equipe`, líder e administrador.
 */
export async function exigirGovernanca(
  caminho: string,
  acesso: boolean | "equipe" = false,
) {
  const perfil = await getPerfil();
  if (!perfil) redirect(`/login?next=${encodeURIComponent(caminho)}`);

  const papel = papelGovernanca(perfil.role, perfil.governanca_papel, perfil.ambientes);
  if (!papel) redirect(rotaInicial(perfil.role));
  if (acesso === true && papel !== "admin") redirect("/governanca");
  if (acesso === "equipe" && papel === "camareira") redirect("/governanca");

  return { perfil, papel };
}
