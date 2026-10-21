import { describe, expect, it } from "vitest";
import {
  avisosEfetivos,
  chamadoDoWebhook,
  destinoDoAviso,
  eventoDoWebhook,
  recebeAvisoChamado,
  recebeAvisoNovoChamado,
  rotuloAvisos,
  textoAviso,
  textoResposta,
} from "@/lib/aviso-push";

describe("recebeAvisoChamado", () => {
  it("manda manutenção só para quem tem esse quadro", () => {
    expect(
      recebeAvisoChamado(
        { role: "colaborador", ambientes: ["manutencao"], ativo: true },
        "manutencao",
      ),
    ).toBe(true);
    expect(
      recebeAvisoChamado(
        { role: "lider", ambientes: ["ti"], ativo: true },
        "manutencao",
      ),
    ).toBe(false);
    expect(
      recebeAvisoChamado(
        { role: "admin", ambientes: ["ti"], ativo: true },
        "manutencao",
      ),
    ).toBe(false);
  });

  it("manda TI só para quem tem esse quadro", () => {
    expect(
      recebeAvisoChamado(
        { role: "colaborador", ambientes: ["ti"], ativo: true },
        "ti",
      ),
    ).toBe(true);
    expect(
      recebeAvisoChamado(
        { role: "admin", ambientes: ["manutencao"], ativo: true },
        "ti",
      ),
    ).toBe(false);
    expect(
      recebeAvisoChamado(
        { role: "admin", ambientes: ["ti", "manutencao"], ativo: true },
        "ti",
      ),
    ).toBe(false);
    expect(
      recebeAvisoChamado(
        {
          role: "admin",
          ambientes: ["ti", "manutencao"],
          avisos: ["ti"],
          ativo: true,
        },
        "ti",
      ),
    ).toBe(true);
    expect(
      recebeAvisoChamado(
        {
          role: "colaborador",
          ambientes: ["ti", "manutencao"],
          ativo: true,
        },
        "ti",
      ),
    ).toBe(true);
    expect(
      recebeAvisoChamado(
        { role: "lider", ambientes: ["manutencao"], ativo: true },
        "ti",
      ),
    ).toBe(false);
  });

  it("admin e líder nos dois começam só na manutenção", () => {
    expect(
      avisosEfetivos({
        role: "lider",
        ambientes: ["manutencao", "ti"],
        avisos: null,
      }),
    ).toEqual(["manutencao"]);
    expect(
      avisosEfetivos({
        role: "admin",
        ambientes: ["ti"],
        avisos: ["manutencao"],
      }),
    ).toEqual(["ti"]);
  });

  it("lista vazia gravada não manda aviso de nenhum quadro", () => {
    const semAviso = {
      role: "colaborador",
      ambientes: ["manutencao"],
      avisos: [],
      ativo: true,
    };
    expect(avisosEfetivos(semAviso)).toEqual([]);
    expect(recebeAvisoChamado(semAviso, "manutencao")).toBe(false);
    expect(
      recebeAvisoChamado(
        { role: "lider", ambientes: ["manutencao", "ti"], avisos: [], ativo: true },
        "ti",
      ),
    ).toBe(false);
    expect(rotuloAvisos([])).toBe("nenhum");
    expect(rotuloAvisos(["manutencao", "ti"])).toBe("Manutenção e TI");
  });

  it("quem está em um quadro só pode desligar o aviso dele", () => {
    expect(
      avisosEfetivos({ role: "colaborador", ambientes: ["ti"], avisos: null }),
    ).toEqual(["ti"]);
    expect(
      avisosEfetivos({ role: "colaborador", ambientes: ["ti"], avisos: ["ti"] }),
    ).toEqual(["ti"]);
  });

  it("não avisa quem abriu o chamado", () => {
    const admin = {
      id: "admin-1",
      role: "admin",
      ambientes: ["ti"],
      ativo: true,
    };
    expect(recebeAvisoNovoChamado(admin, "ti", "admin-1")).toBe(false);
    expect(recebeAvisoNovoChamado(admin, "ti", "outra-pessoa")).toBe(true);
  });

  it("não avisa solicitante nem pessoa inativa", () => {
    expect(
      recebeAvisoChamado(
        { role: "solicitante", ambientes: ["ti", "manutencao"], ativo: true },
        "ti",
      ),
    ).toBe(false);
    expect(
      recebeAvisoChamado(
        { role: "admin", ambientes: ["ti"], ativo: false },
        "ti",
      ),
    ).toBe(false);
  });
});

describe("texto e destino", () => {
  it("abre o painel do colaborador e o quadro do líder", () => {
    expect(destinoDoAviso("colaborador")).toBe("/colaborador");
    expect(destinoDoAviso("admin")).toBe("/lider");
    expect(destinoDoAviso("solicitante")).toBe("/solicitante?aba=chamados");
  });

  it("separa o título pelo quadro", () => {
    expect(textoAviso("ti", "Wi-Fi caiu").titulo).toBe("Novo chamado de TI");
    expect(textoAviso("manutencao", "Lâmpada").titulo).toBe(
      "Novo chamado de Manutenção",
    );
  });

  it("lê o chamado novo do webhook", () => {
    expect(
      chamadoDoWebhook({
        type: "INSERT",
        record: { titulo: "Porta", ambiente: "ti" },
      }),
    ).toEqual({ titulo: "Porta", quadro: "ti" });
    expect(chamadoDoWebhook({ record: { titulo: "   " } })).toBeNull();
    expect(
      eventoDoWebhook({
        table: "demanda_mensagens",
        record: { autor: "equipe", demanda_id: "d1", texto: "Pronto" },
      }),
    ).toEqual({ tipo: "resposta", demandaId: "d1", texto: "Pronto" });
    expect(textoResposta("Porta", "Já estou a caminho").titulo).toBe(
      "Resposta em Porta",
    );
  });
});
