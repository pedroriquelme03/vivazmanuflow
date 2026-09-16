import { describe, expect, it } from "vitest";
import {
  idPrimeiraPropriedadeAtiva,
  propriedadesAtivas,
} from "./propriedade-opcoes";

const vivaz = { id: "v", nome: "Vivaz", ativo: true };
const projetos = { id: "p", nome: "Projetos", ativo: false };

describe("propriedadesAtivas", () => {
  it("esconde local desativado", () => {
    expect(propriedadesAtivas([vivaz, projetos]).map((p) => p.id)).toEqual(["v"]);
  });

  it("mantém o local atual se a pessoa já está nele", () => {
    expect(
      propriedadesAtivas([vivaz, projetos], "p").map((p) => p.id),
    ).toEqual(["v", "p"]);
  });
});

describe("idPrimeiraPropriedadeAtiva", () => {
  it("não escolhe o desativado como padrão", () => {
    expect(idPrimeiraPropriedadeAtiva([projetos, vivaz])).toBe("v");
    expect(idPrimeiraPropriedadeAtiva([projetos])).toBe("");
  });
});
