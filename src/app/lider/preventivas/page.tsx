import { redirect } from "next/navigation";
import { getPerfil, rotaInicial } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PainelComAmbiente } from "@/components/PainelComAmbiente";
import { resolverAmbiente } from "@/lib/resolver-ambiente";
import { PreventivasApp } from "./PreventivasApp";

export const dynamic = "force-dynamic";

export default async function PreventivasPage() {
  const perfil = await getPerfil();
  if (!perfil) redirect("/login?next=/lider/preventivas");
  if (perfil.role === "colaborador" || perfil.role === "solicitante") {
    redirect(rotaInicial(perfil.role));
  }

  const supabase = await createClient();
  const ambiente = await resolverAmbiente(perfil.ambientes, perfil.role);
  if (ambiente === "ti") redirect("/lider");

  const gerou = await supabase.rpc("abrir_preventivas_vencidas");
  const [{ data: propriedades }, locaisRes, rotinasRes] = await Promise.all([
    supabase.from("propriedades").select("id, nome, ativo").order("nome"),
    supabase.from("preventiva_locais").select("*").order("nome"),
    supabase.from("preventivas").select("*").order("proxima_abertura"),
  ]);

  const aviso = locaisRes.error
    ? "Rode o SQL em supabase/migrations/20261008160000_preventivas.sql no Supabase."
    : null;

  return (
    <PainelComAmbiente perfil={perfil}>
      <PreventivasApp
        lugares={locaisRes.data ?? []}
        rotinas={rotinasRes.data ?? []}
        propriedades={propriedades ?? []}
        propriedadePadrao={perfil.propriedade_id}
        abertasAgora={typeof gerou.data === "number" ? gerou.data : 0}
        aviso={aviso}
      />
    </PainelComAmbiente>
  );
}
