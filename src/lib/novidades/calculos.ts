/**
 * Fórmulas dos materiais da Leankeep (backlog, criticidade e indicadores).
 * Regra geral deles: denominador zero não vira zero, vira "sem base" (null).
 */

export function percentual(numerador: number, denominador: number) {
  return denominador > 0 ? Math.round((numerador / denominador) * 1000) / 10 : null;
}

export function formatarPercentual(valor: number | null) {
  return valor === null ? "Sem base" : `${valor.toLocaleString("pt-BR")}%`;
}

export function diasEntre(inicioIso: string, fimIso: string) {
  const ini = Date.parse(inicioIso.slice(0, 10) + "T00:00:00Z");
  const fim = Date.parse(fimIso.slice(0, 10) + "T00:00:00Z");
  return Math.max(0, Math.round((fim - ini) / 86_400_000));
}

// ---------------------------------------------------------------- Backlog

export type ItemBacklog = { hp: number | null; bloqueado: boolean };

/** Horas-pessoa por semana que sobram para a carteira. */
export function capacidadeLiquida(
  tecnicos: number,
  horasSemana: number,
  compromissos: number,
  reserva: number,
) {
  const bruta = Math.max(0, tecnicos) * Math.max(0, horasSemana);
  return { bruta, liquida: Math.max(0, bruta - Math.max(0, compromissos) - Math.max(0, reserva)) };
}

export function semanasEquivalentes(hp: number, capacidade: number) {
  return capacidade > 0 ? Math.round((hp / capacidade) * 100) / 100 : null;
}

export function resumoBacklog(itens: ItemBacklog[]) {
  let total = 0;
  let executavel = 0;
  let bloqueada = 0;
  let semEstimativa = 0;
  for (const i of itens) {
    if (i.hp === null || !Number.isFinite(i.hp)) {
      semEstimativa += 1;
      continue;
    }
    total += i.hp;
    if (i.bloqueado) bloqueada += i.hp;
    else executavel += i.hp;
  }
  return { total, executavel, bloqueada, semEstimativa };
}

// ------------------------------------------------------------ Criticidade

export type Classe = "A" | "B" | "C";

export const CRITERIOS_CRITICIDADE = [
  {
    id: "continuidade",
    rotulo: "Continuidade do serviço",
    A: "Interrompe função essencial sem alternativa comprovada",
    B: "Restringe o serviço; dá para contornar por um tempo",
    C: "Efeito localizado; existe alternativa disponível",
  },
  {
    id: "pessoas",
    rotulo: "Pessoas e ambiente",
    A: "Pode causar dano grave; precisa de avaliação especializada",
    B: "Consequência identificada; pede controles específicos",
    C: "Consequência limitada, sustentada pela avaliação",
  },
  {
    id: "recuperacao",
    rotulo: "Recuperação da função",
    A: "Depende de recurso indisponível ou mobilização incompatível",
    B: "Exige mobilização planejada, com alternativa temporária",
    C: "Recuperação viável com recursos acessíveis",
  },
] as const;

export type CriterioId = (typeof CRITERIOS_CRITICIDADE)[number]["id"];

const NOTA: Record<Classe, number> = { C: 1, B: 2, A: 3 };

/** Regra conservadora: a classe é a pior nota. Falta de dado = pendente (null). */
export function classeCriticidade(notas: Partial<Record<CriterioId, Classe | "">>) {
  let maior = 0;
  for (const c of CRITERIOS_CRITICIDADE) {
    const n = notas[c.id];
    if (!n) return null;
    maior = Math.max(maior, NOTA[n]);
  }
  return (["C", "B", "A"] as const)[maior - 1];
}

// ------------------------------------------------------------ Indicadores

export type Reparo = { inicio: string | null; fim: string | null };

/** MTTR em horas: duração média dos reparos concluídos (sem os sem início). */
export function mttrHoras(reparos: Reparo[]) {
  let soma = 0;
  let n = 0;
  let semInicio = 0;
  for (const r of reparos) {
    if (!r.fim) continue;
    if (!r.inicio) {
      semInicio += 1;
      continue;
    }
    const h = (Date.parse(r.fim) - Date.parse(r.inicio)) / 3_600_000;
    if (!Number.isFinite(h) || h < 0) {
      semInicio += 1;
      continue;
    }
    soma += h;
    n += 1;
  }
  return { valor: n > 0 ? Math.round((soma / n) * 10) / 10 : null, considerados: n, semInicio };
}

/** MTBF em horas de operação. Sem falhas não é infinito: é "sem base". */
export function mtbfHoras(horasOperacao: number, falhas: number) {
  return falhas > 0 ? Math.round((horasOperacao / falhas) * 10) / 10 : null;
}

export function disponibilidade(horasRequeridas: number, horasIndisponivel: number) {
  if (horasRequeridas <= 0) return null;
  const disp = Math.max(0, horasRequeridas - Math.min(horasIndisponivel, horasRequeridas));
  return percentual(disp, horasRequeridas);
}

export type ChamadoSla = { criado_em: string; concluido_em: string | null; prioridade: string };

/**
 * SLA: chamados cujo prazo venceu dentro do período. Quem passou do limite
 * sem atendimento continua no denominador.
 */
export function slaNoPrazo(
  chamados: ChamadoSla[],
  horasPorPrioridade: Record<string, number>,
  inicio: string,
  fim: string,
  agora: string,
) {
  let elegiveis = 0;
  let noPrazo = 0;
  let semRegra = 0;
  for (const c of chamados) {
    const horas = horasPorPrioridade[c.prioridade];
    if (!horas) {
      semRegra += 1;
      continue;
    }
    const prazo = new Date(Date.parse(c.criado_em) + horas * 3_600_000).toISOString();
    if (prazo.slice(0, 10) < inicio || prazo.slice(0, 10) > fim || prazo > agora) continue;
    elegiveis += 1;
    if (c.concluido_em && c.concluido_em <= prazo) noPrazo += 1;
  }
  return { elegiveis, noPrazo, semRegra, valor: percentual(noPrazo, elegiveis) };
}
