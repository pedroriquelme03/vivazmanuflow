import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import {
  type ChamadoPendente,
  SemConexao,
  enviarChamado,
} from "@/lib/envio-chamado";

/**
 * Caixa de saída dos chamados abertos sem internet. Fica no IndexedDB porque
 * o localStorage não guarda foto nem vídeo.
 */

const BANCO = "vivaz-fila";
const TABELA = "chamados";
const eventos = new EventTarget();

let enviandoAgora: string | null = null;
let rodando: Promise<number> | null = null;
let banco: Promise<IDBDatabase> | null = null;

export function filaDisponivel() {
  return typeof indexedDB !== "undefined";
}

/** Abre o banco uma vez e reaproveita a conexão. */
function abrirBanco(): Promise<IDBDatabase> {
  banco ??= new Promise<IDBDatabase>((resolve, reject) => {
    const pedido = indexedDB.open(BANCO, 1);
    pedido.onupgradeneeded = () => {
      pedido.result.createObjectStore(TABELA, { keyPath: "chave" });
    };
    pedido.onsuccess = () => {
      const conexao = pedido.result;
      // Se o navegador fechar a conexão, a próxima operação abre outra.
      conexao.onclose = () => (banco = null);
      conexao.onversionchange = () => {
        conexao.close();
        banco = null;
      };
      resolve(conexao);
    };
    pedido.onerror = () => reject(pedido.error);
  }).catch((erro) => {
    banco = null;
    throw erro;
  });
  return banco;
}

async function usarTabela<T>(
  modo: IDBTransactionMode,
  acao: (tabela: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  const conexao = await abrirBanco();
  return new Promise<T>((resolve, reject) => {
    const transacao = conexao.transaction(TABELA, modo);
    const pedido = acao(transacao.objectStore(TABELA));
    transacao.oncomplete = () => resolve(pedido.result);
    transacao.onerror = () => reject(transacao.error);
    transacao.onabort = () => reject(transacao.error);
  });
}

function avisarMudanca() {
  eventos.dispatchEvent(new Event("mudou"));
}

/** Chama `ouvinte` sempre que a fila muda. Devolve a função para parar. */
export function aoMudarFila(ouvinte: () => void) {
  eventos.addEventListener("mudou", ouvinte);
  return () => eventos.removeEventListener("mudou", ouvinte);
}

/** Avisa quando um chamado da fila chega ao servidor. */
export function aoEnviarDaFila(ouvinte: (titulo: string) => void) {
  const handler = (e: Event) => ouvinte((e as CustomEvent<string>).detail);
  eventos.addEventListener("enviado", handler);
  return () => eventos.removeEventListener("enviado", handler);
}

export function chaveEnviandoAgora() {
  return enviandoAgora;
}

/** Usuário logado neste aparelho. Lê a sessão salva, funciona sem internet. */
export async function donoAtual(
  supabase: SupabaseClient<Database>,
): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.user.id ?? null;
}

/**
 * Só os chamados de quem está logado: no celular compartilhado, o chamado de
 * uma pessoa não sobe no nome de outra. Sem ninguém logado, nenhum.
 * Itens antigos, sem dono gravado, seguem com quem estiver logado.
 */
export function itensDaPessoa(
  itens: ChamadoPendente[],
  dono: string | null,
): ChamadoPendente[] {
  if (!dono) return [];
  return itens.filter((item) => !item.donoId || item.donoId === dono);
}

/** Fila do usuário `dono`, do mais antigo para o mais novo. */
export async function listarFila(dono: string | null): Promise<ChamadoPendente[]> {
  if (!filaDisponivel()) return [];
  const itens = await usarTabela("readonly", (t) =>
    t.getAll() as IDBRequest<ChamadoPendente[]>,
  );
  return itensDaPessoa(itens, dono).sort((a, b) =>
    a.criadoEm.localeCompare(b.criadoEm),
  );
}

export async function guardarNaFila(item: ChamadoPendente) {
  await usarTabela("readwrite", (t) => t.put(item));
  avisarMudanca();
}

/** Progresso do envio: a tela não mostra, então não precisa avisar. */
async function guardarProgresso(item: ChamadoPendente) {
  await usarTabela("readwrite", (t) => t.put(item));
}

export async function removerDaFila(chave: string) {
  await usarTabela("readwrite", (t) => t.delete(chave));
  avisarMudanca();
}

async function enviarTudo(supabase: SupabaseClient<Database>) {
  let enviados = 0;
  for (const item of await listarFila(await donoAtual(supabase))) {
    enviandoAgora = item.chave;
    avisarMudanca();
    try {
      await enviarChamado(supabase, item, guardarProgresso);
      await removerDaFila(item.chave);
      eventos.dispatchEvent(new CustomEvent("enviado", { detail: item.titulo }));
      enviados++;
    } catch (erro) {
      if (erro instanceof SemConexao) break;
      item.ultimoErro = erro instanceof Error ? erro.message : "Erro inesperado.";
      await guardarNaFila(item);
    }
  }
  return enviados;
}

/**
 * Envia a fila, um chamado por vez. Chamadas ao mesmo tempo esperam a mesma
 * rodada; entre abas, o Web Locks evita duas rodadas juntas.
 */
export function processarFila(supabase: SupabaseClient<Database>) {
  if (!filaDisponivel() || navigator.onLine === false) return Promise.resolve(0);
  rodando ??= (async () => {
    try {
      if (typeof navigator !== "undefined" && navigator.locks) {
        return await navigator.locks.request(BANCO, () => enviarTudo(supabase));
      }
      return await enviarTudo(supabase);
    } finally {
      enviandoAgora = null;
      rodando = null;
      avisarMudanca();
    }
  })();
  return rodando;
}
