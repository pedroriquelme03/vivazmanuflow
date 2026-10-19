import { pessoaDoAmbiente, type AmbienteEquipe } from "@/lib/ambiente-equipe";

export type PessoaAviso = {
  id?: string;
  role: string;
  ambientes: readonly string[] | null;
  ativo: boolean;
};

/** Manutenção avisa quem tem esse quadro. TI avisa a equipe de TI e todo admin. */
export function recebeAvisoChamado(pessoa: PessoaAviso, quadro: AmbienteEquipe) {
  if (!pessoa.ativo) return false;
  if (
    pessoa.role !== "admin" &&
    pessoa.role !== "lider" &&
    pessoa.role !== "colaborador"
  ) {
    return false;
  }
  if (quadro === "ti" && pessoa.role === "admin") return true;
  if (quadro === "manutencao" && pessoa.role === "admin") {
    return (pessoa.ambientes ?? []).includes("manutencao");
  }
  return pessoaDoAmbiente(pessoa.ambientes, quadro);
}

/** Quem abre o chamado não recebe o aviso dele mesmo. */
export function recebeAvisoNovoChamado(
  pessoa: PessoaAviso,
  quadro: AmbienteEquipe,
  abertoPor: string | null,
) {
  if (!recebeAvisoChamado(pessoa, quadro)) return false;
  if (abertoPor && pessoa.id === abertoPor) return false;
  return true;
}

export function destinoDoAviso(role: string) {
  if (role === "colaborador") return "/colaborador";
  if (role === "solicitante") return "/solicitante?aba=chamados";
  return "/lider";
}

export function textoResposta(titulo: string, texto: string) {
  const nome = titulo.trim().slice(0, 80) || "seu chamado";
  const recado = texto.trim().slice(0, 120) || "Nova resposta da equipe.";
  return {
    titulo: `Resposta em ${nome}`,
    corpo: recado,
  };
}

export function textoAviso(quadro: AmbienteEquipe, titulo: string) {
  const nome = titulo.trim().slice(0, 120) || "Chamado novo";
  return {
    titulo: quadro === "ti" ? "Novo chamado de TI" : "Novo chamado de Manutenção",
    corpo: nome,
  };
}

export type EventoAviso =
  | {
      tipo: "chamado";
      titulo: string;
      quadro: AmbienteEquipe;
      abertoPor: string | null;
    }
  | {
      tipo: "resposta";
      demandaId: string;
      texto: string;
    };

export function eventoDoWebhook(corpo: unknown): EventoAviso | null {
  if (!corpo || typeof corpo !== "object") return null;
  const raiz = corpo as { table?: unknown; record?: unknown };
  const registro = raiz.record;
  if (!registro || typeof registro !== "object") return null;
  const linha = registro as {
    titulo?: unknown;
    ambiente?: unknown;
    aberto_por?: unknown;
    autor?: unknown;
    demanda_id?: unknown;
    texto?: unknown;
  };
  if (raiz.table === "demanda_mensagens") {
    if (linha.autor !== "equipe") return null;
    const demandaId = typeof linha.demanda_id === "string" ? linha.demanda_id : "";
    const texto = typeof linha.texto === "string" ? linha.texto : "";
    if (!demandaId || !texto.trim()) return null;
    return { tipo: "resposta", demandaId, texto };
  }
  const titulo = typeof linha.titulo === "string" ? linha.titulo : "";
  const quadro: AmbienteEquipe = linha.ambiente === "ti" ? "ti" : "manutencao";
  if (!titulo.trim()) return null;
  const abertoPor = typeof linha.aberto_por === "string" ? linha.aberto_por : null;
  return { tipo: "chamado", titulo, quadro, abertoPor };
}

export function chamadoDoWebhook(corpo: unknown): {
  titulo: string;
  quadro: AmbienteEquipe;
} | null {
  const evento = eventoDoWebhook(corpo);
  if (!evento || evento.tipo !== "chamado") return null;
  return { titulo: evento.titulo, quadro: evento.quadro };
}
