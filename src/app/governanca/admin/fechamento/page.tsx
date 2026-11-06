import { createClient } from "@/lib/supabase/server";
import { exigirGovernanca } from "@/lib/governanca-acesso";
import { MIGRATION_HINT_GOV, erroSchemaGov, fechamentoMensal } from "@/lib/governanca";
import { GovernancaShell } from "../../GovernancaShell";
import { Erro, Titulo } from "../../ui";
import { FechamentoMes } from "./FechamentoMes";

export const dynamic = "force-dynamic";

const RE_MES = /^\d{4}-(0[1-9]|1[0-2])$/;

/** Mês atual em Foz do Iguaçu, "aaaa-mm". */
function mesAtual() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date()).slice(0, 7);
}

/** Primeiro instante do mês e do mês seguinte, no horário de Brasília. */
function limitesDoMes(mes: string) {
  const [ano, m] = mes.split("-").map(Number);
  const seguinte = m === 12 ? `${ano + 1}-01` : `${ano}-${String(m + 1).padStart(2, "0")}`;
  return { inicio: `${mes}-01T00:00:00-03:00`, fim: `${seguinte}-01T00:00:00-03:00` };
}

export default async function FechamentoPage({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string }>;
}) {
  const { perfil, papel } = await exigirGovernanca("/governanca/admin/fechamento", true);
  const { mes: bruto } = await searchParams;
  const mes = bruto && RE_MES.test(bruto) ? bruto : mesAtual();
  const { inicio, fim } = limitesDoMes(mes);

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("gov_inspecoes")
    .select("id, gov_camareiras(nome), gov_respostas(resposta)")
    .eq("status", "finalizada")
    .not("camareira_id", "is", null)
    .gte("finalizada_em", inicio)
    .lt("finalizada_em", fim);

  const linhas = fechamentoMensal(
    (data ?? []).map((i) => ({
      camareira: i.gov_camareiras?.nome ?? "Sem camareira",
      sim: i.gov_respostas.filter((r) => r.resposta === "sim").length,
      nao: i.gov_respostas.filter((r) => r.resposta === "nao").length,
    })),
  );

  return (
    <GovernancaShell perfil={perfil} papel={papel}>
      <Titulo
        titulo="Fechamento do mês"
        subtitulo="Nota de cada camareira no mês para a planilha de produtividade do RH."
      />
      <Erro
        texto={error && erroSchemaGov(error.message, error.code) ? MIGRATION_HINT_GOV : error?.message ?? null}
      />
      <FechamentoMes mes={mes} linhas={linhas} />
    </GovernancaShell>
  );
}
