import { describe, expect, it } from "vitest";
import {
  chamadoAindaAberto,
  equipePodeMandarMensagem,
  juntarMensagens,
  parseChatChamado,
  recursoChatAusente,
  textoMensagemValido,
  validarFechamentoSolicitante,
} from "./chamado-chat";

describe("textoMensagemValido", () => {
  it("exige texto", () => {
    expect(textoMensagemValido("   ")).toBe("Escreva a mensagem.");
  });

  it("aceita mensagem comum", () => {
    expect(textoMensagemValido("O computador ainda não liga.")).toBeNull();
  });
});

describe("validarFechamentoSolicitante", () => {
  it("pede sim ou não", () => {
    expect(validarFechamentoSolicitante(null, "ok", "aberta")).toBe(
      "Informe se foi resolvido.",
    );
  });

  it("pede descrição", () => {
    expect(validarFechamentoSolicitante(true, "  ", "aberta")).toBe(
      "Descreva o que aconteceu.",
    );
  });

  it("não fecha de novo", () => {
    expect(validarFechamentoSolicitante(true, "ok", "concluida")).toBe(
      "Este chamado já foi encerrado.",
    );
  });

  it("aceita sim com descrição", () => {
    expect(validarFechamentoSolicitante(true, "Já funciona", "em_andamento")).toBeNull();
  });
});

describe("chamadoAindaAberto", () => {
  it("concluída e cancelada estão fechadas", () => {
    expect(chamadoAindaAberto("concluida")).toBe(false);
    expect(chamadoAindaAberto("aberta")).toBe(true);
  });
});

describe("equipePodeMandarMensagem", () => {
  it("bloqueia chamado ainda na fila", () => {
    expect(equipePodeMandarMensagem(null, "aberta")).toBe(false);
    expect(equipePodeMandarMensagem("colab", "aberta")).toBe(false);
  });

  it("libera depois de atribuir", () => {
    expect(equipePodeMandarMensagem("colab", "atribuida")).toBe(true);
    expect(equipePodeMandarMensagem("colab", "em_andamento")).toBe(true);
  });
});

describe("juntarMensagens", () => {
  it("entra mensagem nova sem apagar as antigas", () => {
    const atual = [
      {
        id: "1",
        autor: "solicitante" as const,
        autor_nome: "Ana",
        texto: "Oi",
        criado_em: "2026-10-06T12:00:00Z",
      },
    ];
    const juntas = juntarMensagens(atual, [
      {
        id: "2",
        autor: "equipe",
        autor_nome: "Tiago",
        texto: "Já vi",
        criado_em: "2026-10-06T12:01:00Z",
      },
    ]);
    expect(juntas.map((m) => m.id)).toEqual(["1", "2"]);
  });
});

describe("parseChatChamado", () => {
  it("lê ambiente, status e mensagens", () => {
    const dados = parseChatChamado({
      ambiente: "ti",
      status: "aberta",
      mensagens: [
        {
          id: "1",
          autor: "solicitante",
          autor_nome: "Ana",
          texto: "Não imprime",
          criado_em: "2026-10-06T12:00:00Z",
        },
      ],
    });
    expect(dados.ambiente).toBe("ti");
    expect(dados.status).toBe("aberta");
    expect(dados.mensagens).toHaveLength(1);
    expect(dados.mensagens[0]?.texto).toBe("Não imprime");
  });
});

describe("recursoChatAusente", () => {
  it("reconhece RPC que ainda não existe", () => {
    expect(
      recursoChatAusente(
        "Could not find the function public.listar_mensagens_chamado in the schema cache",
      ),
    ).toBe(true);
  });
});
