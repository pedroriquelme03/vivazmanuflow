import { describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import type { ChamadoPendente } from "@/lib/envio-chamado";
import { donoAtual, itensDaPessoa } from "@/lib/fila-offline";

function item(chave: string, donoId?: string): ChamadoPendente {
  return {
    chave,
    criadoEm: "2026-11-04T10:00:00.000Z",
    donoId,
    ambiente: "manutencao",
    quemSolicita: "s1",
    titulo: chave,
    descricao: "",
    sublocal: "Quarto 204",
    sistemaId: "",
    eventoId: "",
    projetoId: "",
    afetaExperiencia: false,
    arquivos: [],
    anexos: [],
    passosFeitos: [],
  };
}

describe("itensDaPessoa", () => {
  const fila = [item("da-ana", "ana"), item("do-beto", "beto"), item("antigo")];

  it("no celular compartilhado, cada um só vê e envia o seu", () => {
    expect(itensDaPessoa(fila, "ana").map((i) => i.chave)).toEqual(["da-ana", "antigo"]);
    expect(itensDaPessoa(fila, "beto").map((i) => i.chave)).toEqual(["do-beto", "antigo"]);
  });

  it("sem ninguém logado, não envia nada", () => {
    expect(itensDaPessoa(fila, null)).toEqual([]);
  });
});

describe("donoAtual", () => {
  function cliente(session: { user: { id: string } } | null) {
    return {
      auth: { getSession: async () => ({ data: { session } }) },
    } as unknown as SupabaseClient<Database>;
  }

  it("lê o usuário da sessão salva", async () => {
    expect(await donoAtual(cliente({ user: { id: "ana" } }))).toBe("ana");
  });

  it("sem sessão, ninguém", async () => {
    expect(await donoAtual(cliente(null))).toBeNull();
  });
});
