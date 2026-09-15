import { describe, expect, it } from "vitest";
import {
  aplicarPegarNoPainel,
  aplicarReloadMinhas,
  demandaApareceNasMinhas,
  demandaNoHistoricoColab,
  filasDoPainelColaborador,
} from "@/lib/colaborador-fila";

const UID = "colab-1";

describe("demandaApareceNasMinhas", () => {
  it("mostra atribuída de projeto (não some da tela)", () => {
    expect(
      demandaApareceNasMinhas(
        {
          colaborador_id: UID,
          status: "atribuida",
          arquivado: false,
          projeto_id: "p-teste",
        },
        UID,
      ),
    ).toBe(true);
  });

  it("mostra em andamento da fila normal", () => {
    expect(
      demandaApareceNasMinhas(
        {
          colaborador_id: UID,
          status: "em_andamento",
          arquivado: false,
          projeto_id: null,
        },
        UID,
      ),
    ).toBe(true);
  });

  it("não some só porque tem projeto_id", () => {
    const comProjeto = demandaApareceNasMinhas(
      {
        colaborador_id: UID,
        status: "atribuida",
        arquivado: false,
        projeto_id: "abc",
      },
      UID,
    );
    const semProjeto = demandaApareceNasMinhas(
      {
        colaborador_id: UID,
        status: "atribuida",
        arquivado: false,
        projeto_id: null,
      },
      UID,
    );
    expect(comProjeto).toBe(semProjeto);
  });

  it("esconde arquivada, de outro colaborador ou concluída", () => {
    expect(
      demandaApareceNasMinhas(
        { colaborador_id: UID, status: "atribuida", arquivado: true },
        UID,
      ),
    ).toBe(false);
    expect(
      demandaApareceNasMinhas(
        { colaborador_id: "outro", status: "atribuida", arquivado: false },
        UID,
      ),
    ).toBe(false);
    expect(
      demandaApareceNasMinhas(
        { colaborador_id: UID, status: "concluida", arquivado: false },
        UID,
      ),
    ).toBe(false);
    expect(
      demandaApareceNasMinhas(
        { colaborador_id: UID, status: "aberta", arquivado: false },
        UID,
      ),
    ).toBe(false);
  });
});

describe("filasDoPainelColaborador", () => {
  const minhas = [
    { id: "m1", projeto_id: null },
    { id: "m2", projeto_id: "p1" },
  ];
  const abertas = [
    { id: "g1", projeto_id: null },
    { id: "p-aberta", projeto_id: "p1" },
  ];

  it("Minhas guarda fila e projeto juntos", () => {
    const f = filasDoPainelColaborador(minhas, abertas);
    expect(f.minhas.map((d) => d.id)).toEqual(["m1", "m2"]);
  });

  it("Gerais só pool sem projeto", () => {
    const f = filasDoPainelColaborador(minhas, abertas);
    expect(f.gerais.map((d) => d.id)).toEqual(["g1"]);
  });

  it("aba Projetos só abertas de projeto, não as já pegues", () => {
    const f = filasDoPainelColaborador(minhas, abertas);
    expect(f.projetosAbertas.map((d) => d.id)).toEqual(["p-aberta"]);
    expect(f.projetosAbertas.some((d) => d.id === "m2")).toBe(false);
  });
});

describe("aplicarPegarNoPainel", () => {
  it("ao pegar demanda de projeto, vai para Minhas e sai das abertas", () => {
    const pega = { id: "tv", projeto_id: "p1" };
    const depois = aplicarPegarNoPainel(
      [{ id: "outra", projeto_id: null }],
      [
        { id: "tv", projeto_id: "p1" },
        { id: "g1", projeto_id: null },
      ],
      pega,
    );
    expect(depois.minhas.map((d) => d.id)).toEqual(["tv", "outra"]);
    expect(depois.abertas.map((d) => d.id)).toEqual(["g1"]);
  });
});

describe("aplicarReloadMinhas", () => {
  const atuais = [{ id: "tv" }];

  it("não apaga Minhas se o servidor voltar vazio logo depois de pegar", () => {
    expect(aplicarReloadMinhas(atuais, [], "tv")).toEqual(atuais);
  });

  it("não apaga se der erro de leitura", () => {
    expect(aplicarReloadMinhas(atuais, null, null, true)).toEqual(atuais);
  });

  it("troca pela lista do servidor quando a recém-pega veio nela", () => {
    const servidor = [{ id: "tv" }, { id: "outra" }];
    expect(aplicarReloadMinhas(atuais, servidor, "tv")).toEqual(servidor);
  });
});

describe("demandaNoHistoricoColab", () => {
  const agora = Date.parse("2026-09-15T12:00:00.000Z");
  const seteDias = agora - 7 * 86400_000;

  it("não lista atribuída nas Minhas como histórico", () => {
    expect(
      demandaNoHistoricoColab(
        { status: "atribuida", arquivado: false, concluido_em: null },
        seteDias,
      ),
    ).toBe(false);
  });

  it("lista concluída recente e ignora arquivada", () => {
    expect(
      demandaNoHistoricoColab(
        {
          status: "concluida",
          arquivado: false,
          concluido_em: "2026-09-14T18:00:00.000Z",
        },
        seteDias,
      ),
    ).toBe(true);
    expect(
      demandaNoHistoricoColab(
        {
          status: "concluida",
          arquivado: true,
          concluido_em: "2026-09-14T18:00:00.000Z",
        },
        seteDias,
      ),
    ).toBe(false);
  });
});
