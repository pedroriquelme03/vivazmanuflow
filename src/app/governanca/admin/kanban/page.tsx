import { createClient } from "@/lib/supabase/server";
import { exigirGovernanca } from "@/lib/governanca-acesso";
import { MIGRATION_HINT_GOV, colunaKanban, erroSchemaGov, inicioPeriodo } from "@/lib/governanca";
import { GovernancaShell } from "../../GovernancaShell";
import { Erro, Titulo } from "../../ui";
import { KanbanChecklist, type CartaoKanban } from "./KanbanChecklist";

export const dynamic = "force-dynamic";

const DIAS_FINALIZADOS = 30;

export default async function KanbanChecklistPage() {
  const { perfil, papel } = await exigirGovernanca("/governanca/admin/kanban", "equipe");

  const supabase = await createClient();
  const desde = (inicioPeriodo("30") ?? new Date(0)).toISOString();
  const { data, error } = await supabase
    .from("gov_inspecoes")
    .select(
      "id, status, criado_em, finalizada_em, gov_processos(nome, categoria), gov_acomodacoes(numero), gov_camareiras(nome), usuarios(nome), gov_respostas(id, gov_planos_acao(id, resolvido_em))",
    )
    .or(`status.eq.em_andamento,criado_em.gte.${desde}`)
    .order("criado_em", { ascending: false })
    .limit(300);

  const cartoes: CartaoKanban[] = (data ?? []).map((i) => {
    const planos = (i.gov_respostas ?? []).flatMap((r) => r.gov_planos_acao ?? []);
    return {
      id: i.id,
      coluna: colunaKanban({ status: i.status, planos }),
      checklist: i.gov_processos?.nome ?? "Checklist",
      categoria: i.gov_processos?.categoria ?? null,
      uh: i.gov_acomodacoes?.numero ?? null,
      camareira: i.gov_camareiras?.nome ?? null,
      aplicador: i.usuarios?.nome ?? null,
      inicio: i.criado_em,
      fim: i.finalizada_em,
      respondidos: (i.gov_respostas ?? []).length,
      planosAbertos: planos.filter((p) => !p.resolvido_em).length,
      planosTotal: planos.length,
    };
  });

  return (
    <GovernancaShell perfil={perfil} papel={papel} largo>
      <Titulo
        titulo="Kanban"
        subtitulo={`Andamento dos checklists. Em andamento aparecem todos; os finalizados, dos últimos ${DIAS_FINALIZADOS} dias.`}
      />
      <Erro texto={error && erroSchemaGov(error.message, error.code) ? MIGRATION_HINT_GOV : error?.message ?? null} />
      <KanbanChecklist cartoes={cartoes} />
    </GovernancaShell>
  );
}
