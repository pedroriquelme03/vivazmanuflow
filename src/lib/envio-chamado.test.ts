import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import {
  type ChamadoPendente,
  SemConexao,
  ehFalhaDeRede,
  enviarChamado,
} from "@/lib/envio-chamado";

function item(extra: Partial<ChamadoPendente> = {}): ChamadoPendente {
  return {
    chave: "c1",
    criadoEm: "2026-11-04T10:00:00.000Z",
    ambiente: "manutencao",
    quemSolicita: "s1",
    titulo: "Ar não gela",
    descricao: "",
    sublocal: "Quarto 204",
    sistemaId: "",
    eventoId: "",
    projetoId: "",
    afetaExperiencia: false,
    arquivos: [],
    anexos: [],
    passosFeitos: [],
    ...extra,
  };
}

function supabaseFalso(
  respostas: Record<string, { data?: unknown; error: { message: string } | null }>,
) {
  const rpc = vi.fn(async (nome: string) => respostas[nome] ?? { data: null, error: null });
  return { rpc, cliente: { rpc } as unknown as SupabaseClient<Database> };
}

describe("ehFalhaDeRede", () => {
  it("reconhece erros de fetch do navegador", () => {
    expect(ehFalhaDeRede(new TypeError("Failed to fetch"))).toBe(true);
    expect(ehFalhaDeRede(new TypeError("Load failed"))).toBe(true);
    expect(ehFalhaDeRede("TypeError: NetworkError when attempting to fetch resource.")).toBe(true);
    expect(ehFalhaDeRede(new SemConexao())).toBe(true);
  });

  it("não confunde erro do banco com falta de internet", () => {
    expect(ehFalhaDeRede(new Error("Solicitante inválido"))).toBe(false);
  });
});

describe("enviarChamado", () => {
  it("abre com a chave e grava o local", async () => {
    const { rpc, cliente } = supabaseFalso({
      abrir_demanda_com_chave: { data: [{ token: "t1", demanda_id: "d1" }], error: null },
    });
    const pendente = item();
    await expect(enviarChamado(cliente, pendente)).resolves.toBe("t1");
    expect(rpc).toHaveBeenCalledWith(
      "abrir_demanda_com_chave",
      expect.objectContaining({ p_chave: "c1", p_titulo: "Ar não gela" }),
    );
    expect(rpc).toHaveBeenCalledWith("definir_sublocal", {
      p_token: "t1",
      p_sublocal: "Quarto 204",
    });
    expect(pendente.passosFeitos).toEqual(["local"]);
  });

  it("cai para abrir_demanda quando o banco não tem a função nova", async () => {
    const { rpc, cliente } = supabaseFalso({
      abrir_demanda_com_chave: {
        error: { message: "Could not find the function in the schema cache" },
      },
      abrir_demanda: { data: [{ token: "t2", demanda_id: "d2" }], error: null },
    });
    await expect(enviarChamado(cliente, item())).resolves.toBe("t2");
    expect(rpc).toHaveBeenCalledWith("abrir_demanda", expect.anything());
  });

  it("no reenvio não cria de novo nem repete passo feito", async () => {
    const { rpc, cliente } = supabaseFalso({});
    const pendente = item({
      token: "t1",
      demandaId: "d1",
      afetaExperiencia: true,
      passosFeitos: ["local"],
    });
    await enviarChamado(cliente, pendente);
    expect(rpc.mock.calls.map(([nome]) => nome)).toEqual([
      "aplicar_experiencia_hospede",
    ]);
  });

  it("falha de rede no meio vira SemConexao e guarda o progresso", async () => {
    const { cliente } = supabaseFalso({
      abrir_demanda_com_chave: { data: [{ token: "t1", demanda_id: "d1" }], error: null },
      definir_sublocal: { error: { message: "TypeError: Failed to fetch" } },
    });
    const pendente = item();
    const aoAvancar = vi.fn();
    await expect(enviarChamado(cliente, pendente, aoAvancar)).rejects.toBeInstanceOf(
      SemConexao,
    );
    expect(pendente.token).toBe("t1");
    expect(aoAvancar).toHaveBeenCalledTimes(1);
  });
});
