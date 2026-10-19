import { createClient } from "@/lib/supabase/server";
import { exigirGovernanca } from "@/lib/governanca-acesso";
import { GovernancaShell } from "../../GovernancaShell";
import { ProcessosApp } from "./ProcessosApp";

export const dynamic = "force-dynamic";

export default async function ProcessosPage() {
  const { perfil, papel } = await exigirGovernanca("/governanca/admin/processos", true);
  const supabase = await createClient();
  const { data } = await supabase
    .from("gov_processos")
    .select("*, gov_secoes(gov_perguntas(id))")
    .order("criado_em", { ascending: false });

  const lista = (data ?? []).map(({ gov_secoes, ...p }) => ({
    ...p,
    perguntas: (gov_secoes ?? []).reduce((n, s) => n + (s.gov_perguntas?.length ?? 0), 0),
  }));

  return (
    <GovernancaShell perfil={perfil} papel={papel}>
      <ProcessosApp lista={lista} />
    </GovernancaShell>
  );
}
