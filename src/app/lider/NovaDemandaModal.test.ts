import { describe, expect, it } from "vitest";
import { precisaEscolherArea, type OpcoesNovaDemanda } from "./NovaDemandaModal";

const base: OpcoesNovaDemanda = {
  propriedades: [],
  solicitantes: [],
  eventos: [],
  ambiente: "manutencao",
};

describe("precisaEscolherArea", () => {
  it("+ Novo chamado do quadro: a pessoa escolhe TI ou Manutenção", () => {
    expect(precisaEscolherArea(base)).toBe(true);
    expect(precisaEscolherArea({ ...base, ambiente: "ti", modoProjeto: "opcional" })).toBe(true);
  });

  it("Registrar concluído fica na área do quadro", () => {
    expect(precisaEscolherArea({ ...base, destinarConcluido: true })).toBe(false);
  });

  it("chamado de projeto fica na Manutenção", () => {
    expect(precisaEscolherArea({ ...base, modoProjeto: "obrigatorio" })).toBe(false);
  });
});
