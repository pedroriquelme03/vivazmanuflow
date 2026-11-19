// Só do servidor: usa a chave de serviço (nunca importar em componente "use client").
import { createServiceClient } from "@/lib/supabase/service";
import {
  URL_ATUAL_PAINEL,
  URL_HISTORICO_PAINEL,
  ocupacaoDoPainel,
  ultimaPorDia,
  type OcupacaoDia,
} from "@/lib/ocupacao-painel";

async function buscarJson(url: string) {
  const controle = new AbortController();
  const tempo = setTimeout(() => controle.abort(), 15000);
  try {
    const res = await fetch(url, { cache: "no-store", signal: controle.signal });
    if (!res.ok) throw new Error(`Painel operacional respondeu ${res.status}`);
    return (await res.json()) as unknown;
  } finally {
    clearTimeout(tempo);
  }
}

/** Lê o painel operacional e grava a ocupação de cada dia encontrado. */
export async function sincronizarOcupacao(): Promise<{ dias: OcupacaoDia[] }> {
  let dias: OcupacaoDia[] = [];
  try {
    const historico = (await buscarJson(URL_HISTORICO_PAINEL)) as { entries?: unknown };
    if (Array.isArray(historico?.entries)) dias = ultimaPorDia(historico.entries);
  } catch (e) {
    console.warn("Histórico do painel operacional indisponível; usando o painel atual.", e);
  }
  if (!dias.length) {
    const atual = ocupacaoDoPainel(await buscarJson(URL_ATUAL_PAINEL));
    if (atual) dias = [atual];
  }
  if (!dias.length) return { dias };

  const supabase = createServiceClient();
  const agora = new Date().toISOString();
  const { error } = await supabase
    .from("gov_ocupacao_diaria")
    .upsert(dias.map((d) => ({ ...d, buscado_em: agora })), { onConflict: "data" });
  if (error) throw new Error(error.message);
  return { dias };
}
