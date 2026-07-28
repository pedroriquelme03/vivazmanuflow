import { redirect } from "next/navigation";
import { getPerfil } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PainelShell } from "@/components/AdminSidebar";
import { AdminApp } from "./AdminApp";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const perfil = await getPerfil();
  if (!perfil) redirect("/login?next=/admin");
  if (perfil.role !== "admin")
    redirect(perfil.role === "colaborador" ? "/colaborador" : "/lider");

  const supabase = await createClient();
  const [
    { data: propriedades },
    { data: setores },
    { data: locais },
    { data: solicitantes },
    { data: usuarios },
    predefRes,
    pesoRes,
  ] = await Promise.all([
    supabase.from("propriedades").select("*").order("nome"),
    supabase.from("setores").select("*").order("nome"),
    supabase.from("locais").select("*").order("nome"),
    supabase.from("solicitantes").select("*").order("nome"),
    supabase.from("usuarios").select("*").order("nome"),
    supabase.from("demandas_predefinidas").select("*").order("titulo"),
    supabase.from("peso_config").select("*").eq("id", 1).maybeSingle(),
  ]);

  return (
    <PainelShell perfil={perfil}>
      <AdminApp
        propriedades={propriedades ?? []}
        setores={setores ?? []}
        locais={locais ?? []}
        solicitantes={solicitantes ?? []}
        usuarios={usuarios ?? []}
        predefinidas={predefRes.data ?? []}
        pesoConfig={pesoRes.data ?? null}
      />
    </PainelShell>
  );
}
