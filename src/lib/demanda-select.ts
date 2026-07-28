import type { Enums } from "@/lib/database.types";

/** Colunas + embeds usados no kanban do líder (server e client). */
export const DEMANDA_SELECT = `
  id, titulo, descricao, prioridade, status, criado_em, atribuido_em,
  iniciado_em, concluido_em, prazo_confirmado, colaborador_id,
  propriedade_id, motivo_nao_conclusao, peso, afeta_experiencia, evento_id,
  solicitante:solicitantes(nome),
  local:locais(nome),
  propriedade:propriedades(nome),
  colaborador:usuarios(nome),
  evento:eventos(nome)
`;

type Rel = { nome: string } | null;

export type DemandaKanban = {
  id: string;
  titulo: string;
  descricao: string | null;
  prioridade: Enums<"demanda_prioridade">;
  status: Enums<"demanda_status">;
  criado_em: string;
  atribuido_em: string | null;
  iniciado_em: string | null;
  concluido_em: string | null;
  prazo_confirmado: string | null;
  colaborador_id: string | null;
  propriedade_id: string;
  motivo_nao_conclusao: string | null;
  peso: number;
  afeta_experiencia: boolean;
  evento_id: string | null;
  solicitante: Rel;
  local: Rel;
  propriedade: Rel;
  colaborador: Rel;
  evento: Rel;
};

/** Select do painel do colaborador (inclui anexos para foto de referência). */
export const COLAB_SELECT = `
  id, titulo, descricao, prioridade, status, prazo_confirmado,
  atribuido_em, iniciado_em, criado_em, peso, afeta_experiencia, evento_id,
  local:locais(nome),
  solicitante:solicitantes(nome),
  evento:eventos(nome),
  anexos:demanda_anexos(url, tipo, enviado_por)
`;

export type AnexoDemanda = {
  url: string;
  tipo: Enums<"anexo_tipo">;
  enviado_por: Enums<"anexo_autor">;
};

export type DemandaColab = {
  id: string;
  titulo: string;
  descricao: string | null;
  prioridade: Enums<"demanda_prioridade">;
  status: Enums<"demanda_status">;
  prazo_confirmado: string | null;
  atribuido_em: string | null;
  iniciado_em: string | null;
  criado_em: string;
  peso: number;
  afeta_experiencia: boolean;
  evento_id: string | null;
  local: Rel;
  solicitante: Rel;
  evento: Rel;
  anexos: AnexoDemanda[];
};

/** Demandas abertas sem colaborador (pool geral). */
export const GERAIS_SELECT = `
  id, titulo, descricao, prioridade, status, prazo_confirmado,
  atribuido_em, iniciado_em, criado_em, peso, afeta_experiencia, evento_id,
  local:locais(nome),
  solicitante:solicitantes(nome),
  evento:eventos(nome)
`;

export type DemandaGeral = Omit<DemandaColab, "anexos">;

/** Ordena a fila: maior peso primeiro; empate → mais antiga primeiro. */
export function ordenarFilaPorPeso<
  T extends { peso?: number | null; criado_em?: string | null },
>(itens: T[]): T[] {
  return [...itens].sort((a, b) => {
    const pa = a.peso ?? 0;
    const pb = b.peso ?? 0;
    if (pb !== pa) return pb - pa;
    const ca = a.criado_em ? new Date(a.criado_em).getTime() : 0;
    const cb = b.criado_em ? new Date(b.criado_em).getTime() : 0;
    return ca - cb;
  });
}
