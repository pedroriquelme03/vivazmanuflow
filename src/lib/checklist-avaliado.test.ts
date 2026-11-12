import { describe, expect, it } from "vitest";
import { avaliadoPronto, modoAvaliado, passoAvaliado, rotuloModoAvaliado } from "./checklist-avaliado";

describe("passoAvaliado", () => {
  it("colaborador: o líder escolhe da lista; o aplicador não escolhe", () => {
    expect(passoAvaliado("colaborador", true)).toBe("lista");
    expect(passoAvaliado("colaborador", false)).toBe("nenhum");
  });

  it("próprio: sempre quem aplica", () => {
    expect(passoAvaliado("proprio", true)).toBe("proprio");
    expect(passoAvaliado("proprio", false)).toBe("proprio");
  });

  it("escolher: o líder pergunta; o aplicador vai como ele mesmo", () => {
    expect(passoAvaliado("escolher", true)).toBe("pergunta");
    expect(passoAvaliado("escolher", false)).toBe("proprio");
  });

  it("valor desconhecido vale como colaborador", () => {
    expect(modoAvaliado("x")).toBe("colaborador");
    expect(rotuloModoAvaliado(null)).toBe("O líder escolhe o colaborador");
  });
});

describe("avaliadoPronto", () => {
  it("na pergunta precisa responder e, se for outra pessoa, escolher", () => {
    expect(avaliadoPronto("pergunta", null, false, true)).toBe(false);
    expect(avaliadoPronto("pergunta", true, false, true)).toBe(true);
    expect(avaliadoPronto("pergunta", false, false, true)).toBe(false);
    expect(avaliadoPronto("pergunta", false, true, true)).toBe(true);
  });

  it("na lista precisa escolher, a não ser que a lista esteja vazia", () => {
    expect(avaliadoPronto("lista", null, false, true)).toBe(false);
    expect(avaliadoPronto("lista", null, false, false)).toBe(true);
    expect(avaliadoPronto("proprio", null, false, true)).toBe(true);
  });
});
