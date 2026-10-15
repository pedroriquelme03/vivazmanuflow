import { describe, expect, it } from "vitest";
import {
  horasDoDia,
  picoHorario,
  volumeErrosSentry,
  volumeLocaisDigitados,
} from "./metricas-ti";

describe("volumeErrosSentry", () => {
  it("separa as ocorrências por sistema", () => {
    expect(
      volumeErrosSentry([
        { sistema: "Portal RH", chamados: 2, ocorrencias: 14 },
        { sistema: "Chamados TI", chamados: 1, ocorrencias: 3 },
      ]),
    ).toEqual([
      { rotulo: "Portal RH · 2 chamados", valor: 14 },
      { rotulo: "Chamados TI · 1 chamado", valor: 3 },
    ]);
  });

  it("lista vazia se o SQL ainda não mandou o campo", () => {
    expect(volumeErrosSentry(undefined)).toEqual([]);
  });
});

describe("volumeLocaisDigitados", () => {
  it("usa o texto que a pessoa digitou", () => {
    expect(
      volumeLocaisDigitados([
        { local: "Recepção", total: 5 },
        { local: "computador da governança", total: 2 },
      ]),
    ).toEqual([
      { rotulo: "Recepção", valor: 5 },
      { rotulo: "computador da governança", valor: 2 },
    ]);
  });

  it("lista vazia se o SQL ainda não mandou o campo", () => {
    expect(volumeLocaisDigitados(undefined)).toEqual([]);
  });

  it("trata local em branco", () => {
    expect(volumeLocaisDigitados([{ local: "  ", total: 1 }])).toEqual([
      { rotulo: "Sem local informado", valor: 1 },
    ]);
  });
});

describe("picoHorario", () => {
  it("acha a hora com mais chamados", () => {
    expect(
      picoHorario([
        { hora: 8, total: 1 },
        { hora: 14, total: 9 },
        { hora: 18, total: 3 },
      ]),
    ).toEqual({ hora: 14, total: 9 });
  });

  it("ignora dia sem movimento", () => {
    expect(picoHorario([{ hora: 10, total: 0 }])).toBeNull();
  });
});

describe("horasDoDia", () => {
  it("preenche as 24 horas", () => {
    const dia = horasDoDia([{ hora: 9, total: 4 }]);
    expect(dia).toHaveLength(24);
    expect(dia[9]).toEqual({ hora: 9, total: 4 });
    expect(dia[8]).toEqual({ hora: 8, total: 0 });
  });
});
