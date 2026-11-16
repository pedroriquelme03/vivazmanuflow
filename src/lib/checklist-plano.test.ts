import { describe, expect, it } from "vitest";
import {
  camposDoPlano,
  extrasDoBanco,
  extrasParaGravar,
  lerCamposPlano,
  lerValor,
  modoCampoPlano,
  mudarCampoPlano,
  planoFaltando,
} from "./checklist-plano";

describe("config do plano", () => {
  it("lê só campos e modos conhecidos", () => {
    expect(lerCamposPlano({ prazo: "obrigatorio", onde: "x", outro: "opcional" })).toEqual({ prazo: "obrigatorio" });
    expect(lerCamposPlano(null)).toEqual({});
    expect(lerCamposPlano([])).toEqual({});
  });

  it("muda um campo; 'não pede' tira", () => {
    const c = mudarCampoPlano({}, "custo", "opcional");
    expect(c).toEqual({ custo: "opcional" });
    expect(mudarCampoPlano(c, "custo", "oculto")).toEqual({});
    expect(modoCampoPlano(c, "prazo")).toBe("oculto");
  });

  it("campos na ordem do 5W2H, com obrigatório marcado", () => {
    expect(camposDoPlano({ custo: "opcional", prazo: "obrigatorio" }).map((c) => [c.campo, c.obrigatorio])).toEqual([
      ["prazo", true],
      ["custo", false],
    ]);
  });
});

describe("preenchimento", () => {
  const config = { prazo: "obrigatorio", onde: "opcional", custo: "opcional" } as const;

  it("falta o obrigatório vazio", () => {
    expect(planoFaltando(config, {})).toEqual(["Prazo"]);
    expect(planoFaltando(config, { prazo: "2026-11-20" })).toEqual([]);
  });

  it("grava só o que a pergunta pede e lê valor em reais", () => {
    expect(extrasParaGravar(config, { prazo: "2026-11-20", como: "ignorado", custo: "1.234,50" })).toEqual({
      prazo: "2026-11-20",
      onde: null,
      por_que: null,
      como: null,
      custo: 1234.5,
    });
    expect(lerValor("abc")).toBeNull();
    expect(lerValor("12.5")).toBe(12.5);
  });

  it("do banco para a tela", () => {
    expect(extrasDoBanco({ prazo: "2026-11-20", custo: 10, onde: null })).toEqual({ prazo: "2026-11-20", custo: "10" });
  });
});
