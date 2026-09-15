import { describe, expect, it } from "vitest";
import {
  colaboradoresDoFiltroProjeto,
  ehFilaNormal,
  filtrarQuadroProjetos,
  projetosDoFiltroQuadro,
  validarCriacaoProjeto,
} from "@/lib/projeto-regras";

describe("validarCriacaoProjeto", () => {
  it("exige nome", () => {
    expect(validarCriacaoProjeto("  ", ["u1"])).toBe(
      "Informe o nome do projeto.",
    );
  });

  it("exige pelo menos uma pessoa", () => {
    expect(validarCriacaoProjeto("Reforma", [])).toBe(
      "Inclua pelo menos uma pessoa no projeto.",
    );
  });

  it("aceita nome e um membro", () => {
    expect(validarCriacaoProjeto("Reforma", ["u1"])).toBeNull();
  });

  it("aceita duas ou mais pessoas", () => {
    expect(validarCriacaoProjeto("TESTE 2", ["u1", "u2", "u3"])).toBeNull();
  });
});

describe("filtrarQuadroProjetos", () => {
  const itens = [
    { id: "a", projeto_id: null },
    { id: "b", projeto_id: "p1" },
    { id: "c", projeto_id: "p2" },
  ];

  it("fila normal ignora projetos", () => {
    expect(filtrarQuadroProjetos(itens, "fila").map((d) => d.id)).toEqual([
      "a",
    ]);
  });

  it("visão projetos omite a fila", () => {
    expect(filtrarQuadroProjetos(itens, "projetos").map((d) => d.id)).toEqual([
      "b",
      "c",
    ]);
  });

  it("filtra um projeto", () => {
    expect(
      filtrarQuadroProjetos(itens, "projetos", "p1").map((d) => d.id),
    ).toEqual(["b"]);
  });
});

describe("colaboradoresDoFiltroProjeto", () => {
  const pessoas = [{ id: "a" }, { id: "b" }, { id: "c" }];
  const membros = { p1: ["a", "b"], p2: ["c"] };

  it("um projeto: só os membros dele", () => {
    expect(
      colaboradoresDoFiltroProjeto(pessoas, membros, "p1", ["p1", "p2"]).map(
        (p) => p.id,
      ),
    ).toEqual(["a", "b"]);
  });

  it("todos os projetos do quadro: união dos membros", () => {
    expect(
      colaboradoresDoFiltroProjeto(pessoas, membros, "", ["p1", "p2"]).map(
        (p) => p.id,
      ),
    ).toEqual(["a", "b", "c"]);
  });

  it("projeto sem membros não lista a equipe inteira", () => {
    expect(
      colaboradoresDoFiltroProjeto(pessoas, membros, "p-vazio", ["p-vazio"]),
    ).toEqual([]);
  });
});

describe("projetosDoFiltroQuadro", () => {
  it("mostra projeto cadastrado mesmo sem demanda", () => {
    const lista = projetosDoFiltroQuadro(
      [
        { id: "p1", nome: "TESTE" },
        { id: "p2", nome: "TESTE 2" },
      ],
      [{ projeto_id: "p1", projeto: { nome: "TESTE" } }],
    );
    expect(lista.map((p) => p.nome)).toEqual(["TESTE", "TESTE 2"]);
  });
});

describe("ehFilaNormal", () => {
  it("vazio é fila normal", () => {
    expect(ehFilaNormal(null)).toBe(true);
    expect(ehFilaNormal("")).toBe(true);
    expect(ehFilaNormal("p1")).toBe(false);
  });
});
