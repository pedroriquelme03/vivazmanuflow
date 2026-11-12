import { createClient } from "@/lib/supabase/server";
import { exigirGovernanca } from "@/lib/governanca-acesso";
import { PAPEL_GOV_LABEL, papelGovernanca } from "@/lib/governanca";
import { GovernancaShell } from "../../GovernancaShell";
import { SetoresApp } from "./SetoresApp";

export const dynamic = "force-dynamic";

export default async function SetoresPage() {
  const { perfil, papel } = await exigirGovernanca("/governanca/admin/setores", true);
  const supabase = await createClient();
  const [{ data: propriedades }, { data: setores }, { data: usuarios }, { data: acessos }] = await Promise.all([
    supabase.from("propriedades").select("id, nome, ativo").order("nome"),
    supabase.from("gov_setores").select("*, gov_processos(count), gov_camareiras(count)").order("nome"),
    supabase
      .from("usuarios")
      .select("id, nome, role, governanca_papel, ambientes")
      .contains("ambientes", ["checklist"])
      .eq("ativo", true)
      .order("nome"),
    supabase.from("gov_usuario_setores").select("usuario_id, setor_id"),
  ]);

  // O admin já vê todos os setores; o acesso por setor é para líder e aplicador.
  const equipe = (usuarios ?? []).flatMap((u) => {
    const papelUsuario = papelGovernanca(u.role, u.governanca_papel, u.ambientes);
    return papelUsuario && papelUsuario !== "admin"
      ? [{ id: u.id, nome: u.nome, papel: PAPEL_GOV_LABEL[papelUsuario] }]
      : [];
  });

  return (
    <GovernancaShell perfil={perfil} papel={papel}>
      <SetoresApp
        setores={(setores ?? []).map(({ gov_processos, gov_camareiras, ...s }) => ({
          ...s,
          checklists: gov_processos[0]?.count ?? 0,
          colaboradores: gov_camareiras[0]?.count ?? 0,
        }))}
        propriedades={propriedades ?? []}
        equipe={equipe}
        acessos={acessos ?? []}
      />
    </GovernancaShell>
  );
}
