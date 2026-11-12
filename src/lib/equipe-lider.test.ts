import { describe, expect, it } from "vitest";
import {
  abasDoLider,
  ambientesDoCadastro,
  ambientesFinais,
  pessoaDoSistema,
  sistemasDoLider,
  validarCadastroLider,
  type CadastroLider,
} from "./equipe-lider";

const cadastro = (over: Partial<CadastroLider> = {}): CadastroLider => ({
  nome: "João",
  email: "joao@vivaz.com.br",
  senha: "segredo",
  role: "colaborador",
  ambientes: ["manutencao"],
  propriedadeId: "",
  ...over,
});

describe("sistemas e abas do líder", () => {
  it("sistemas são Manutenção e/ou TI; Checklist não conta", () => {
    expect(sistemasDoLider(["manutencao", "checklist"])).toEqual(["manutencao"]);
    expect(sistemasDoLider(["ti"])).toEqual(["ti"]);
    expect(sistemasDoLider(null)).toEqual([]);
  });

  it("Solicitações só para a TI", () => {
    expect(abasDoLider(["manutencao"])).toEqual(["Equipe"]);
    expect(abasDoLider(["ti"])).toEqual(["Equipe", "Solicitações"]);
  });
});

describe("pessoaDoSistema", () => {
  it("colaborador só da Manutenção é do líder da Manutenção, não do da TI", () => {
    const tecnico = { role: "colaborador", ambientes: ["manutencao", "checklist"] };
    expect(pessoaDoSistema(tecnico, ["manutencao"])).toBe(true);
    expect(pessoaDoSistema(tecnico, ["ti"])).toBe(false);
  });

  it("quem está nos dois sistemas só o líder dos dois edita", () => {
    const dosDois = { role: "colaborador", ambientes: ["manutencao", "ti"] };
    expect(pessoaDoSistema(dosDois, ["manutencao"])).toBe(false);
    expect(pessoaDoSistema(dosDois, ["manutencao", "ti"])).toBe(true);
  });

  it("solicitante qualquer líder cuida; admin e líder, nunca", () => {
    expect(pessoaDoSistema({ role: "solicitante", ambientes: ["manutencao", "ti"] }, ["ti"])).toBe(true);
    expect(pessoaDoSistema({ role: "admin", ambientes: ["manutencao"] }, ["manutencao"])).toBe(false);
    expect(pessoaDoSistema({ role: "lider", ambientes: ["manutencao"] }, ["manutencao"])).toBe(false);
  });
});

describe("cadastro pelo líder", () => {
  it("passa colaborador do próprio sistema", () => {
    expect(validarCadastroLider(cadastro(), ["manutencao"], true)).toBeNull();
  });

  it("barra líder/admin, outro sistema e senha curta", () => {
    expect(validarCadastroLider(cadastro({ role: "lider" }), ["manutencao"], true)).toMatch(/administrador/);
    expect(validarCadastroLider(cadastro({ ambientes: ["ti"] }), ["manutencao"], true)).toMatch(/seu sistema/);
    expect(validarCadastroLider(cadastro({ senha: "1" }), ["manutencao"], true)).toMatch(/6 caracteres/);
    expect(validarCadastroLider(cadastro({ senha: "" }), ["manutencao"], false)).toBeNull();
  });

  it("solicitante vai para os dois sistemas; edição mantém o Checklist", () => {
    expect(ambientesDoCadastro({ role: "solicitante", ambientes: [] })).toEqual(["manutencao", "ti"]);
    expect(ambientesDoCadastro({ role: "colaborador", ambientes: ["manutencao", "checklist"] })).toEqual(["manutencao"]);
    expect(ambientesFinais(["manutencao", "checklist"], ["manutencao"], ["manutencao"])).toEqual(["manutencao", "checklist"]);
    expect(ambientesFinais(["manutencao", "ti"], [], ["manutencao"])).toEqual(["ti"]);
  });
});
