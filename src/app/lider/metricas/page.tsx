import { redirect } from "next/navigation";
import { getPerfil } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PainelShell } from "@/components/AdminSidebar";
import { MetricasDashboard } from "./MetricasDashboard";

export const dynamic = "force-dynamic";

export default async function MetricasPage() {
  const perfil = await getPerfil();
  if (!perfil) redirect("/login?next=/lider/metricas");
  if (perfil.role === "colaborador") redirect("/colaborador");

  const supabase = await createClient();
  const [
    { data: colaboradores },
    { data: setores },
    { data: propriedades },
    { data: locais },
    eventosRes,
  ] = await Promise.all([
    supabase
      .from("usuarios")
      .select("id, nome")
      .eq("role", "colaborador")
      .eq("ativo", true)
      .order("nome"),
    supabase.from("setores").select("id, nome, propriedade_id").eq("ativo", true).order("nome"),
    supabase.from("propriedades").select("id, nome").eq("ativo", true).order("nome"),
    supabase
      .from("locais")
      .select("id, nome, propriedade_id")
      .eq("ativo", true)
      .order("nome"),
    supabase.from("eventos").select("id, nome").eq("ativo", true).order("nome"),
  ]);

  return (
    <PainelShell perfil={perfil}>
      <MetricasDashboard
        colaboradores={colaboradores ?? []}
        setores={setores ?? []}
        propriedades={propriedades ?? []}
        locais={locais ?? []}
        eventos={eventosRes.data ?? []}
      />
    </PainelShell>
  );
}
