import type { SupabaseClient } from "@supabase/supabase-js";

function msgSqlFaltando(erro: string, dica: string): string {
  if (
    erro.includes("schema cache") ||
    erro.includes("Could not find")
  ) {
    return dica;
  }
  return erro;
}

export async function aprovarConclusaoGestor(
  supabase: SupabaseClient,
  demandaId: string,
): Promise<string | null> {
  const { error } = await supabase
    .from("demandas")
    .update({
      status: "concluida",
      concluido_em: new Date().toISOString(),
    })
    .eq("id", demandaId);
  if (error) return error.message;

  await supabase.from("demanda_historico").insert({
    demanda_id: demandaId,
    status_anterior: "aguardando_validacao",
    status_novo: "concluida",
    observacao: "Gestor aprovou a conclusão",
  });
  return null;
}

export async function devolverDemandaGestor(
  supabase: SupabaseClient,
  demandaId: string,
  mensagem: string,
): Promise<string | null> {
  const texto = mensagem.trim();
  if (!texto) return "Escreva o motivo da devolução.";

  const { error } = await supabase
    .from("demandas")
    .update({
      status: "em_andamento",
      concluido_em: null,
    })
    .eq("id", demandaId);
  if (error) return error.message;

  await supabase.from("demanda_historico").insert({
    demanda_id: demandaId,
    status_anterior: "aguardando_validacao",
    status_novo: "em_andamento",
    observacao: `Devolução do gestor: ${texto}`,
  });
  return null;
}

export async function arquivarDemandaGestor(
  supabase: SupabaseClient,
  demandaId: string,
  arquivado: boolean,
): Promise<string | null> {
  const { error } = await supabase
    .from("demandas")
    .update({ arquivado })
    .eq("id", demandaId);
  if (error) {
    return msgSqlFaltando(
      error.message,
      "Rode o SQL em supabase/migrations/20260813190000_demandas_arquivar_apagar.sql no Supabase.",
    );
  }
  return null;
}

export async function apagarDemandaGestor(
  supabase: SupabaseClient,
  demandaId: string,
): Promise<string | null> {
  const { error } = await supabase.rpc("apagar_demanda", { p_id: demandaId });
  if (error) {
    return msgSqlFaltando(
      error.message,
      "Rode o SQL em supabase/migrations/20260813190000_demandas_arquivar_apagar.sql no Supabase.",
    );
  }
  return null;
}
