import { createClient } from "@/lib/supabase/server";
import { exigirGovernanca } from "@/lib/governanca-acesso";
import { GovernancaShell } from "../../GovernancaShell";
import { carregarSetoresDaPessoa } from "../../setores-dados";
import { EquipeChecklist } from "./EquipeChecklist";

export const dynamic = "force-dynamic";

export default async function EquipePage() {
  const { perfil, papel } = await exigirGovernanca("/governanca/admin/equipe", "equipe");
  const supabase = await createClient();
  const [{ data: equipe, error }, setores] = await Promise.all([
    supabase.rpc("checklist_equipe"),
    carregarSetoresDaPessoa(supabase, perfil.id, papel),
  ]);

  return (
    <GovernancaShell perfil={perfil} papel={papel} largo>
      <EquipeChecklist
        euId={perfil.id}
        ehAdmin={papel === "admin"}
        equipe={equipe ?? []}
        faltaSql={Boolean(error)}
        setores={setores.setores}
        meusSetores={setores.meusSetores}
        propriedades={setores.propriedades}
      />
    </GovernancaShell>
  );
}
