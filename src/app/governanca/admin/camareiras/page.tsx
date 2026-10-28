import { createClient } from "@/lib/supabase/server";
import { exigirGovernanca } from "@/lib/governanca-acesso";
import { GovernancaShell } from "../../GovernancaShell";
import { CamareirasApp } from "./CamareirasApp";

export const dynamic = "force-dynamic";

export default async function CamareirasPage() {
  const { perfil, papel } = await exigirGovernanca("/governanca/admin/camareiras", "equipe");
  const supabase = await createClient();
  const { data } = await supabase.from("gov_camareiras").select("*").order("nome");

  return (
    <GovernancaShell perfil={perfil} papel={papel}>
      <CamareirasApp lista={data ?? []} />
    </GovernancaShell>
  );
}
