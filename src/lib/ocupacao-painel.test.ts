import { describe, expect, it } from "vitest";
import { ocupacaoDoPainel, ultimaPorDia } from "./ocupacao-painel";

const painel = (adults: number, quando: string) => ({
  lastUpdatedAt: quando,
  guests: { adults, c02: 11, c36: 28, c710: 42, c1112: 11, c1317: 4 },
  occupancy: { rate: 94.74, occupied: 162 },
});

describe("ocupação do painel operacional", () => {
  it("soma as faixas das crianças e usa o dia de Brasília", () => {
    // 01:30 UTC do dia 20 ainda é dia 19 em Brasília.
    const o = ocupacaoDoPainel(painel(344, "2026-11-20T01:30:00Z"));
    expect(o).toMatchObject({ data: "2026-11-19", adultos: 344, criancas: 96, uhs_ocupadas: 162, taxa_ocupacao: 94.74 });
  });

  it("painel vazio ou sem data não vale", () => {
    expect(ocupacaoDoPainel({ guests: {} , lastUpdatedAt: "2026-11-19T12:00:00Z" })).toBeNull();
    expect(ocupacaoDoPainel({ guests: { adults: 10 } })).toBeNull();
    expect(ocupacaoDoPainel(null)).toBeNull();
  });

  it("do histórico, fica o último salvamento de cada dia", () => {
    const dias = ultimaPorDia([
      { saved_at: "2026-11-19T11:41:50Z", payload: painel(344, "2026-11-19T11:41:50Z") },
      { saved_at: "2026-11-19T11:20:00Z", payload: painel(300, "2026-11-19T11:20:00Z") },
      { saved_at: "2026-11-16T11:26:00Z", payload: painel(290, "2026-11-16T11:26:00Z") },
    ]);
    expect(dias.map((d) => [d.data, d.adultos])).toEqual([
      ["2026-11-16", 290],
      ["2026-11-19", 344],
    ]);
  });
});
