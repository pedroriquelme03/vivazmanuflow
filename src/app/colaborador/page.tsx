import { redirect } from "next/navigation";
import { getPerfil } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { COLAB_SELECT, GERAIS_SELECT } from "@/lib/demanda-select";
import { ColaboradorPainel } from "./ColaboradorPainel";

export const dynamic = "force-dynamic";

export default async function ColaboradorHome() {
  const perfil = await getPerfil();
  if (!perfil) redirect("/login?next=/colaborador");

  const supabase = await createClient();

  const minhasQ = supabase
    .from("demandas")
    .select(COLAB_SELECT)
    .eq("colaborador_id", perfil.id)
    .in("status", ["atribuida", "em_andamento"])
    .eq("arquivado", false)
    .order("peso", { ascending: false })
    .order("criado_em", { ascending: true });

  let geraisQ = supabase
    .from("demandas")
    .select(GERAIS_SELECT)
    .eq("status", "aberta")
    .eq("arquivado", false)
    .is("colaborador_id", null)
    .order("peso", { ascending: false })
    .order("criado_em", { ascending: true });

  if (perfil.propriedade_id) {
    geraisQ = geraisQ.eq("propriedade_id", perfil.propriedade_id);
  }

  const [{ data: demandas }, { data: gerais }] = await Promise.all([
    minhasQ,
    geraisQ,
  ]);

  return (
    <ColaboradorPainel
      demandasIniciais={demandas ?? []}
      geraisIniciais={gerais ?? []}
      perfil={perfil}
    />
  );
}
