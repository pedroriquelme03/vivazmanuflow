import { describe, expect, it } from "vitest";
import {
  proximaAberturaApos,
  rotuloRitmo,
  somarIntervalo,
  tituloChamadoPreventiva,
} from "./preventiva";

describe("rotuloRitmo", () => {
  it("nomeia os ritmos do hotel", () => {
    expect(rotuloRitmo(1, "mes")).toBe("Todo mês");
    expect(rotuloRitmo(2, "mes")).toBe("Mês sim, mês não");
    expect(rotuloRitmo(1, "ano")).toBe("Uma vez por ano");
  });

  it("descreve um intervalo livre", () => {
    expect(rotuloRitmo(10, "dia")).toBe("A cada 10 dias");
  });
});

describe("tituloChamadoPreventiva", () => {
  it("escreve que é preventiva", () => {
    expect(tituloChamadoPreventiva("limpeza da coifa")).toBe(
      "Preventiva: limpeza da coifa",
    );
  });

  it("não repete o prefixo", () => {
    expect(tituloChamadoPreventiva("Preventiva: caldeira")).toBe(
      "Preventiva: caldeira",
    );
  });
});

describe("somarIntervalo", () => {
  it("mês sim mês não anda dois meses", () => {
    expect(somarIntervalo("2026-03-01", 2, "mes")).toBe("2026-05-01");
  });

  it("31 de janeiro mais um mês cai no fim de fevereiro", () => {
    expect(somarIntervalo("2026-01-31", 1, "mes")).toBe("2026-02-28");
  });

  it("um ano a partir da data", () => {
    expect(somarIntervalo("2026-04-15", 1, "ano")).toBe("2027-04-15");
  });
});

describe("proximaAberturaApos", () => {
  it("se a data ainda não chegou, mantém", () => {
    expect(proximaAberturaApos("2026-11-01", 1, "mes", "2026-10-08")).toBe(
      "2026-11-01",
    );
  });

  it("pula os meses atrasados e fica na próxima depois de hoje", () => {
    expect(proximaAberturaApos("2026-01-01", 1, "mes", "2026-10-08")).toBe(
      "2026-11-01",
    );
  });

  it("no dia marcado, a seguinte já é o próximo ciclo", () => {
    expect(proximaAberturaApos("2026-10-08", 1, "ano", "2026-10-08")).toBe(
      "2027-10-08",
    );
  });
});
