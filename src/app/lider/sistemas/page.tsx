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
    redirect(rotaInicial(perfil.role, perfil.ambientes));
  }

  const supabase = await createClient();
  const ambiente = await resolverAmbiente(perfil.ambientes, perfil.role);
  if (ambiente !== "ti") redirect("/lider");

  const comSlug = await supabase
    .from("sistemas")
    .select("id, nome, slug, ativo")
    .order("nome");

  let aviso: string | null = null;
  let slugDisponivel = true;
  let sistemas: { id: string; nome: string; slug: string | null; ativo: boolean }[] =
    comSlug.data ?? [];

  if (comSlug.error) {
    const faltaSlug = comSlug.error.message.includes("slug");
    if (faltaSlug) {
      const base = await supabase
        .from("sistemas")
        .select("id, nome, ativo")
        .order("nome");
      aviso = base.error
        ? "Rode o SQL em supabase/migrations/20261009140000_sistemas_ti.sql no Supabase."
        : "Rode o SQL em supabase/migrations/20261014130000_alerta_sentry.sql no Supabase.";
      slugDisponivel = false;
      sistemas = (base.data ?? []).map((sistema) => ({
        ...sistema,
        slug: null,
      }));
    } else {
      aviso =
        "Rode o SQL em supabase/migrations/20261009140000_sistemas_ti.sql no Supabase.";
      slugDisponivel = false;
      sistemas = [];
    }
  }

  return (
    <PainelComAmbiente perfil={perfil}>
      <SistemasApp
        sistemas={sistemas}
        aviso={aviso}
        slugDisponivel={slugDisponivel}
        podeTestar={perfil.role === "admin"}
      />
    </PainelComAmbiente>
  );
}
