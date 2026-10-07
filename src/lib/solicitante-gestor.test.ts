import { describe, expect, it, vi } from "vitest";
import {
  decidirSolicitanteRegistro,
  garantirSolicitantesGestor,
  idSolicitantePorNome,
  idsSolicitanteDoNome,
  solicitantesUnicos,
} from "@/lib/solicitante-gestor";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

describe("solicitantesUnicos", () => {
  it("mantém um nome por local", () => {
    const lista = [
      { id: "1", nome: "Ana", propriedade_id: "v" },
      { id: "2", nome: " ana ", propriedade_id: "v" },
      { id: "3", nome: "Ana", propriedade_id: "a" },
    ];
    const unicos = solicitantesUnicos(lista);
    expect(unicos).toHaveLength(2);
    expect(unicos.map((s) => s.id)).toEqual(["1", "3"]);
  });
});

describe("idSolicitantePorNome", () => {
  const lista = [
    { id: "a", nome: "Pedro Riquelme", propriedade_id: "v" },
    { id: "b", nome: "Ana", propriedade_id: "v" },
    { id: "c", nome: "Pedro Riquelme", propriedade_id: "x" },
  ];

  it("acha o usuário logado no local", () => {
    expect(idSolicitantePorNome(lista, " pedro riquelme ", "v")).toBe("a");
  });

  it("não mistura local", () => {
    expect(idSolicitantePorNome(lista, "Pedro Riquelme", "x")).toBe("c");
  });

  it("vazio se não achar", () => {
    expect(idSolicitantePorNome(lista, "João", "v")).toBe("");
  });
});

describe("idsSolicitanteDoNome", () => {
  it("pega todos os cadastros com o mesmo nome", () => {
    expect(
      idsSolicitanteDoNome(
        [
          { id: "a", nome: "Eder Josué" },
          { id: "b", nome: "Ana" },
          { id: "c", nome: " eder josué " },
        ],
        "Eder Josué",
      ),
    ).toEqual(["a", "c"]);
  });
});

function clienteFake(opts: {
  existentes: { nome: string; propriedade_id: string }[];
  insertError?: { message: string } | null;
}) {
  const insert = vi.fn().mockResolvedValue({ error: opts.insertError ?? null });
  const inFn = vi.fn().mockResolvedValue({ data: opts.existentes, error: null });
  const select = vi.fn().mockReturnValue({ in: inFn });
  const from = vi.fn((tabela: string) => {
    if (tabela === "solicitantes") {
      return { select, insert };
    }
    return {};
  });
  return { from, insert, inFn } as unknown as {
    from: typeof from;
    insert: typeof insert;
    inFn: typeof inFn;
  } & SupabaseClient<Database>;
}

describe("decidirSolicitanteRegistro", () => {
  const lista = [
    { id: "ana", nome: "Ana Paula", propriedade_id: "v" },
    { id: "jose", nome: "José", propriedade_id: "v" },
    { id: "gabriel", nome: "Gabriel", propriedade_id: "v" },
    { id: "ana-outra", nome: "Ana Paula", propriedade_id: "x" },
  ];

  it("usa a pessoa escolhida na lista", () => {
    expect(decidirSolicitanteRegistro(lista, "v", "ana", "")).toEqual({
      tipo: "existente",
      id: "ana",
    });
  });

  it("não troca a escolha pelo usuário logado", () => {
    expect(decidirSolicitanteRegistro(lista, "v", "ana", "  ")).toEqual({
      tipo: "existente",
      id: "ana",
    });
  });

  it("nome digitado de quem já está cadastrado reaproveita o cadastro", () => {
    expect(
      decidirSolicitanteRegistro(lista, "v", "gabriel", "jose"),
    ).toEqual({ tipo: "existente", id: "jose" });
  });

  it("ignora acento e maiúscula ao achar o cadastro", () => {
    expect(decidirSolicitanteRegistro(lista, "v", "", "JOSE")).toEqual({
      tipo: "existente",
      id: "jose",
    });
  });

  it("não mistura o mesmo nome de outro local", () => {
    expect(decidirSolicitanteRegistro(lista, "x", "", "Ana Paula")).toEqual({
      tipo: "existente",
      id: "ana-outra",
    });
  });

  it("nome que não existe pede criação, sem usar outra pessoa", () => {
    expect(decidirSolicitanteRegistro(lista, "v", "gabriel", "Visitante")).toEqual(
      { tipo: "criar", nome: "Visitante" },
    );
  });

  it("sem lista e sem nome pede para informar", () => {
    expect(decidirSolicitanteRegistro(lista, "v", "", "")).toEqual({
      tipo: "erro",
      mensagem: "Escolha quem solicitou ou digite o nome.",
    });
  });

  it("id de outro local não vale", () => {
    expect(decidirSolicitanteRegistro(lista, "v", "ana-outra", "")).toEqual({
      tipo: "erro",
      mensagem: "Escolha quem solicitou ou digite o nome.",
    });
  });
});

describe("garantirSolicitantesGestor (integração com cliente mock)", () => {
  const props = [
    { id: "vivaz", ativo: true },
    { id: "aqua", ativo: true },
    { id: "off", ativo: false },
  ];

  it("não cria se o nome já existe no local", async () => {
    const sb = clienteFake({
      existentes: [{ nome: "João Líder", propriedade_id: "vivaz" }],
    });
    const criou = await garantirSolicitantesGestor(sb, {
      nome: "João Líder",
      propriedadeId: "vivaz",
      propriedades: props,
    });
    expect(criou).toBe(false);
    expect(sb.insert).not.toHaveBeenCalled();
  });

  it("cria só nos locais ativos quando propriedade é todas", async () => {
    const sb = clienteFake({ existentes: [] });
    const criou = await garantirSolicitantesGestor(sb, {
      nome: "Maria Admin",
      propriedadeId: null,
      propriedades: props,
    });
    expect(criou).toBe(true);
    expect(sb.insert).toHaveBeenCalledWith([
      { nome: "Maria Admin", propriedade_id: "vivaz", ativo: true },
      { nome: "Maria Admin", propriedade_id: "aqua", ativo: true },
    ]);
  });

  it("não cria se o nome está vazio", async () => {
    const sb = clienteFake({ existentes: [] });
    const criou = await garantirSolicitantesGestor(sb, {
      nome: "  ",
      propriedadeId: "vivaz",
      propriedades: props,
    });
    expect(criou).toBe(false);
    expect(sb.from).not.toHaveBeenCalled();
  });
});
