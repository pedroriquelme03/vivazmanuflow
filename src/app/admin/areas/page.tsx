import { redirect } from "next/navigation";
import { getPerfil, rotaInicial } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PainelComAmbiente } from "@/components/PainelComAmbiente";
import { AreasApp } from "./AreasApp";

export const dynamic = "force-dynamic";

export default async function AreasPage() {
  const perfil = await getPerfil();
  if (!perfil) redirect("/login?next=/admin/areas");
  if (perfil.role !== "admin") redirect(rotaInicial(perfil.role));

  const supabase = await createClient();
  const [{ data: propriedades }, { data: areas }, { data: equipamentos }] =
    await Promise.all([
      supabase.from("propriedades").select("*").order("nome"),
      supabase.from("hotel_areas").select("*").order("nome"),
      supabase.from("equipamentos").select("*").order("nome"),
    ]);

  return (
    <PainelComAmbiente perfil={perfil}>
      <AreasApp
        areas={areas ?? []}
        equipamentos={equipamentos ?? []}
        propriedades={propriedades ?? []}
      />
    </PainelComAmbiente>
  );
}
