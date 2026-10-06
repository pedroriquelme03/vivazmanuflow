import { describe, expect, it } from "vitest";
import {
  ASSUNTO_ACESSO,
  URL_LOGIN_VIVAZ,
  primeiroNome,
  rascunhoAcessoOutlook,
} from "./email-acesso";

describe("primeiroNome", () => {
  it("pega só o primeiro nome", () => {
    expect(primeiroNome("Eder Josué Saenz")).toBe("Eder");
  });
});

describe("rascunhoAcessoOutlook", () => {
  const rascunho = rascunhoAcessoOutlook({
    nome: "Teste Gabriel",
    email: "testegabriel@gmail.com",
    senha: "123456",
    papel: "Solicitante",
  });

  it("manda para o e-mail da pessoa", () => {
    expect(rascunho.para).toBe("testegabriel@gmail.com");
    expect(rascunho.href.startsWith("mailto:")).toBe(true);
    expect(decodeURIComponent(rascunho.href)).toContain(
      "testegabriel@gmail.com",
    );
  });

  it("usa o padrão do hotel", () => {
    expect(rascunho.assunto).toBe(ASSUNTO_ACESSO);
    expect(rascunho.corpo).toContain("Olá, Teste!");
    expect(rascunho.corpo).toContain(
      "Sistema de Chamados do Vivaz Cataratas Hotel Resort",
    );
    expect(rascunho.corpo).toContain("Perfil: Solicitante");
    expect(rascunho.corpo).toContain(
      "E-mail de acesso: testegabriel@gmail.com",
    );
    expect(rascunho.corpo).toContain("Senha inicial: 123456");
    expect(rascunho.corpo).toContain(URL_LOGIN_VIVAZ);
    expect(rascunho.corpo).toContain("Equipe Vivaz Cataratas Hotel Resort");
  });
});
