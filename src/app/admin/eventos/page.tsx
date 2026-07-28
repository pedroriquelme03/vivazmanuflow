import { redirect } from "next/navigation";
import { getPerfil } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PainelShell } from "@/components/AdminSidebar";
import { EventosApp } from "./EventosApp";

export const dynamic = "force-dynamic";

export default async function EventosPage() {
  const perfil = await getPerfil();
  if (!perfil) redirect("/login?next=/admin/eventos");
  if (perfil.role !== "admin")
    redirect(perfil.role === "colaborador" ? "/colaborador" : "/lider");

  const supabase = await createClient();
  const [{ data: propriedades }, eventosRes] = await Promise.all([
    supabase.from("propriedades").select("*").order("nome"),
    supabase.from("eventos").select("*").order("data_inicio", {
      ascending: false,
      nullsFirst: false,
    }),
  ]);

  return (
    <PainelShell perfil={perfil}>
      <EventosApp
        eventos={eventosRes.data ?? []}
        propriedades={propriedades ?? []}
      />
    </PainelShell>
  );
}
