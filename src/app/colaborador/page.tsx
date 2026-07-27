import { redirect } from "next/navigation";
import { getPerfil } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Topbar } from "@/components/Topbar";
import { COLAB_SELECT } from "@/lib/demanda-select";
import { ColaboradorPainel } from "./ColaboradorPainel";

export const dynamic = "force-dynamic";

export default async function ColaboradorHome() {
  const perfil = await getPerfil();
  if (!perfil) redirect("/login?next=/colaborador");

  const supabase = await createClient();
  const { data: demandas } = await supabase
    .from("demandas")
    .select(COLAB_SELECT)
    .eq("colaborador_id", perfil.id)
    .in("status", ["atribuida", "em_andamento"])
    .order("prazo_confirmado", { ascending: true, nullsFirst: false });

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <Topbar perfil={perfil} />
      <ColaboradorPainel
        demandasIniciais={demandas ?? []}
        colaboradorId={perfil.id}
        primeiroNome={perfil.nome.split(" ")[0]}
      />
    </div>
  );
}
