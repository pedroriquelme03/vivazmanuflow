import { describe, expect, it } from "vitest";
import {
  ASSUNTO_ACESSO,
  URL_LOGIN_VIVAZ,
  empresaDosAcessos,
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

describe("e-mail de acesso do Checklist", () => {
  it("fala do Checklist e troca a empresa (Aquamania)", () => {
    const r = rascunhoAcessoOutlook({
      nome: "Ana Diaz",
      email: "ana@exemplo.com",
      senha: "abc123",
      papel: "Camareira",
      sistema: "checklist",
      empresa: empresaDosAcessos(["Aquamania"]),
    });
    expect(r.assunto).toBe("Acesso ao Checklist do Aquamania");
    expect(r.corpo).toContain("Seu acesso ao Checklist do Aquamania foi criado com sucesso.");
    expect(r.corpo).toContain("Perfil: Camareira");
    expect(r.corpo).toContain("Senha inicial: abc123");
    expect(r.corpo).toContain("Equipe Aquamania");
    expect(r.corpo).not.toContain("Sistema de Chamados");
  });

  it("Vivaz vira o nome completo e não repete empresa", () => {
    expect(empresaDosAcessos(["Vivaz Cataratas", "Vivaz Cataratas"])).toBe("Vivaz Cataratas Hotel Resort");
    expect(empresaDosAcessos(["Vivaz Cataratas", "Aquamania"])).toBe("Vivaz Cataratas Hotel Resort e Aquamania");
    expect(empresaDosAcessos([])).toBe("Vivaz Cataratas Hotel Resort");
  });
});
