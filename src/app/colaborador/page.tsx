import { redirect } from "next/navigation";
import { getPerfil, rotaInicial } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { COLAB_SELECT, GERAIS_SELECT } from "@/lib/demanda-select";
import { resolverAmbiente } from "@/lib/resolver-ambiente";
import { ColaboradorPainel } from "./ColaboradorPainel";

export const dynamic = "force-dynamic";

export default async function ColaboradorHome() {
  const perfil = await getPerfil();
  if (!perfil) redirect("/login?next=/colaborador");
  if (perfil.role !== "colaborador") redirect(rotaInicial(perfil.role));

  const supabase = await createClient();
  const ambiente = await resolverAmbiente(perfil.ambientes, perfil.role);

  const minhasBase = () =>
    supabase
      .from("demandas")
      .select(COLAB_SELECT)
      .eq("colaborador_id", perfil.id)
      .in("status", ["atribuida", "em_andamento"])
      .eq("arquivado", false)
      .order("peso", { ascending: false })
      .order("criado_em", { ascending: true });

  const geraisBase = () =>
    supabase
      .from("demandas")
      .select(GERAIS_SELECT)
      .eq("status", "aberta")
      .eq("arquivado", false)
      .is("colaborador_id", null)
      .order("peso", { ascending: false })
      .order("criado_em", { ascending: true });

  const minhasFiltradas = await minhasBase().eq("ambiente", ambiente);
  const geraisFiltradas = await geraisBase().eq("ambiente", ambiente);
  const minhas = minhasFiltradas.error ? await minhasBase() : minhasFiltradas;
  const gerais = geraisFiltradas.error ? await geraisBase() : geraisFiltradas;

  return (
    <ColaboradorPainel
      ambiente={ambiente}
      demandasIniciais={minhas.data ?? []}
      geraisIniciais={gerais.data ?? []}
      perfil={perfil}
    />
  );
}
