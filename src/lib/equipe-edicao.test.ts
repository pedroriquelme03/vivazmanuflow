import { describe, expect, it } from "vitest";
import {
  mapaEmails,
  payloadAtualizarUsuario,
  rotuloUltimaAlteracao,
  validarEdicaoEquipe,
} from "@/lib/equipe-edicao";

const base = {
  userId: "u1",
  nome: "Ana Costa",
  email: "ana.costa@vivaz.local",
  senha: "",
  senha2: "",
  ativo: true,
  propriedadeId: "prop-1",
};

describe("validarEdicaoEquipe", () => {
  it("aceita dados válidos sem trocar senha", () => {
    expect(validarEdicaoEquipe(base)).toBeNull();
  });

  it("exige nome", () => {
    expect(validarEdicaoEquipe({ ...base, nome: "   " })).toBe("Informe o nome.");
  });

  it("exige e-mail", () => {
    expect(validarEdicaoEquipe({ ...base, email: "" })).toBe("Informe o e-mail.");
  });

  it("exige @ no e-mail", () => {
    expect(validarEdicaoEquipe({ ...base, email: "ana.costa" })).toBe(
      "Informe um e-mail válido.",
    );
  });

  it("rejeita senhas diferentes", () => {
    expect(
      validarEdicaoEquipe({ ...base, senha: "123456", senha2: "654321" }),
    ).toBe("As senhas não coincidem.");
  });

  it("rejeita senha com menos de 6 caracteres", () => {
    expect(
      validarEdicaoEquipe({ ...base, senha: "12345", senha2: "12345" }),
    ).toBe("A senha deve ter no mínimo 6 caracteres.");
  });

  it("aceita senha nova com 6 caracteres iguais", () => {
    expect(
      validarEdicaoEquipe({ ...base, senha: "123456", senha2: "123456" }),
    ).toBeNull();
  });
});

describe("payloadAtualizarUsuario", () => {
  it("não envia senha se os campos estão vazios", () => {
    expect(payloadAtualizarUsuario(base)).toEqual({
      p_user_id: "u1",
      p_nome: "Ana Costa",
      p_email: "ana.costa@vivaz.local",
      p_ativo: true,
      p_propriedade_id: "prop-1",
      p_senha: undefined,
    });
  });

  it("local vazio vira null (todos os locais)", () => {
    expect(payloadAtualizarUsuario({ ...base, propriedadeId: "" }).p_propriedade_id).toBeNull();
  });

  it("envia senha só quando preenchida", () => {
    const p = payloadAtualizarUsuario({
      ...base,
      senha: "abcdef",
      senha2: "abcdef",
    });
    expect(p.p_senha).toBe("abcdef");
  });
});

describe("mapaEmails", () => {
  it("monta mapa id → e-mail", () => {
    expect(
      mapaEmails([
        { id: "a", email: "a@vivaz.local" },
        { id: "b", email: "b@vivaz.local" },
      ]),
    ).toEqual({ a: "a@vivaz.local", b: "b@vivaz.local" });
  });

  it("lista vazia vira objeto vazio", () => {
    expect(mapaEmails(null)).toEqual({});
  });
});

describe("rotuloUltimaAlteracao", () => {
  it("explica quando nunca alterou", () => {
    expect(rotuloUltimaAlteracao(null)).toBe("Ainda não houve alteração");
  });
});
