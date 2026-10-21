import { listaAmbientes, type AmbienteEquipe } from "@/lib/ambiente-equipe";

export type PessoaAviso = {
  id?: string;
  role: string;
  ambientes: readonly string[] | null;
  avisos?: readonly string[] | null;
  ativo: boolean;
};

function listaEscolhida(
  valor: readonly string[] | null | undefined,
): AmbienteEquipe[] {
  const lista = (valor ?? []).filter(
    (item): item is AmbienteEquipe => item === "manutencao" || item === "ti",
  );
  return Array.from(new Set(lista));
}

/**
 * Vale a escolha gravada, dentro dos painéis que a pessoa vê. Lista vazia
 * gravada é "nenhum aviso". Sem escolha: quem está em um quadro recebe dele;
 * admin e líder nos dois recebem só Manutenção.
 */
export function avisosEfetivos(pessoa: {
  role: string;
  ambientes: readonly string[] | null;
  avisos?: readonly string[] | null;
}): AmbienteEquipe[] {
  if (pessoa.avisos && pessoa.avisos.length === 0) return [];
  const visiveis = listaAmbientes(pessoa.ambientes);
  const escolhidos = listaEscolhida(pessoa.avisos).filter((item) =>
    visiveis.includes(item),
  );
  if (escolhidos.length > 0) return escolhidos;
  if (visiveis.length < 2) return visiveis;
  if (pessoa.role === "admin" || pessoa.role === "lider") return ["manutencao"];
  return visiveis;
}

export function rotuloAvisos(avisos: readonly AmbienteEquipe[]) {
  if (avisos.length === 0) return "nenhum";
  return avisos.map((a) => (a === "ti" ? "TI" : "Manutenção")).join(" e ");
}

export function mesmosAvisos(
  a: readonly string[],
  b: readonly string[],
) {
  return [...a].sort().join(",") === [...b].sort().join(",");
}

/** O aviso segue a equipe escolhida, dentro dos painéis que a pessoa vê. */
export function recebeAvisoChamado(pessoa: PessoaAviso, quadro: AmbienteEquipe) {
  if (!pessoa.ativo) return false;
  if (
    pessoa.role !== "admin" &&
    pessoa.role !== "lider" &&
    pessoa.role !== "colaborador"
  ) {
    return false;
  }
  return avisosEfetivos(pessoa).includes(quadro);
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

/** Ponto P-256 sem compressão, que é o formato que o navegador aceita. */
export function chavePublicaEmBytes(base64: string): Uint8Array<ArrayBuffer> | null {
  try {
    const limpa = base64.trim();
    if (!limpa) return null;
    const pad = "=".repeat((4 - (limpa.length % 4)) % 4);
    const normal = (limpa + pad).replace(/-/g, "+").replace(/_/g, "/");
    const bruto = atob(normal);
    const bytes = new Uint8Array(new ArrayBuffer(bruto.length));
    for (let i = 0; i < bruto.length; i += 1) bytes[i] = bruto.charCodeAt(i);
    if (bytes.length !== 65 || bytes[0] !== 4) return null;
    return bytes;
  } catch {
    return null;
  }
}

/**
 * O navegador não conseguiu falar com o serviço de push (FCM, Mozilla ou Apple).
 * A tela segue normal; a inscrição é tentada de novo no próximo acesso.
 */
export function falhaDoServicoPush(erro: unknown) {
  const mensagem =
    typeof erro === "string"
      ? erro
      : erro && typeof erro === "object"
        ? `${"name" in erro ? String(erro.name) : ""}: ${"message" in erro ? String(erro.message) : ""}`
        : "";
  return /push service error|push service not available/i.test(mensagem);
}

type AssinaturaPush = {
  toJSON(): {
    endpoint?: string;
    keys?: { p256dh?: string; auth?: string };
  };
};

/** Reaproveita a inscrição atual. Se o serviço falhar, tenta uma vez mais. */
export async function inscreverNoPush<T extends AssinaturaPush>(
  push: {
    getSubscription(): Promise<T | null>;
    subscribe(opcoes: PushSubscriptionOptionsInit): Promise<T>;
  },
  chave: NonNullable<PushSubscriptionOptionsInit["applicationServerKey"]>,
): Promise<T | null> {
  const lerAtual = async () => {
    try {
      return await push.getSubscription();
    } catch (erro) {
      if (!falhaDoServicoPush(erro)) throw erro;
      return null;
    }
  };
  const atual = await lerAtual();
  if (atual) return atual;
  const opcoes: PushSubscriptionOptionsInit = {
    userVisibleOnly: true,
    applicationServerKey: chave,
  };
  try {
    return await push.subscribe(opcoes);
  } catch (erro) {
    if (!falhaDoServicoPush(erro)) throw erro;
  }
  const depois = await lerAtual();
  if (depois) return depois;
  try {
    return await push.subscribe(opcoes);
  } catch (erro) {
    if (!falhaDoServicoPush(erro)) throw erro;
    return null;
  }
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
