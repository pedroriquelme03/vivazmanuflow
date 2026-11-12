import { createClient } from "@/lib/supabase/server";
import { exigirGovernanca } from "@/lib/governanca-acesso";
import { PAPEL_GOV_LABEL, papelGovernanca } from "@/lib/governanca";
import { GovernancaShell } from "../../../GovernancaShell";
import { carregarSetores } from "../../../setores-dados";
import { Vazio } from "../../../ui";
import { SetorDetalhe } from "./SetorDetalhe";

export const dynamic = "force-dynamic";

export default async function SetorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { perfil, papel } = await exigirGovernanca(`/governanca/admin/setores/${id}`, true);
  const supabase = await createClient();
  const [{ setores, propriedades }, { data: processos }, { data: usuarios }, { data: acessos }, { count: colaboradores }] =
    await Promise.all([
      carregarSetores(supabase),
      supabase.from("gov_processos").select("*, gov_secoes(gov_perguntas(id))").eq("setor_id", id).order("nome"),
      supabase
        .from("usuarios")
        .select("id, nome, role, governanca_papel, ambientes")
        .contains("ambientes", ["checklist"])
        .eq("ativo", true)
        .order("nome"),
      supabase.from("gov_usuario_setores").select("usuario_id").eq("setor_id", id),
      supabase.from("gov_camareiras").select("id", { count: "exact", head: true }).eq("setor_id", id),
    ]);

  const setor = setores.find((s) => s.id === id);
  // O admin já vê todos os setores; o acesso por setor é para líder e aplicador.
  const equipe = (usuarios ?? []).flatMap((u) => {
    const p = papelGovernanca(u.role, u.governanca_papel, u.ambientes);
    return p && p !== "admin" ? [{ id: u.id, nome: u.nome, papel: PAPEL_GOV_LABEL[p] }] : [];
  });

  return (
    <GovernancaShell perfil={perfil} papel={papel}>
      {!setor ? (
        <Vazio texto="Setor não encontrado." />
      ) : (
        <SetorDetalhe
          setor={setor}
          setores={setores}
          propriedades={propriedades}
          checklists={(processos ?? []).map(({ gov_secoes, ...p }) => ({
            ...p,
            perguntas: (gov_secoes ?? []).reduce((n, s) => n + (s.gov_perguntas?.length ?? 0), 0),
          }))}
          colaboradores={colaboradores ?? 0}
          equipe={equipe}
          comAcesso={(acessos ?? []).map((a) => a.usuario_id)}
        />
      )}
    </GovernancaShell>
  );
}
