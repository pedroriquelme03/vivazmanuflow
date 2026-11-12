import { createClient } from "@/lib/supabase/server";
import { exigirGovernanca } from "@/lib/governanca-acesso";
import { GovernancaShell } from "../../GovernancaShell";
import { SetoresApp } from "./SetoresApp";

export const dynamic = "force-dynamic";

export default async function SetoresPage() {
  const { perfil, papel } = await exigirGovernanca("/governanca/admin/setores", true);
  const supabase = await createClient();
  const [{ data: propriedades }, { data: setores }] = await Promise.all([
    supabase.from("propriedades").select("id, nome, ativo").order("nome"),
    supabase
      .from("gov_setores")
      .select("*, gov_processos(count), gov_camareiras(count), gov_usuario_setores(count)")
      .order("nome"),
  ]);

  return (
    <GovernancaShell perfil={perfil} papel={papel}>
      <SetoresApp
        setores={(setores ?? []).map(({ gov_processos, gov_camareiras, gov_usuario_setores, ...s }) => ({
          ...s,
          checklists: gov_processos[0]?.count ?? 0,
          colaboradores: gov_camareiras[0]?.count ?? 0,
          pessoas: gov_usuario_setores[0]?.count ?? 0,
        }))}
        propriedades={propriedades ?? []}
      />
    </GovernancaShell>
  );
}
