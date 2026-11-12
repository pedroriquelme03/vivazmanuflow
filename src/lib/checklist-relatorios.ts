/**
 * Relatórios do checklist: filtros (período, setor, checklist, colaborador,
 * quem aplicou, status) e as métricas por colaborador, por quem aplica, por
 * checklist e por dia, além dos checklists em aberto e há quanto tempo.
 */
import { conformidade, media, minutosEntre } from "./governanca";

export type FiltrosRelatorio = {
  /** aaaa-mm-dd; vazio = sem limite. Filtra pela data do checklist. */
  de: string;
  ate: string;
  setor: string;
  checklist: string;
  colaborador: string;
  aplicador: string;
  status: string;
};

const CAMPOS: (keyof FiltrosRelatorio)[] = ["de", "ate", "setor", "checklist", "colaborador", "aplicador", "status"];
const DATA = /^\d{4}-\d{2}-\d{2}$/;
const STATUS = ["finalizada", "em_andamento", "pausada", "cancelada"];

export function somarDias(data: string, dias: number) {
  const d = new Date(`${data}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}

/** Botões rápidos de período: hoje, 7, 30, 90 dias e tudo. */
export function atalhosPeriodo(hoje: string) {
  return [
    { id: "hoje", rotulo: "Hoje", de: hoje, ate: hoje },
    { id: "7", rotulo: "7 dias", de: somarDias(hoje, -6), ate: hoje },
    { id: "30", rotulo: "30 dias", de: somarDias(hoje, -29), ate: hoje },
    { id: "90", rotulo: "90 dias", de: somarDias(hoje, -89), ate: hoje },
    { id: "tudo", rotulo: "Tudo", de: "", ate: "" },
  ];
}

/**
 * Lê os filtros da URL. Sem "de"/"ate" na URL, abre nos últimos 30 dias; com
 * eles vazios, é o período todo. Valores estranhos são ignorados.
 */
export function lerFiltrosRelatorio(params: Partial<Record<string, string | undefined>>, hoje: string): FiltrosRelatorio {
  const texto = (v: string | undefined) => (typeof v === "string" ? v.trim() : "");
  const data = (v: string | undefined, padrao: string) => (v === undefined ? padrao : DATA.test(texto(v)) ? texto(v) : "");
  let de = data(params.de, somarDias(hoje, -29));
  let ate = data(params.ate, hoje);
  if (de && ate && de > ate) [de, ate] = [ate, de];
  const status = texto(params.status);
  return {
    de,
    ate,
    setor: texto(params.setor),
    checklist: texto(params.checklist),
    colaborador: texto(params.colaborador),
    aplicador: texto(params.aplicador),
    status: STATUS.includes(status) ? status : "",
  };
}

/** Link do relatório com os filtros atuais trocando só o que mudou. */
export function linkRelatorio(f: FiltrosRelatorio, mudar: Partial<FiltrosRelatorio> = {}) {
  const novo = { ...f, ...mudar };
  const busca = new URLSearchParams();
  for (const campo of CAMPOS) {
    // de/ate sempre vão (vazio = tudo); os outros só quando têm valor.
    if (campo === "de" || campo === "ate" || novo[campo]) busca.set(campo, novo[campo]);
  }
  return `/governanca/admin/relatorios?${busca.toString()}`;
}

export function atalhoAtivo(f: FiltrosRelatorio, hoje: string) {
  return atalhosPeriodo(hoje).find((a) => a.de === f.de && a.ate === f.ate)?.id ?? null;
}

export type InspecaoRelatorio = {
  id: string;
  status: string;
  criadoEm: string;
  finalizadaEm: string | null;
  dataReferencia: string;
  checklistId: string;
  checklist: string;
  setorId: string | null;
  colaboradorId: string | null;
  colaborador: string | null;
  aplicadorId: string;
  aplicador: string | null;
  local: string | null;
  sim: number;
  nao: number;
  planos: number;
};

export function filtrarRelatorio(lista: readonly InspecaoRelatorio[], f: FiltrosRelatorio) {
  return lista.filter(
    (i) =>
      (!f.de || i.dataReferencia >= f.de) &&
      (!f.ate || i.dataReferencia <= f.ate) &&
      (!f.setor || i.setorId === f.setor) &&
      (!f.checklist || i.checklistId === f.checklist) &&
      (!f.colaborador || i.colaboradorId === f.colaborador) &&
      (!f.aplicador || i.aplicadorId === f.aplicador) &&
      (!f.status || i.status === f.status),
  );
}

const emAberto = (i: InspecaoRelatorio) => i.status === "em_andamento" || i.status === "pausada";
const tempoDeExecucao = (i: InspecaoRelatorio) =>
  i.status === "finalizada" && i.finalizadaEm ? minutosEntre(i.criadoEm, i.finalizadaEm) : null;

export type LinhaResumo = {
  id: string;
  nome: string;
  finalizadas: number;
  abertas: number;
  sim: number;
  nao: number;
  planos: number;
  conformidade: number | null;
  tempoMedio: number | null;
  ultima: string | null;
};

/** Agrupa por colaborador avaliado, por quem aplicou ou por checklist. */
export function resumoPor(
  lista: readonly InspecaoRelatorio[],
  chave: (i: InspecaoRelatorio) => { id: string | null; nome: string | null },
  semNome: string,
): LinhaResumo[] {
  const mapa = new Map<string, LinhaResumo & { tempos: number[] }>();
  for (const i of lista) {
    if (i.status === "cancelada") continue;
    const { id, nome } = chave(i);
    const k = id ?? "";
    const linha =
      mapa.get(k) ??
      { id: k, nome: nome ?? semNome, finalizadas: 0, abertas: 0, sim: 0, nao: 0, planos: 0, conformidade: null, tempoMedio: null, ultima: null, tempos: [] };
    if (emAberto(i)) linha.abertas += 1;
    if (i.status === "finalizada") {
      linha.finalizadas += 1;
      linha.sim += i.sim;
      linha.nao += i.nao;
      linha.planos += i.planos;
      const tempo = tempoDeExecucao(i);
      if (tempo !== null) linha.tempos.push(tempo);
    }
    if (!linha.ultima || i.dataReferencia > linha.ultima) linha.ultima = i.dataReferencia;
    mapa.set(k, linha);
  }
  return [...mapa.values()]
    .map(({ tempos, ...l }) => ({
      ...l,
      conformidade: l.sim + l.nao > 0 ? conformidade(l.sim, l.nao) : null,
      tempoMedio: media(tempos),
    }))
    .sort((a, b) => b.finalizadas - a.finalizadas || b.abertas - a.abertas || a.nome.localeCompare(b.nome, "pt-BR"));
}

/** Por dia (data do checklist), do mais recente para o mais antigo. */
export function resumoPorDia(lista: readonly InspecaoRelatorio[]) {
  const mapa = new Map<string, { data: string; finalizadas: number; abertas: number; sim: number; nao: number }>();
  for (const i of lista) {
    if (i.status === "cancelada") continue;
    const linha = mapa.get(i.dataReferencia) ?? { data: i.dataReferencia, finalizadas: 0, abertas: 0, sim: 0, nao: 0 };
    if (i.status === "finalizada") {
      linha.finalizadas += 1;
      linha.sim += i.sim;
      linha.nao += i.nao;
    } else {
      linha.abertas += 1;
    }
    mapa.set(i.dataReferencia, linha);
  }
  return [...mapa.values()].sort((a, b) => b.data.localeCompare(a.data));
}

/** Checklists em aberto e há quanto tempo, os mais antigos primeiro. */
export function abertosComTempo(lista: readonly InspecaoRelatorio[], agora = Date.now()) {
  return lista
    .filter(emAberto)
    .map((i) => ({ ...i, minutosAberto: minutosEntre(i.criadoEm, agora) }))
    .sort((a, b) => b.minutosAberto - a.minutosAberto);
}

/** Totais do período: finalizadas, conformidade, não conformidades, planos e tempos. */
export function totaisRelatorio(lista: readonly InspecaoRelatorio[]) {
  const finalizadas = lista.filter((i) => i.status === "finalizada");
  const sim = finalizadas.reduce((s, i) => s + i.sim, 0);
  const nao = finalizadas.reduce((s, i) => s + i.nao, 0);
  const tempos = finalizadas.map(tempoDeExecucao).filter((t): t is number => t !== null);
  return {
    finalizadas: finalizadas.length,
    abertas: lista.filter(emAberto).length,
    canceladas: lista.filter((i) => i.status === "cancelada").length,
    sim,
    nao,
    conformidade: sim + nao > 0 ? conformidade(sim, nao) : null,
    planos: finalizadas.reduce((s, i) => s + i.planos, 0),
    tempoMedio: media(tempos),
    tempoMaximo: tempos.length ? Math.max(...tempos) : null,
  };
}
