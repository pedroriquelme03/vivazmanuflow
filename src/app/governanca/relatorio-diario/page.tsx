import { createClient } from "@/lib/supabase/server";
import { exigirGovernanca } from "@/lib/governanca-acesso";
import { MIGRATION_HINT_GOV, erroSchemaGov, inspecionaEquipe } from "@/lib/governanca";
import { compararNumeroUh } from "@/lib/mapa-uhs";
import { GovernancaShell } from "../GovernancaShell";
import { Erro } from "../ui";
import { RelatorioDiario } from "./RelatorioDiario";

export const dynamic = "force-dynamic";

function hojeIso() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());
}

export default async function RelatorioDiarioPage() {
  const { perfil, papel } = await exigirGovernanca("/governanca/relatorio-diario");
  const supabase = await createClient();
  const hoje = hojeIso();

  // Relatório de hoje; sem ele, o último enviado (com aviso de que é de outro dia).
  const { data: relatorios, error } = await supabase
    .from("gov_relatorios_diarios")
    .select("*")
    .lte("data", hoje)
    .order("data", { ascending: false })
    .limit(1);
  const relatorio = relatorios?.[0] ?? null;

  const { data: uhs } = relatorio
    ? await supabase.from("gov_relatorio_uhs").select("*").eq("data", relatorio.data)
    : { data: [] };

  return (
    <GovernancaShell perfil={perfil} papel={papel}>
      <Erro
        texto={error && erroSchemaGov(error.message, error.code) ? MIGRATION_HINT_GOV : error?.message ?? null}
      />
      <RelatorioDiario
        hoje={hoje}
        podeEnviar={inspecionaEquipe(papel)}
        relatorio={relatorio}
        uhs={[...(uhs ?? [])].sort((a, b) => compararNumeroUh(a.numero, b.numero))}
      />
    </GovernancaShell>
  );
}
