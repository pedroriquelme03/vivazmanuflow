import { describe, expect, it } from "vitest";
import {
  validarRequisicaoAcesso,
  emailJaCadastrado,
  recursoRequisicaoAusente,
} from "@/lib/requisicao-acesso";

describe("validarRequisicaoAcesso", () => {
  const ok = {
    nome: "Ana",
    email: "ana@vivaz.com",
    setor: "Recepção",
    funcao: "Atendente",
  };

  it("aceita pedido completo", () => {
    expect(validarRequisicaoAcesso(ok)).toBeNull();
  });

  it("pede os quatro campos", () => {
    expect(validarRequisicaoAcesso({ ...ok, nome: "" })).toBe("Informe o nome.");
    expect(validarRequisicaoAcesso({ ...ok, email: "sem-arroba" })).toBe(
      "Informe um e-mail válido.",
    );
    expect(validarRequisicaoAcesso({ ...ok, setor: "  " })).toBe(
      "Informe o setor.",
    );
    expect(validarRequisicaoAcesso({ ...ok, funcao: "" })).toBe(
      "Informe a função.",
    );
  });
});

describe("emailJaCadastrado", () => {
  it("reconhece o e-mail da equipe sem se importar com maiúscula", () => {
    expect(
      emailJaCadastrado("Ana@Vivaz.com", ["outro@x.com", "ana@vivaz.com"]),
    ).toBe(true);
    expect(emailJaCadastrado("nova@vivaz.com", ["ana@vivaz.com"])).toBe(false);
  });
});

describe("recursoRequisicaoAusente", () => {
  it("reconhece tabela ou função que ainda não está no banco", () => {
    expect(
      recursoRequisicaoAusente(
        "Could not find the table public.requisicoes_acesso in the schema cache",
      ),
    ).toBe(true);
  });
});
