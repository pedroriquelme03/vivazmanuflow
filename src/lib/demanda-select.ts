import type { Enums } from "@/lib/database.types";

/** Colunas + embeds usados no kanban do líder (server e client). */
export const DEMANDA_SELECT = `
  id, titulo, descricao, prioridade, status, criado_em, atribuido_em,
  iniciado_em, concluido_em, prazo_confirmado, colaborador_id,
  propriedade_id, motivo_nao_conclusao,
  solicitante:solicitantes(nome),
  local:locais(nome),
  propriedade:propriedades(nome),
  colaborador:usuarios(nome)
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
  solicitante: Rel;
  local: Rel;
  propriedade: Rel;
  colaborador: Rel;
};

/** Select do painel do colaborador (inclui anexos para foto de referência). */
export const COLAB_SELECT = `
  id, titulo, descricao, prioridade, status, prazo_confirmado,
  atribuido_em, iniciado_em,
  local:locais(nome),
  solicitante:solicitantes(nome),
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
  local: Rel;
  solicitante: Rel;
  anexos: AnexoDemanda[];
};
