import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { recursoAmbienteAusente } from "@/lib/ambiente-equipe";
import { comprimirImagem } from "@/lib/comprimir-imagem";
import { uploadAnexo } from "@/lib/upload-anexo";

type Supabase = SupabaseClient<Database>;
type TipoAnexo = "foto" | "video" | "documento";
type ErroSupabase = { message: string } | null;

export type ArquivoPendente = {
  blob: Blob;
  tipo: TipoAnexo;
  contentType: string;
  extensao: string;
};

type Passo = "ambiente" | "local" | "experiencia" | "evento" | "projeto";

/**
 * Tudo o que é preciso para abrir o chamado, já validado no formulário.
 * Os campos de progresso fazem um reenvio continuar de onde parou.
 */
export type ChamadoPendente = {
  chave: string;
  criadoEm: string;
  ambiente: "manutencao" | "ti";
  quemSolicita: string;
  titulo: string;
  descricao: string;
  sublocal: string;
  /** Vazio = não é de um sistema. */
  sistemaId: string;
  eventoId: string;
  /** Já resolvido por idProjetoParaVincular. Vazio = sem projeto. */
  projetoId: string;
  afetaExperiencia: boolean;
  arquivos: ArquivoPendente[];
  anexos: { url: string; tipo: TipoAnexo }[];
  demandaId?: string;
  token?: string;
  passosFeitos: Passo[];
  ultimoErro?: string;
};

/** Sem internet, sinal ruim ou servidor que não respondeu a tempo. */
export class SemConexao extends Error {
  constructor() {
    super("Sem conexão com a internet. Tente de novo quando o sinal voltar.");
    this.name = "SemConexao";
  }
}

const TEXTO_FALHA_REDE =
  /failed to fetch|load failed|networkerror|network request failed|fetch failed|err_internet|err_network/i;

export function ehFalhaDeRede(erro: unknown): boolean {
  if (erro instanceof SemConexao) return true;
  const mensagem =
    erro instanceof Error ? erro.message : typeof erro === "string" ? erro : "";
  return TEXTO_FALHA_REDE.test(mensagem);
}

/** O banco ainda não tem a função (falta rodar a migration). */
export function funcaoAusente(mensagem: string) {
  return (
    mensagem.includes("schema cache") || mensagem.includes("Could not find")
  );
}

const PRAZO_RPC_MS = 25_000;
const PRAZO_UPLOAD_MS = 90_000;

function comPrazo<T>(promessa: PromiseLike<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new SemConexao()), ms);
    Promise.resolve(promessa).then(
      (valor) => {
        clearTimeout(timer);
        resolve(valor);
      },
      (erro) => {
        clearTimeout(timer);
        reject(ehFalhaDeRede(erro) ? new SemConexao() : erro);
      },
    );
  });
}

/**
 * Chamada ao banco com prazo. Erro de rede vira SemConexao; o resto lança
 * `mensagem` (ou a do banco), ou só avisa no console quando `aviso` vem.
 */
async function chamar<T extends { error: ErroSupabase }>(
  promessa: PromiseLike<T>,
  { mensagem, aviso }: { mensagem?: (erro: string) => string; aviso?: string } = {},
): Promise<T> {
  const resposta = await comPrazo(promessa, PRAZO_RPC_MS);
  const erro = resposta.error?.message;
  if (erro === undefined) return resposta;
  if (ehFalhaDeRede(erro)) throw new SemConexao();
  if (aviso) {
    console.warn(aviso, erro);
    return resposta;
  }
  throw new Error(mensagem ? mensagem(erro) : erro);
}

/** Comprime fotos e define o tipo de cada arquivo. Funciona sem internet. */
export async function prepararArquivos(
  arquivos: File[],
): Promise<ArquivoPendente[]> {
  const prontos: ArquivoPendente[] = [];
  for (const original of arquivos) {
    if (original.type === "application/pdf") {
      prontos.push({
        blob: original,
        tipo: "documento",
        contentType: "application/pdf",
        extensao: "pdf",
      });
      continue;
    }
    const arquivo = await comprimirImagem(original);
    const ehVideo = arquivo.type.startsWith("video/");
    prontos.push({
      blob: arquivo,
      tipo: ehVideo ? "video" : "foto",
      contentType: ehVideo ? arquivo.type || "video/mp4" : "image/jpeg",
      extensao: ehVideo ? "mp4" : "jpg",
    });
  }
  return prontos;
}

/**
 * Sobe os anexos que ainda faltam. O caminho é fixo por chamado, então um
 * reenvio não duplica o arquivo.
 */
async function enviarAnexos(
  supabase: Supabase,
  item: ChamadoPendente,
  aoAvancar?: (item: ChamadoPendente) => unknown,
) {
  for (let i = item.anexos.length; i < item.arquivos.length; i++) {
    const arquivo = item.arquivos[i];
    const caminho = `abertura/${item.chave}-${i}.${arquivo.extensao}`;
    const { error } = await comPrazo(
      uploadAnexo(supabase, caminho, arquivo.blob, arquivo.contentType),
      PRAZO_UPLOAD_MS,
    );
    if (error && !/already exists|duplicate/i.test(error.message)) {
      if (ehFalhaDeRede(error.message)) throw new SemConexao();
      if (
        arquivo.tipo === "documento" &&
        error.message.toLowerCase().includes("mime")
      ) {
        throw new Error(
          "O armazenamento ainda não aceita PDF. Rode o SQL em supabase/migrations/20261021140100_anexo_documento.sql no Supabase.",
        );
      }
      throw new Error(`Falha ao enviar o anexo: ${error.message}`);
    }
    const { data } = supabase.storage.from("anexos").getPublicUrl(caminho);
    item.anexos.push({ url: data.publicUrl, tipo: arquivo.tipo });
    await aoAvancar?.(item);
  }
}

function prioridade(item: ChamadoPendente) {
  return item.afetaExperiencia ? ("alta" as const) : ("media" as const);
}

function primeiraLinha<T extends { token: string }>(data: T[] | null) {
  const linha = data?.[0];
  if (!linha?.token) throw new Error("Não foi possível gerar o acompanhamento.");
  return linha;
}

async function criarDemanda(supabase: Supabase, item: ChamadoPendente) {
  const params = {
    p_solicitante_id: item.quemSolicita,
    p_titulo: item.titulo,
    p_descricao: item.descricao || undefined,
    p_prioridade: prioridade(item),
    p_anexos: item.anexos,
  };
  const comChave = await comPrazo(
    supabase.rpc("abrir_demanda_com_chave", { p_chave: item.chave, ...params }),
    PRAZO_RPC_MS,
  );
  // Banco sem a migration da chave: abre do jeito antigo.
  const resposta =
    comChave.error && funcaoAusente(comChave.error.message)
      ? await chamar(supabase.rpc("abrir_demanda", params))
      : await chamar(Promise.resolve(comChave));
  return primeiraLinha(resposta.data);
}

async function marcarAmbienteTi(supabase: Supabase, demandaId: string) {
  const { error } = await comPrazo(
    supabase.rpc("marcar_ambiente_demanda", {
      p_demanda_id: demandaId,
      p_ambiente: "ti",
    }),
    PRAZO_RPC_MS,
  );
  if (!error) return;
  if (ehFalhaDeRede(error.message)) throw new SemConexao();
  if (!recursoAmbienteAusente(error.message)) throw new Error(error.message);
  await chamar(
    supabase
      .from("demandas")
      .update({
        ambiente: "ti",
        colaborador_id: null,
        status: "aberta",
        atribuido_em: null,
      })
      .eq("id", demandaId),
    {
      mensagem: () =>
        "Chamado criado, mas não foi para o quadro de TI. Rode o SQL marcar_ambiente_demanda no Supabase e tente de novo.",
    },
  );
}

function gravarLocal(supabase: Supabase, item: ChamadoPendente, token: string) {
  if (item.sistemaId) {
    return chamar(
      supabase.rpc("definir_sistema_demanda", {
        p_token: token,
        p_sistema_id: item.sistemaId,
      }),
      {
        mensagem: (erro) =>
          funcaoAusente(erro)
            ? "Chamado criado, mas o sistema não gravou. Rode o SQL em supabase/migrations/20261009140000_sistemas_ti.sql no Supabase."
            : erro,
      },
    );
  }
  return chamar(
    supabase.rpc("definir_sublocal", {
      p_token: token,
      p_sublocal: item.sublocal,
    }),
    {
      mensagem: () =>
        "Chamado criado, mas o local não gravou. Rode o SQL do sublocal no Supabase (definir_sublocal) e tente de novo.",
    },
  );
}

/**
 * Abre o chamado na fila. Cada passo concluído fica salvo no item, e
 * `aoAvancar` recebe o item para guardar o progresso. Lança SemConexao
 * quando a internet falha no meio.
 */
export async function enviarChamado(
  supabase: Supabase,
  item: ChamadoPendente,
  aoAvancar?: (item: ChamadoPendente) => unknown,
): Promise<string> {
  await enviarAnexos(supabase, item, aoAvancar);

  if (!item.token) {
    const { token, demanda_id } = await criarDemanda(supabase, item);
    item.token = token;
    item.demandaId = demanda_id;
    await aoAvancar?.(item);
  }
  const token = item.token;
  const demandaId = item.demandaId;

  async function passo(nome: Passo, precisa: unknown, executar: () => Promise<unknown>) {
    if (!precisa || item.passosFeitos.includes(nome)) return;
    await executar();
    item.passosFeitos.push(nome);
    await aoAvancar?.(item);
  }

  await passo("ambiente", item.ambiente === "ti" && demandaId, () =>
    marcarAmbienteTi(supabase, demandaId!),
  );
  await passo("local", true, () => gravarLocal(supabase, item, token));
  await passo("experiencia", item.afetaExperiencia, () =>
    chamar(
      supabase.rpc("aplicar_experiencia_hospede", { p_token: token, p_afeta: true }),
      { aviso: "Falha ao aplicar peso de experiência:" },
    ),
  );
  await passo("evento", item.eventoId, () =>
    chamar(
      supabase.rpc("vincular_evento_demanda", {
        p_token: token,
        p_evento_id: item.eventoId,
      }),
      { aviso: "Falha ao vincular evento:" },
    ),
  );
  await passo("projeto", item.projetoId, () =>
    chamar(
      supabase.rpc("vincular_projeto_demanda", {
        p_token: token,
        p_projeto_id: item.projetoId,
      }),
      { mensagem: (erro) => `Demanda criada, mas o projeto não gravou: ${erro}` },
    ),
  );

  return token;
}

/** Kanban "Registrar como concluído": grava direto em Concluídas, sem fila. */
export async function registrarConcluido(
  supabase: Supabase,
  item: ChamadoPendente,
): Promise<string> {
  await enviarAnexos(supabase, item);
  const descricao = item.descricao.trim();
  const { data } = await chamar(
    supabase.rpc("registrar_chamado_concluido", {
      p_solicitante_id: item.quemSolicita,
      p_titulo: item.titulo,
      p_sublocal: item.sublocal,
      p_descricao: descricao,
      p_prioridade: prioridade(item),
      p_ambiente: item.ambiente,
      p_anexos: item.anexos,
      p_observacao: descricao,
      p_sistema_id: item.sistemaId || undefined,
    }),
    {
      mensagem: (erro) =>
        funcaoAusente(erro) || erro.includes("p_sistema_id")
          ? "Rode o SQL em supabase/migrations/20261009140000_sistemas_ti.sql no Supabase e tente de novo."
          : erro,
    },
  );
  return primeiraLinha(data).token;
}
