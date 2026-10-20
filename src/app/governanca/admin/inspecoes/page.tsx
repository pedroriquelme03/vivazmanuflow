import { createClient } from "@/lib/supabase/server";
import { exigirGovernanca } from "@/lib/governanca-acesso";
import { GovernancaShell } from "../../GovernancaShell";
import { InspecoesApp } from "./InspecoesApp";

export const dynamic = "force-dynamic";

export default async function InspecoesPage() {
  const { perfil, papel } = await exigirGovernanca("/governanca/admin/inspecoes", true);
  const supabase = await createClient();
  const { data } = await supabase
    .from("gov_inspecoes")
    .select(
      "id, tipo, status, criado_em, finalizada_em, gov_acomodacoes(numero), gov_camareiras(nome), gov_processos(nome), usuarios(nome)",
    )
    .order("criado_em", { ascending: false })
    .limit(500);

  const lista = (data ?? []).map((i) => ({
    id: i.id,
    tipo: i.tipo,
    status: i.status,
    data: i.finalizada_em ?? i.criado_em,
    uh: i.gov_acomodacoes?.numero ?? null,
    checklist: i.gov_processos?.nome ?? null,
    camareira: i.gov_camareiras?.nome ?? null,
    inspetor: i.usuarios?.nome ?? null,
  }));

  return (
    <GovernancaShell perfil={perfil} papel={papel}>
      <InspecoesApp lista={lista} />
    </GovernancaShell>
  );
}
