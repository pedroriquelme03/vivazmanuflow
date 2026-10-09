import { redirect } from "next/navigation";
import { getPerfil, rotaInicial } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PainelComAmbiente } from "@/components/PainelComAmbiente";
import { resolverAmbiente } from "@/lib/resolver-ambiente";
import { SistemasApp } from "./SistemasApp";

export const dynamic = "force-dynamic";

export default async function SistemasPage() {
  const perfil = await getPerfil();
  if (!perfil) redirect("/login?next=/lider/sistemas");
  if (perfil.role === "colaborador" || perfil.role === "solicitante") {
    redirect(rotaInicial(perfil.role));
  }

  const supabase = await createClient();
  const ambiente = await resolverAmbiente(perfil.ambientes, perfil.role);
  if (ambiente !== "ti") redirect("/lider");

  const { data, error } = await supabase
    .from("sistemas")
    .select("id, nome, ativo")
    .order("nome");

  const aviso = error
    ? "Rode o SQL em supabase/migrations/20261009140000_sistemas_ti.sql no Supabase."
    : null;

  return (
    <PainelComAmbiente perfil={perfil}>
      <SistemasApp sistemas={data ?? []} aviso={aviso} />
    </PainelComAmbiente>
  );
}
