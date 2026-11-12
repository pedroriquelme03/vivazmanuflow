import { createClient } from "@/lib/supabase/server";
import { exigirGovernanca } from "@/lib/governanca-acesso";
import type { LinhaInspecao } from "@/lib/checklist-inspecao";
import { GovernancaShell } from "../../GovernancaShell";
import { carregarSetoresDaPessoa } from "../../setores-dados";
import { InspecoesApp } from "./InspecoesApp";

export const dynamic = "force-dynamic";

export default async function InspecoesPage() {
  const { perfil, papel } = await exigirGovernanca("/governanca/admin/inspecoes", "equipe");
  const supabase = await createClient();
  // O banco devolve só as inspeções dos setores da pessoa (o admin vê todas).
  const [{ data }, { setores, propriedades, meusSetores }] = await Promise.all([
    supabase
      .from("gov_inspecoes")
      .select(
        "id, status, criado_em, finalizada_em, data_referencia, inspetor_id, processo_id, acomodacao_id, camareira_id, gov_acomodacoes(numero, tipo), gov_camareiras(nome), gov_processos(nome, setor_id), usuarios(nome)",
      )
      .order("criado_em", { ascending: false })
      .limit(500),
    carregarSetoresDaPessoa(supabase, perfil.id, papel),
  ]);

  const lista: LinhaInspecao[] = (data ?? []).map((i) => ({
    id: i.id,
    status: i.status,
    dataReferencia: i.data_referencia,
    criadoEm: i.criado_em,
    finalizadaEm: i.finalizada_em,
    setorId: i.gov_processos?.setor_id ?? null,
    checklistId: i.processo_id,
    checklist: i.gov_processos?.nome ?? "Checklist",
    local: i.gov_acomodacoes
      ? i.gov_acomodacoes.tipo === "area"
        ? i.gov_acomodacoes.numero
        : `UH ${i.gov_acomodacoes.numero}`
      : null,
    localId: i.acomodacao_id,
    colaborador: i.gov_camareiras?.nome ?? null,
    colaboradorId: i.camareira_id,
    aplicador: i.usuarios?.nome ?? null,
    aplicadorId: i.inspetor_id,
  }));

  return (
    <GovernancaShell perfil={perfil} papel={papel} largo>
      <InspecoesApp lista={lista} setores={setores} meusSetores={meusSetores} propriedades={propriedades} />
    </GovernancaShell>
  );
}
