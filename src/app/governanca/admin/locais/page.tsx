import { createClient } from "@/lib/supabase/server";
import { exigirGovernanca } from "@/lib/governanca-acesso";
import { GovernancaShell } from "../../GovernancaShell";
import { LocaisApp } from "./LocaisApp";

export const dynamic = "force-dynamic";

export default async function LocaisPage() {
  const { perfil, papel } = await exigirGovernanca("/governanca/admin/locais", true);
  const supabase = await createClient();
  const [{ data: locais }, { data: propriedades }] = await Promise.all([
    supabase.from("gov_acomodacoes").select("*, gov_local_itens(count)").order("numero"),
    supabase.from("propriedades").select("id, nome, ativo").order("nome"),
  ]);

  return (
    <GovernancaShell perfil={perfil} papel={papel} largo>
      <LocaisApp
        lista={(locais ?? []).map(({ gov_local_itens, ...l }) => ({ ...l, itens: gov_local_itens[0]?.count ?? 0 }))}
        propriedades={propriedades ?? []}
      />
    </GovernancaShell>
  );
}
