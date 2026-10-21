import { describe, expect, it } from "vitest";
import {
  ambientesMarcados,
  mapaEmails,
  payloadAtualizarUsuario,
  payloadDefinirAmbientes,
  payloadDefinirAvisos,
  payloadDefinirGovernanca,
  rotuloAmbientes,
  rotuloUltimaAlteracao,
  validarEdicaoEquipe,
  validarExclusaoConta,
} from "@/lib/equipe-edicao";

const base = {
  userId: "u1",
  nome: "Ana Costa",
  email: "ana.costa@vivaz.local",
  senha: "",
  senha2: "",
  ativo: true,
  propriedadeId: "prop-1",
  role: "colaborador" as const,
  ambientes: ["manutencao"] as const,
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

  it("solicitante precisa de Manutenção, TI ou os dois", () => {
    expect(
      validarEdicaoEquipe({ ...base, role: "solicitante", ambientes: [] as const }),
    ).toBe(
      "Marque Manutenção, TI ou os dois.",
    );
  });

  it("aceita deixar a pessoa sem nenhum aviso", () => {
    expect(
      validarEdicaoEquipe({
        ...base,
        role: "admin",
        ambientes: ["manutencao", "ti"],
        avisos: [],
      }),
    ).toBeNull();
    expect(
      payloadDefinirAvisos({ userId: "u1", ambientes: ["manutencao"], avisos: [] }),
    ).toEqual({ p_user_id: "u1", p_avisos: [] });
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
      p_role: "colaborador",
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

describe("ambientes", () => {
  it("monta a lista marcada", () => {
    expect(ambientesMarcados(true, true)).toEqual(["manutencao", "ti"]);
    expect(ambientesMarcados(false, true)).toEqual(["ti"]);
  });

  it("rótulo para a lista da equipe", () => {
    expect(rotuloAmbientes(["manutencao", "ti"])).toBe("Manutenção e TI");
    expect(rotuloAmbientes(["ti"])).toBe("TI");
    expect(rotuloAmbientes(undefined)).toBe("Manutenção");
    expect(rotuloAmbientes(["manutencao", "ti", "checklist"])).toBe(
      "Manutenção, TI e Checklist",
    );
    expect(rotuloAmbientes(["checklist"])).toBe("Checklist");
  });

  it("Checklist entra nos ambientes e grava o perfil", () => {
    const so = { ...base, ambientes: [] as const, checklist: true, perfilChecklist: "lider" as const };
    expect(validarEdicaoEquipe(so)).toBeNull();
    expect(payloadDefinirAmbientes(so).p_ambientes).toEqual(["checklist"]);
    expect(payloadDefinirGovernanca(so)).toEqual({ p_user_id: "u1", p_papel: "lider" });
    expect(payloadDefinirGovernanca({ ...so, checklist: false }).p_papel).toBeNull();
    expect(payloadDefinirGovernanca({ ...so, role: "admin" }).p_papel).toBeNull();
  });

  it("sem nenhum ambiente marcado pede pelo menos um", () => {
    expect(validarEdicaoEquipe({ ...base, ambientes: [] as const, checklist: false })).toBe(
      "Marque Manutenção, TI ou Checklist.",
    );
  });

  it("envia o papel escolhido", () => {
    expect(payloadAtualizarUsuario({ ...base, role: "admin" as const }).p_role).toBe(
      "admin",
    );
  });

  it("administrador só de TI vai no payload de ambientes", () => {
    expect(
      payloadDefinirAmbientes({ ...base, ambientes: ["ti"] as const }),
    ).toEqual({ p_user_id: "u1", p_ambientes: ["ti"] });
  });

  it("grava só o aviso dos painéis que a pessoa vê", () => {
    expect(
      payloadDefinirAvisos({
        userId: "u1",
        ambientes: ["manutencao", "ti"],
        avisos: ["ti"],
      }),
    ).toEqual({ p_user_id: "u1", p_avisos: ["ti"] });
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

describe("validarExclusaoConta", () => {
  it("bloqueia apagar a própria conta", () => {
    expect(
      validarExclusaoConta({
        confirmacao: "EXCLUIR",
        alvoId: "eu",
        meuId: "eu",
      }),
    ).toBe("Você não pode apagar a própria conta.");
  });

  it("pede a palavra EXCLUIR", () => {
    expect(
      validarExclusaoConta({
        confirmacao: "apagar",
        alvoId: "outro",
        meuId: "eu",
      }),
    ).toBe("Digite EXCLUIR para confirmar.");
  });

  it("aceita EXCLUIR em outra conta", () => {
    expect(
      validarExclusaoConta({
        confirmacao: "excluir",
        alvoId: "outro",
        meuId: "eu",
      }),
    ).toBeNull();
  });
});
