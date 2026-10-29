import { redirect } from "next/navigation";
import { getPerfil, rotaInicial } from "@/lib/auth";
import { resolverAmbiente } from "@/lib/resolver-ambiente";

/** Novidades é da Manutenção: só admin e líder, fora do ambiente de TI. */
export async function exigirNovidades(caminho: string) {
  const perfil = await getPerfil();
  if (!perfil) redirect(`/login?next=${encodeURIComponent(caminho)}`);
  if (perfil.role !== "admin" && perfil.role !== "lider") {
    redirect(rotaInicial(perfil.role));
  }
  const ambiente = await resolverAmbiente(perfil.ambientes, perfil.role);
  if (ambiente === "ti") redirect("/lider");
  return perfil;
}

export const SQL_NOVIDADES =
  "Para salvar os dados desta tela, rode o SQL em supabase/migrations/20261029120000_novidades_registros.sql no Supabase.";
