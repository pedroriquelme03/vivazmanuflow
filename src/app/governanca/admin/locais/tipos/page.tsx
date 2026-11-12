import { createClient } from "@/lib/supabase/server";
import { exigirGovernanca } from "@/lib/governanca-acesso";
import { GovernancaShell } from "../../../GovernancaShell";
import { TiposItem } from "./TiposItem";

export const dynamic = "force-dynamic";

export default async function TiposItemPage() {
  const { perfil, papel } = await exigirGovernanca("/governanca/admin/locais/tipos", true);
  const supabase = await createClient();
  const { data: tipos } = await supabase
    .from("gov_tipos_item")
    .select("*, gov_local_itens(count), gov_perguntas(count)")
    .order("nome");

  return (
    <GovernancaShell perfil={perfil} papel={papel}>
      <TiposItem
        tipos={(tipos ?? []).map(({ gov_local_itens, gov_perguntas, ...t }) => ({
          ...t,
          itens: gov_local_itens[0]?.count ?? 0,
          perguntas: gov_perguntas[0]?.count ?? 0,
        }))}
      />
    </GovernancaShell>
  );
}
