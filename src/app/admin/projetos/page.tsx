import { redirect } from "next/navigation";
import { getPerfil, rotaInicial } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PainelComAmbiente } from "@/components/PainelComAmbiente";
import { ProjetosApp } from "./ProjetosApp";

export const dynamic = "force-dynamic";

export default async function ProjetosPage() {
  const perfil = await getPerfil();
  if (!perfil) redirect("/login?next=/admin/projetos");
  if (perfil.role !== "admin") redirect(rotaInicial(perfil.role));

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
        .eq("role", "colaborador")
        .order("nome"),
    ]);

  return (
    <PainelComAmbiente perfil={perfil}>
      <ProjetosApp
        projetos={projetosRes.data ?? []}
        propriedades={propriedades ?? []}
        membros={membrosRes.data ?? []}
        equipe={equipeRes.data ?? []}
      />
    </PainelComAmbiente>
  );
}
