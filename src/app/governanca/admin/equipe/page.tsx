import { createClient } from "@/lib/supabase/server";
import { exigirGovernanca } from "@/lib/governanca-acesso";
import { GovernancaShell } from "../../GovernancaShell";
import { EquipeApp } from "./EquipeApp";

export const dynamic = "force-dynamic";

export default async function EquipePage() {
  const { perfil, papel } = await exigirGovernanca("/governanca/admin/equipe", true);
  const supabase = await createClient();
  const { data } = await supabase
    .from("usuarios")
    .select("id, nome, role, governanca_papel")
    .eq("ativo", true)
    .neq("role", "solicitante")
    .order("nome");

  return (
    <GovernancaShell perfil={perfil} papel={papel}>
      <EquipeApp pessoas={data ?? []} />
    </GovernancaShell>
  );
}
