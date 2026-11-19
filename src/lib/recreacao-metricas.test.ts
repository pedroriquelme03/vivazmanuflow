import { describe, expect, it } from "vitest";
import {
  basePublico,
  diaDaSemana,
  filtrarRegistros,
  lerFiltrosRecreacao,
  lerRegistro,
  mediana,
  metricasRecreacao,
  porcentagem,
  turnoDaHora,
  type RegistroAtividade,
} from "./recreacao-metricas";

function reg(p: Partial<RegistroAtividade>): RegistroAtividade {
  return {
    id: Math.random().toString(36),
    data: "2026-10-01",
    hora: "09:00",
    atividade: "Caminhada",
    publico: "Adulto",
    participantes: 10,
    responsavelId: "r1",
    responsavel: "Jujuba",
    observacoes: null,
    ...p,
  };
}

// Ocupação da planilha de teste: 01/10 = 323 adultos e 123 crianças.
const ocupacao = new Map([
  ["2026-10-01", { adultos: 323, criancas: 123 }],
  ["2026-10-02", { adultos: 302, criancas: 126 }],
]);

describe("lerRegistro", () => {
  it("acha pela chave e, sem chave, pelo texto da pergunta", () => {
    const r = lerRegistro([
      { chave: "atividade", texto: "Qual atividade?", valor: "Yoga" },
      { chave: null, texto: "Hora da atividade", valor: "09:30:00" },
      { chave: null, texto: "Público", valor: "Adulto" },
      { chave: "participantes", texto: "Quantos?", valor: "12" },
    ]);
    expect(r).toEqual({ atividade: "Yoga", hora: "09:30", publico: "Adulto", participantes: 12, observacoes: null });
  });

  it("número inválido ou negativo vira 0", () => {
    expect(lerRegistro([{ chave: "participantes", texto: "", valor: "abc" }]).participantes).toBe(0);
    expect(lerRegistro([{ chave: "participantes", texto: "", valor: "-3" }]).participantes).toBe(0);
  });
});

describe("base do público", () => {
  it("adulto, infantil e familiar (adultos + crianças)", () => {
    const oc = { adultos: 323, criancas: 123 };
    expect(basePublico("Adulto", oc)).toBe(323);
    expect(basePublico("Infantil", oc)).toBe(123);
    expect(basePublico("Familiar", oc)).toBe(446);
    expect(basePublico(null, oc)).toBeNull();
    expect(basePublico("Adulto", undefined)).toBeNull();
  });
});

describe("turno e dia da semana", () => {
  it("separa manhã, tarde e noite", () => {
    expect(turnoDaHora("05:36")).toBe("manha");
    expect(turnoDaHora("12:00")).toBe("tarde");
    expect(turnoDaHora("19:10")).toBe("noite");
    expect(turnoDaHora(null)).toBeNull();
  });
  it("dia da semana sem fuso", () => {
    expect(diaDaSemana("2026-11-19")).toBe(4); // quinta
  });
});

describe("métricas", () => {
  it("adesão só com dias que têm ocupação (a planilha dava 17,6% somando o dia sem base)", () => {
    // Caminhada Adulto da planilha: 29/09 com 23 (sem ocupação) e 01/10 com 34 (323 adultos).
    const m = metricasRecreacao(
      [reg({ data: "2026-09-29", participantes: 23 }), reg({ participantes: 34 })],
      ocupacao,
      { de: "2026-09-29", ate: "2026-10-01" },
    );
    expect(m.participacoes).toBe(57);
    expect(porcentagem(m.adesaoPonderada)).toBe("10,5%");
    expect(porcentagem(m.adesaoMedia)).toBe("10,5%");
    expect(m.mediaPorAtividade).toBe(28.5);
    expect(m.porAtividadePublico[0]).toMatchObject({ nome: "Caminhada", publico: "Adulto", realizacoes: 2, baseMedia: 323 });
  });

  it("ponderada pesa a atividade cheia; média pesa cada atividade igual", () => {
    const m = metricasRecreacao(
      [reg({ participantes: 34 }), reg({ data: "2026-10-02", participantes: 3 })],
      ocupacao,
      { de: "2026-10-01", ate: "2026-10-02" },
    );
    expect(m.adesaoPonderada).toBeCloseTo(37 / (323 + 302));
    expect(m.adesaoMedia).toBeCloseTo((34 / 323 + 3 / 302) / 2);
  });

  it("dia sem ocupação não entra na adesão e aparece no aviso", () => {
    const m = metricasRecreacao(
      [reg({ data: "2026-10-05", participantes: 10 })],
      ocupacao,
      { de: "2026-10-01", ate: "2026-10-31" },
    );
    expect(m.adesaoPonderada).toBeNull();
    expect(m.diasSemOcupacao).toEqual(["2026-10-05"]);
    expect(m.mediaHospedes).toBe((446 + 428) / 2);
  });

  it("vazio não quebra", () => {
    const m = metricasRecreacao([], new Map(), { de: "", ate: "" });
    expect(m.realizadas).toBe(0);
    expect(m.mediana).toBeNull();
    expect(m.maior).toBeNull();
  });

  it("mediana par e ímpar", () => {
    expect(mediana([1, 3, 2])).toBe(2);
    expect(mediana([1, 2, 3, 4])).toBe(2.5);
  });
});

describe("filtros", () => {
  const regs = [
    reg({ id: "a", publico: "Infantil", hora: "08:00" }),
    reg({ id: "b", publico: null, hora: "15:00", responsavelId: "r2" }),
    reg({ id: "c", data: "2026-09-30", atividade: "Yoga", hora: "20:00" }),
  ];
  const base = lerFiltrosRecreacao({ de: "2026-09-01", ate: "2026-10-31" }, "2026-10-10");

  it("período padrão é o mês atual", () => {
    expect(lerFiltrosRecreacao({}, "2026-11-19")).toMatchObject({ de: "2026-11-01", ate: "2026-11-19" });
  });
  it("por público, sem público, turno, atividade e responsável", () => {
    expect(filtrarRegistros(regs, { ...base, publico: "Infantil" }).map((r) => r.id)).toEqual(["a"]);
    expect(filtrarRegistros(regs, { ...base, publico: "nao_informado" }).map((r) => r.id)).toEqual(["b"]);
    expect(filtrarRegistros(regs, { ...base, turno: "noite" }).map((r) => r.id)).toEqual(["c"]);
    expect(filtrarRegistros(regs, { ...base, atividade: "Yoga" }).map((r) => r.id)).toEqual(["c"]);
    expect(filtrarRegistros(regs, { ...base, responsavel: "r2" }).map((r) => r.id)).toEqual(["b"]);
    expect(filtrarRegistros(regs, { ...base, de: "2026-10-01" })).toHaveLength(2);
  });
});
