/**
 * Ciclo de vida do checklist aplicado (gov_inspecoes): status, quem pode fazer o
 * quê, duração e filtros da lista de inspeções. As mesmas regras valem no banco
 * (supabase/migrations/20261112160000_checklist_fase2.sql).
 */
import { normalizarBusca } from "@/lib/governanca";

export type StatusInspecao = "em_andamento" | "pausada" | "cancelada" | "finalizada";

export const STATUS_INSPECAO: { valor: StatusInspecao; rotulo: string }[] = [
  { valor: "em_andamento", rotulo: "Em andamento" },
  { valor: "pausada", rotulo: "Pausada" },
  { valor: "finalizada", rotulo: "Finalizada" },
  { valor: "cancelada", rotulo: "Cancelada" },
];

export function rotuloStatus(status: string) {
  return STATUS_INSPECAO.find((s) => s.valor === status)?.rotulo ?? status;
}

/** Ainda dá para responder: em andamento ou pausada. */
export function emAberto(status: string) {
  return status === "em_andamento" || status === "pausada";
}

export type AcoesInspecao = {
  continuar: boolean;
  pausar: boolean;
  cancelar: boolean;
  excluir: boolean;
};

/**
 * O que a pessoa pode fazer com o checklist aplicado. Quem aplicou continua,
 * pausa e descarta o próprio; quem cuida do setor (admin ou líder) também
 * cancela e mexe no de outra pessoa. Finalizado não muda mais.
 */
export function acoesInspecao(
  inspecao: { status: string; inspetor_id: string },
  pessoa: { id: string; cuidaDoSetor: boolean },
): AcoesInspecao {
  const dono = inspecao.inspetor_id === pessoa.id;
  const aberta = emAberto(inspecao.status);
  const mexe = aberta && (dono || pessoa.cuidaDoSetor);
  return {
    continuar: mexe,
    pausar: mexe && inspecao.status === "em_andamento",
    cancelar: aberta && pessoa.cuidaDoSetor,
    excluir: mexe || (inspecao.status === "cancelada" && pessoa.cuidaDoSetor),
  };
}

/** Minutos entre começar e finalizar (null enquanto não finaliza). */
export function duracaoMinutos(inicio: string, fim: string | null) {
  if (!fim) return null;
  return Math.max(0, (new Date(fim).getTime() - new Date(inicio).getTime()) / 60000);
}

/** Hoje (aaaa-mm-dd) no horário de Brasília. */
export function hojeEmSaoPaulo(agora = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(agora);
}

/** "12/11/2026" a partir de "2026-11-12" (sem passar por fuso). */
export function formatarDataCurta(data: string) {
  const [ano, mes, dia] = data.split("-");
  return ano && mes && dia ? `${dia}/${mes}/${ano}` : data;
}

export type LinhaInspecao = {
  id: string;
  status: string;
  dataReferencia: string;
  criadoEm: string;
  finalizadaEm: string | null;
  setorId: string | null;
  checklistId: string;
  checklist: string;
  /** Resposta da pergunta que identifica (ex.: nome do evento). */
  identificacao: string | null;
  local: string | null;
  localId: string | null;
  colaborador: string | null;
  colaboradorId: string | null;
  aplicador: string | null;
  aplicadorId: string;
};

export type FiltrosInspecao = {
  busca: string;
  status: string;
  setorId: string;
  checklistId: string;
  colaboradorId: string;
  aplicadorId: string;
  /** aaaa-mm-dd, pela data de referência. */
  de: string;
  ate: string;
};

export const FILTROS_VAZIOS: FiltrosInspecao = {
  busca: "",
  status: "",
  setorId: "",
  checklistId: "",
  colaboradorId: "",
  aplicadorId: "",
  de: "",
  ate: "",
};

export function filtrarInspecoes(lista: readonly LinhaInspecao[], f: FiltrosInspecao) {
  const q = normalizarBusca(f.busca);
  return lista.filter(
    (i) =>
      (!f.status || i.status === f.status) &&
      (!f.setorId || i.setorId === f.setorId) &&
      (!f.checklistId || i.checklistId === f.checklistId) &&
      (!f.colaboradorId || i.colaboradorId === f.colaboradorId) &&
      (!f.aplicadorId || i.aplicadorId === f.aplicadorId) &&
      (!f.de || i.dataReferencia >= f.de) &&
      (!f.ate || i.dataReferencia <= f.ate) &&
      (!q ||
        normalizarBusca([i.checklist, i.identificacao, i.local, i.colaborador, i.aplicador].filter(Boolean).join(" ")).includes(q)),
  );
}

/** Opções únicas (id + nome) para os filtros, em ordem alfabética. */
export function opcoesDistintas<T>(
  lista: readonly T[],
  id: (item: T) => string | null,
  nome: (item: T) => string | null,
) {
  const mapa = new Map<string, string>();
  for (const item of lista) {
    const chave = id(item);
    const rotulo = nome(item);
    if (chave && rotulo && !mapa.has(chave)) mapa.set(chave, rotulo);
  }
  return [...mapa.entries()]
    .map(([valor, rotulo]) => ({ valor, rotulo }))
    .sort((a, b) => a.rotulo.localeCompare(b.rotulo, "pt-BR"));
}
