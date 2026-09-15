import { redirect } from "next/navigation";
import { getPerfil } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PainelShell } from "@/components/AdminSidebar";
import { ProjetosApp } from "./ProjetosApp";

export const dynamic = "force-dynamic";

export default async function ProjetosPage() {
  const perfil = await getPerfil();
  if (!perfil) redirect("/login?next=/admin/projetos");
  if (perfil.role !== "admin")
    redirect(perfil.role === "colaborador" ? "/colaborador" : "/lider");

  const supabase = await createClient();
  const [{ data: propriedades }, projetosRes, membrosRes, equipeRes] =
    await Promise.all([
      supabase.from("propriedades").select("*").order("nome"),
      supabase.from("projetos").select("*").order("nome"),
      supabase.from("projeto_membros").select("projeto_id, usuario_id"),
      supabase
        .from("usuarios")
        .select("id, nome, role")
        .eq("ativo", true)
        .in("role", ["colaborador", "lider", "admin"])
        .order("nome"),
    ]);

  return (
    <PainelShell perfil={perfil}>
      <ProjetosApp
        projetos={projetosRes.data ?? []}
        propriedades={propriedades ?? []}
        membros={membrosRes.data ?? []}
        equipe={equipeRes.data ?? []}
      />
    </PainelShell>
  );
}
