import { describe, expect, it } from "vitest";
import { datasPrevistas, montarCronograma, subtrairIntervalo } from "./cronograma";
import {
  capacidadeLiquida,
  classeCriticidade,
  disponibilidade,
  mtbfHoras,
  mttrHoras,
  percentual,
  resumoBacklog,
  semanasEquivalentes,
  slaNoPrazo,
} from "./calculos";
import { CATALOGO_ATIVIDADES } from "./catalogo-atividades";

const rotina = {
  id: "r1",
  titulo: "Limpar filtro",
  local: "Casa de máquinas",
  intervalo_quantidade: 1,
  intervalo_unidade: "mes",
  proxima_abertura: "2026-11-10",
  criado_em: "2026-01-05T10:00:00Z",
  ativo: true,
};

describe("cronograma", () => {
  it("recua um mês sem estourar o dia", () => {
    expect(subtrairIntervalo("2026-03-31", 1, "mes")).toBe("2026-02-28");
    expect(subtrairIntervalo("2026-01-10", 1, "mes")).toBe("2025-12-10");
    expect(subtrairIntervalo("2026-01-03", 7, "dia")).toBe("2025-12-27");
  });

  it("projeta as datas do ano a partir da próxima abertura", () => {
    const datas = datasPrevistas(rotina, 2026);
    expect(datas).toHaveLength(12);
    expect(datas[0]).toBe("2026-01-10");
    expect(datas[11]).toBe("2026-12-10");
  });

  it("não prevê antes do mês em que a rotina foi criada", () => {
    const datas = datasPrevistas({ ...rotina, criado_em: "2026-06-20T00:00:00Z" }, 2026);
    expect(datas[0]).toBe("2026-06-10");
  });

  it("separa feito no prazo, com atraso, sem registro e futuro", () => {
    const r = montarCronograma(
      [rotina],
      [
        { preventiva_id: "r1", criado_em: "2026-01-10T09:00:00Z", concluido_em: "2026-01-12T09:00:00Z", status: "concluida" },
        { preventiva_id: "r1", criado_em: "2026-02-10T09:00:00Z", concluido_em: "2026-03-15T09:00:00Z", status: "concluida" },
        { preventiva_id: "r1", criado_em: "2026-03-11T09:00:00Z", concluido_em: null, status: "cancelada" },
      ],
      2026,
      "2026-04-20",
    );
    const estados = r.linhas[0].meses.map((m) => m[0]?.estado);
    expect(estados.slice(0, 5)).toEqual(["no_prazo", "atrasada", "cancelada", "sem_registro", "futura"]);
    expect(r.previstasAteHoje).toBe(4);
    expect(r.executadas).toBe(2);
    expect(r.noPrazo).toBe(1);
    expect(r.execucao).toBe(50);
    expect(r.execucaoNoPrazo).toBe(25);
    expect(r.pendentesAtrasadas).toBe(0);
  });

  it("sem previsão o percentual é sem base", () => {
    const r = montarCronograma([], [], 2026, "2026-04-20");
    expect(r.execucao).toBeNull();
  });
});

describe("backlog", () => {
  it("reproduz o exemplo da Leankeep (20 HP e 20 HP/semana)", () => {
    const itens = [
      { hp: 2, bloqueado: false },
      { hp: 8, bloqueado: true },
      { hp: 6, bloqueado: false },
      { hp: 4, bloqueado: true },
      { hp: null, bloqueado: false },
    ];
    const r = resumoBacklog(itens);
    expect(r).toEqual({ total: 20, executavel: 8, bloqueada: 12, semEstimativa: 1 });
    const cap = capacidadeLiquida(2, 20, 8, 12);
    expect(cap).toEqual({ bruta: 40, liquida: 20 });
    expect(semanasEquivalentes(r.total, cap.liquida)).toBe(1);
    expect(semanasEquivalentes(r.executavel, cap.liquida)).toBe(0.4);
    expect(semanasEquivalentes(10, 0)).toBeNull();
  });
});

describe("criticidade", () => {
  it("usa a pior nota e deixa pendente quando falta critério", () => {
    expect(classeCriticidade({ continuidade: "A", pessoas: "C", recuperacao: "B" })).toBe("A");
    expect(classeCriticidade({ continuidade: "C", pessoas: "C", recuperacao: "C" })).toBe("C");
    expect(classeCriticidade({ continuidade: "B", pessoas: "C" })).toBeNull();
  });
});

describe("indicadores", () => {
  it("percentual com denominador zero é sem base", () => {
    expect(percentual(28, 40)).toBe(70);
    expect(percentual(1, 0)).toBeNull();
  });

  it("MTTR ignora reparos sem início e conta à parte", () => {
    const r = mttrHoras([
      { inicio: "2026-01-01T10:00:00Z", fim: "2026-01-01T12:00:00Z" },
      { inicio: "2026-01-01T10:00:00Z", fim: "2026-01-01T14:00:00Z" },
      { inicio: null, fim: "2026-01-01T14:00:00Z" },
      { inicio: "2026-01-01T10:00:00Z", fim: null },
    ]);
    expect(r).toEqual({ valor: 3, considerados: 2, semInicio: 1 });
  });

  it("MTBF sem falha e disponibilidade do exemplo", () => {
    expect(mtbfHoras(720, 0)).toBeNull();
    expect(mtbfHoras(720, 3)).toBe(240);
    expect(disponibilidade(200, 8)).toBe(96);
  });

  it("SLA mantém atrasado sem atendimento no denominador", () => {
    const r = slaNoPrazo(
      [
        { criado_em: "2026-01-01T00:00:00Z", concluido_em: "2026-01-01T03:00:00Z", prioridade: "alta" },
        { criado_em: "2026-01-02T00:00:00Z", concluido_em: null, prioridade: "alta" },
        { criado_em: "2026-01-02T00:00:00Z", concluido_em: null, prioridade: "baixa" },
      ],
      { alta: 4 },
      "2026-01-01",
      "2026-01-31",
      "2026-02-01T00:00:00Z",
    );
    expect(r).toEqual({ elegiveis: 2, noPrazo: 1, semRegra: 1, valor: 50 });
  });
});

describe("catálogo", () => {
  it("traz as atividades da planilha com intervalo em meses", () => {
    expect(CATALOGO_ATIVIDADES.length).toBeGreaterThan(400);
    expect(CATALOGO_ATIVIDADES.every((a) => [1, 3, 6, 12].includes(a.meses))).toBe(true);
  });
});
