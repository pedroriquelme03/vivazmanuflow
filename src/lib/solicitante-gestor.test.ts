import { describe, expect, it, vi } from "vitest";
import {
  garantirSolicitantesGestor,
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
