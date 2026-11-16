import { createClient } from "@/lib/supabase/server";
import { exigirGovernanca } from "@/lib/governanca-acesso";
import { GovernancaShell } from "../../GovernancaShell";
import { carregarArvore, carregarSetoresDaPessoa } from "../../setores-dados";
import { rotuloOndeChecklist } from "@/lib/checklist-lugares";
import { ProcessosApp } from "./ProcessosApp";

export const dynamic = "force-dynamic";

export default async function ProcessosPage({
  searchParams,
}: {
  searchParams: Promise<{ novo?: string; setor?: string }>;
}) {
  const { perfil, papel } = await exigirGovernanca("/governanca/admin/processos", "equipe");
  const busca = await searchParams;
  const supabase = await createClient();
  // O banco devolve só os checklists dos setores da pessoa (o admin vê todos).
  const [{ data }, { setores, propriedades, meusSetores }, arvore] = await Promise.all([
    supabase.from("gov_processos").select("*, gov_secoes(gov_perguntas(id))"),
    carregarSetoresDaPessoa(supabase, perfil.id, papel),
    carregarArvore(supabase),
  ]);

  const lista = (data ?? []).map(({ gov_secoes, ...p }) => ({
    ...p,
    perguntas: (gov_secoes ?? []).reduce((n, s) => n + (s.gov_perguntas?.length ?? 0), 0),
    onde: rotuloOndeChecklist(p, arvore.ligacoes[p.id] ?? [], arvore.lugares),
  }));

  return (
    <GovernancaShell perfil={perfil} papel={papel}>
      <ProcessosApp
        lista={lista}
        setores={setores}
        propriedades={propriedades}
        meusSetores={meusSetores}
        abrirNovo={busca.novo === "1"}
        setorInicial={busca.setor}
      />
    </GovernancaShell>
  );
}
