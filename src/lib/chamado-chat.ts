import type { AmbienteEquipe } from "@/lib/ambiente-equipe";
import type { Enums } from "@/lib/database.types";

export type AutorMensagem = "solicitante" | "equipe";

export type MensagemChamado = {
  id: string;
  autor: AutorMensagem;
  autor_nome: string;
  texto: string;
  criado_em: string;
};

export type ChatChamadoDados = {
  ambiente: AmbienteEquipe | null;
  status: Enums<"demanda_status"> | null;
  mensagens: MensagemChamado[];
};

const STATUS: Enums<"demanda_status">[] = [
  "aberta",
  "atribuida",
  "em_andamento",
  "aguardando_validacao",
  "concluida",
  "cancelada",
];

export function recursoChatAusente(mensagem: string) {
  const texto = mensagem.toLowerCase();
  return (
    texto.includes("listar_mensagens_chamado") ||
    texto.includes("enviar_mensagem_chamado") ||
    texto.includes("equipe_enviar_mensagem") ||
    texto.includes("solicitante_fechar_chamado") ||
    texto.includes("registrar_chamado_concluido") ||
    texto.includes("demanda_mensagens") ||
    texto.includes("schema cache") ||
    texto.includes("could not find the function")
  );
}

export function textoMensagemValido(texto: string) {
  const t = texto.trim();
  if (!t) return "Escreva a mensagem.";
  if (t.length > 2000) return "Mensagem muito longa.";
  return null;
}

export function chamadoAindaAberto(status: string | null | undefined) {
  return status !== "concluida" && status !== "cancelada";
}

/** Equipe só fala com o solicitante depois que alguém pegou / atribuiu. */
export function equipePodeMandarMensagem(
  colaboradorId: string | null | undefined,
  status: string | null | undefined,
) {
  if (!colaboradorId) return false;
  if (status === "aberta" || status === "cancelada") return false;
  return true;
}

export function juntarMensagens(
  atual: MensagemChamado[],
  novas: MensagemChamado[],
) {
  const mapa = new Map(atual.map((m) => [m.id, m]));
  for (const msg of novas) {
    if (!mapa.has(msg.id)) mapa.set(msg.id, msg);
  }
  return Array.from(mapa.values()).sort((a, b) =>
    a.criado_em.localeCompare(b.criado_em),
  );
}

export function validarFechamentoSolicitante(
  resolvido: boolean | null,
  descricao: string,
  status: string | null | undefined,
) {
  if (!chamadoAindaAberto(status)) {
    return "Este chamado já foi encerrado.";
  }
  if (resolvido === null) return "Informe se foi resolvido.";
  if (!descricao.trim()) return "Descreva o que aconteceu.";
  return null;
}

function autorDe(valor: unknown): AutorMensagem {
  return valor === "equipe" ? "equipe" : "solicitante";
}

function statusDe(valor: unknown): Enums<"demanda_status"> | null {
  return typeof valor === "string" &&
    STATUS.includes(valor as Enums<"demanda_status">)
    ? (valor as Enums<"demanda_status">)
    : null;
}

function ambienteDe(valor: unknown): AmbienteEquipe | null {
  if (valor === "ti" || valor === "manutencao") return valor;
  return null;
}

export function mensagemDe(valor: unknown): MensagemChamado | null {
  if (!valor || typeof valor !== "object") return null;
  const item = valor as Record<string, unknown>;
  if (typeof item.texto !== "string" || !item.texto.trim()) return null;
  return {
    id: typeof item.id === "string" ? item.id : String(item.criado_em ?? ""),
    autor: autorDe(item.autor),
    autor_nome:
      typeof item.autor_nome === "string" && item.autor_nome.trim()
        ? item.autor_nome
        : item.autor === "equipe"
          ? "Equipe"
          : "Solicitante",
    texto: item.texto,
    criado_em:
      typeof item.criado_em === "string"
        ? item.criado_em
        : new Date().toISOString(),
  };
}

export function parseChatChamado(raw: unknown): ChatChamadoDados {
  const base: ChatChamadoDados = {
    ambiente: null,
    status: null,
    mensagens: [],
  };
  if (!raw) return base;
  let dados: unknown = raw;
  if (typeof raw === "string") {
    try {
      dados = JSON.parse(raw) as unknown;
    } catch {
      return base;
    }
  }
  if (!dados || typeof dados !== "object") return base;
  const obj = dados as Record<string, unknown>;
  const lista = Array.isArray(obj.mensagens) ? obj.mensagens : [];
  return {
    ambiente: ambienteDe(obj.ambiente),
    status: statusDe(obj.status),
    mensagens: lista
      .map(mensagemDe)
      .filter((m): m is MensagemChamado => m !== null),
  };
}
