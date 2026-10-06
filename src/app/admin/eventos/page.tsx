import { redirect } from "next/navigation";
import { getPerfil, rotaInicial } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PainelComAmbiente } from "@/components/PainelComAmbiente";
import { EventosApp } from "./EventosApp";

export const dynamic = "force-dynamic";

export default async function EventosPage() {
  const perfil = await getPerfil();
  if (!perfil) redirect("/login?next=/admin/eventos");
  if (perfil.role !== "admin") redirect(rotaInicial(perfil.role));

  const supabase = await createClient();
  const [{ data: propriedades }, eventosRes] = await Promise.all([
    supabase.from("propriedades").select("*").order("nome"),
    supabase.from("eventos").select("*").order("data_inicio", {
      ascending: false,
      nullsFirst: false,
    }),
  ]);

  return (
    <PainelComAmbiente perfil={perfil}>
      <EventosApp
        eventos={eventosRes.data ?? []}
        propriedades={propriedades ?? []}
      />
    </PainelComAmbiente>
  );
}
