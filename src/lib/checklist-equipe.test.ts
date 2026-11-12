import { describe, expect, it } from "vitest";
import {
  emailValido,
  mudancaDeSetores,
  outrosAmbientes,
  podeMexerNoAcesso,
  podeMudarLogin,
  podeMudarPerfil,
  rotuloPapelEquipe,
  soDoChecklist,
  validarEdicaoMembro,
  validarNovoMembro,
  type NovoMembro,
} from "./checklist-equipe";

const novo = (over: Partial<NovoMembro> = {}): NovoMembro => ({
  nome: "Ana Souza",
  email: "ana@vivaz.com.br",
  senha: "segredo",
  perfil: "camareira",
  setores: ["gov"],
  ...over,
});

describe("validarNovoMembro", () => {
  it("cadastro completo nos setores permitidos passa", () => {
    expect(validarNovoMembro(novo(), ["gov", "eventos"])).toBeNull();
  });

  it("aponta o que falta", () => {
    expect(validarNovoMembro(novo({ nome: " " }), ["gov"])).toBe("Informe o nome.");
    expect(validarNovoMembro(novo({ email: "ana" }), ["gov"])).toBe("Informe um e-mail válido.");
    expect(validarNovoMembro(novo({ senha: "123" }), ["gov"])).toMatch(/6 caracteres/);
    expect(validarNovoMembro(novo({ setores: [] }), ["gov"])).toBe("Marque pelo menos um setor.");
  });

  it("líder não dá acesso a setor que não é dele nem cria administrador", () => {
    expect(validarNovoMembro(novo({ setores: ["gov", "manutencao"] }), ["gov"])).toMatch(/seus setores/);
    expect(validarNovoMembro(novo({ perfil: "admin" as never }), ["gov"])).toMatch(/Aplicador ou Líder/);
  });
});

describe("equipe", () => {
  it("rótulos e outros ambientes", () => {
    expect(rotuloPapelEquipe("camareira")).toBe("Aplicador");
    expect(rotuloPapelEquipe("lider")).toBe("Líder");
    expect(rotuloPapelEquipe("admin")).toBe("Administrador");
    expect(outrosAmbientes(["checklist", "manutencao", "ti"])).toEqual(["Manutenção", "TI"]);
    expect(emailValido(" ana@vivaz.com.br ")).toBe(true);
  });

  it("ninguém mexe no próprio acesso nem no do administrador", () => {
    expect(podeMexerNoAcesso({ id: "u1", papel: "camareira" }, "u2")).toBe(true);
    expect(podeMexerNoAcesso({ id: "u2", papel: "lider" }, "u2")).toBe(false);
    expect(podeMexerNoAcesso({ id: "u3", papel: "admin" }, "u2")).toBe(false);
  });

  it("login só de quem é só do Checklist; perfil, o admin muda de todos menos admin", () => {
    const soChecklist = { ambientes: ["checklist"], papel: "camareira" };
    const daManutencao = { ambientes: ["checklist", "manutencao"], papel: "lider" };
    expect(soDoChecklist(soChecklist)).toBe(true);
    expect(podeMudarLogin(soChecklist)).toBe(true);
    expect(podeMudarLogin(daManutencao)).toBe(false);
    expect(podeMudarPerfil(daManutencao, false)).toBe(false);
    expect(podeMudarPerfil(daManutencao, true)).toBe(true);
    expect(podeMudarPerfil({ ambientes: ["checklist"], papel: "admin" }, true)).toBe(false);
  });

  it("setores: só mexe nos permitidos e mantém os outros", () => {
    expect(mudancaDeSetores(["gov", "aq"], ["eventos"], ["gov", "eventos"])).toEqual({
      inserir: ["eventos"],
      remover: ["gov"],
    });
  });

  it("senha nova curta não passa; vazia mantém", () => {
    const base = { id: "u", perfil: "camareira" as const, ativo: true, setores: [] };
    expect(validarEdicaoMembro({ ...base, senha: "" })).toBeNull();
    expect(validarEdicaoMembro({ ...base, senha: "123" })).toMatch(/6 caracteres/);
  });
});
