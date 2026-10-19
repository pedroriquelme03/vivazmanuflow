import { createClient } from "@/lib/supabase/server";
import { exigirGovernanca } from "@/lib/governanca-acesso";
import { GovernancaShell } from "../../GovernancaShell";
import { AcomodacoesApp } from "./AcomodacoesApp";

export const dynamic = "force-dynamic";

export default async function AcomodacoesPage() {
  const { perfil, papel } = await exigirGovernanca("/governanca/admin/acomodacoes", true);
  const supabase = await createClient();
  const { data } = await supabase.from("gov_acomodacoes").select("*").order("numero");

  return (
    <GovernancaShell perfil={perfil} papel={papel}>
      <AcomodacoesApp lista={data ?? []} />
    </GovernancaShell>
  );
}
