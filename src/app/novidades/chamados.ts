import { createClient } from "@/lib/supabase/server";
import type { ChamadoResumo } from "./Comuns";

/** Últimos chamados da Manutenção, para escolher em OS e relatório. */
export async function chamadosRecentes(limite = 400): Promise<ChamadoResumo[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("demandas")
    .select("id, titulo, status, criado_em, local:locais(nome), sublocal")
    .eq("ambiente", "manutencao")
    .eq("arquivado", false)
    .order("criado_em", { ascending: false })
    .limit(limite);
  return (data ?? []).map((d) => ({
    id: d.id,
    titulo: d.titulo,
    status: d.status,
    criado_em: d.criado_em,
    local: [(d.local as { nome: string } | null)?.nome, d.sublocal].filter(Boolean).join(" · ") || null,
  }));
}

export const CHAMADO_COMPLETO = `
  id, titulo, descricao, prioridade, status, criado_em, atribuido_em, iniciado_em,
  concluido_em, prazo_confirmado, prazo_sugerido, motivo_nao_conclusao, mensagem_devolucao,
  sublocal, preventiva_id,
  solicitante:solicitantes(nome),
  local:locais(nome),
  propriedade:propriedades(nome),
  colaborador:usuarios!demandas_colaborador_id_fkey(nome),
  preventiva:preventivas(titulo, descricao),
  anexos:demanda_anexos(url, tipo, enviado_por, criado_em),
  historico:demanda_historico(status_anterior, status_novo, observacao, criado_em, usuario:usuarios(nome))
`;

type Nome = { nome: string } | null;

export type ChamadoCompleto = {
  id: string;
  titulo: string;
  descricao: string | null;
  prioridade: "alta" | "media" | "baixa";
  status: ChamadoResumo["status"];
  criado_em: string;
  atribuido_em: string | null;
  iniciado_em: string | null;
  concluido_em: string | null;
  prazo_confirmado: string | null;
  prazo_sugerido: string | null;
  motivo_nao_conclusao: string | null;
  mensagem_devolucao: string | null;
  sublocal: string | null;
  preventiva_id: string | null;
  solicitante: Nome;
  local: Nome;
  propriedade: Nome;
  colaborador: Nome;
  preventiva: { titulo: string; descricao: string | null } | null;
  anexos: { url: string; tipo: "foto" | "video"; enviado_por: string; criado_em: string }[];
  historico: {
    status_anterior: string | null;
    status_novo: string;
    observacao: string | null;
    criado_em: string;
    usuario: Nome;
  }[];
};
