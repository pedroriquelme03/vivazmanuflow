import { describe, expect, it } from "vitest";
import {
  assinaturaSentryValida,
  decisaoAlerta,
  extrairAlertaSentry,
  montarDescricaoAlerta,
  prioridadeAlerta,
  sanitizarTexto,
  urlPermitida,
} from "@/lib/alerta-sentry";
import { createHmac } from "node:crypto";

describe("prioridade do alerta", () => {
  it("ignora o que não é produção", () => {
    expect(
      prioridadeAlerta({
        ambiente: "staging",
        nivel: "fatal",
        usuarios: 20,
        ocorrencias: 20,
      }),
    ).toBeNull();
  });

  it("fatal em produção vira Alta", () => {
    expect(
      prioridadeAlerta({
        ambiente: "Production",
        nivel: "fatal",
        usuarios: 1,
        ocorrencias: 1,
      }),
    ).toEqual({ prioridade: "alta", afetaExperiencia: true });
  });

  it("todo error em produção entra como Alta", () => {
    expect(
      prioridadeAlerta({
        ambiente: "production",
        nivel: "error",
        usuarios: 1,
        ocorrencias: 1,
      }),
    ).toEqual({ prioridade: "alta", afetaExperiencia: true });
  });

  it("ignora warning e info", () => {
    expect(
      prioridadeAlerta({
        ambiente: "production",
        nivel: "warning",
        usuarios: 9,
        ocorrencias: 20,
      }),
    ).toBeNull();
    expect(
      prioridadeAlerta({
        ambiente: "production",
        nivel: "info",
        usuarios: 1,
        ocorrencias: 1,
      }),
    ).toBeNull();
  });
});

describe("deduplicação", () => {
  it("cria quando não há chamado", () => {
    expect(decisaoAlerta(null, 1)).toEqual({ acao: "criar", historico: null });
  });

  it("atualiza a fila aberta e só anota quando a contagem dobra", () => {
    expect(
      decisaoAlerta({ status: "aberta", arquivado: false, ocorrencias: 4 }, 7),
    ).toEqual({ acao: "atualizar", historico: null });
    expect(
      decisaoAlerta(
        { status: "em_andamento", arquivado: false, ocorrencias: 4 },
        8,
      ),
    ).toEqual({
      acao: "atualizar",
      historico: "O erro passou de 4 para 8 ocorrências.",
    });
  });

  it("reabre o mesmo chamado quando o erro volta", () => {
    expect(
      decisaoAlerta(
        { status: "concluida", arquivado: false, ocorrencias: 3 },
        4,
      ),
    ).toEqual({ acao: "reabrir", historico: "O erro voltou no Sentry" });
    expect(
      decisaoAlerta({ status: "aberta", arquivado: true, ocorrencias: 3 }, 4),
    ).toEqual({ acao: "reabrir", historico: "O erro voltou no Sentry" });
  });
});

describe("sanitização", () => {
  it("redige token, senha e jwt", () => {
    const texto = sanitizarTexto(
      "falha Bearer abc.def senha?token=segredo eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIn0.assinatura",
    );
    expect(texto).not.toContain("abc.def");
    expect(texto).not.toContain("segredo");
    expect(texto).not.toContain("eyJhbGci");
    expect(texto).toContain("[redigido]");
  });

  it("aceita só link https e tira consulta com segredo", () => {
    expect(urlPermitida("http://sentry.io/issues/1")).toBeNull();
    expect(urlPermitida("https://vivaz.sentry.io/issues/1")).toBe(
      "https://vivaz.sentry.io/issues/1",
    );
    expect(
      urlPermitida("https://us.posthog.com/replay/abc?token=segredo"),
    ).toBe("https://us.posthog.com/replay/abc");
  });
});

describe("assinatura do webhook", () => {
  it("confere o corpo e rejeita alteração", () => {
    const corpo = '{"action":"triggered"}';
    const assinatura = createHmac("sha256", "segredo")
      .update(corpo, "utf8")
      .digest("hex");
    expect(assinaturaSentryValida(corpo, assinatura, "segredo")).toBe(true);
    expect(assinaturaSentryValida(corpo + " ", assinatura, "segredo")).toBe(
      false,
    );
    expect(assinaturaSentryValida(corpo, assinatura, undefined)).toBe(false);
  });
});

describe("extração do payload", () => {
  const alerta = extrairAlertaSentry({
    action: "triggered",
    data: {
      event: {
        event_id: "abc",
        issue_id: "99",
        level: "error",
        environment: "production",
        title: "TypeError: falhou",
        culprit: "/lider?token=segredo",
        datetime: "2026-10-14T15:00:00.000Z",
        web_url: "https://vivaz.sentry.io/issues/99/events/abc/",
        tags: [
          ["sistema", "chamados"],
          ["quadro", "ti"],
          ["posthog_session", "sessao1234"],
          ["posthog_replay", "https://us.posthog.com/replay/sessao1234"],
        ],
      },
      issue: {
        id: "99",
        count: "12",
        userCount: 6,
        firstSeen: "2026-10-14T12:00:00.000Z",
        lastSeen: "2026-10-14T15:00:00.000Z",
        permalink: "https://vivaz.sentry.io/issues/99/",
      },
    },
  });

  it("lê a tag do sistema e os campos úteis", () => {
    expect(alerta).toMatchObject({
      slug: "chamados",
      issueId: "99",
      nivel: "error",
      ambiente: "production",
      quadro: "ti",
      ocorrencias: 12,
      usuarios: 6,
      rota: "/lider",
      sentryUrl: "https://vivaz.sentry.io/issues/99/",
      posthogUrl: "https://us.posthog.com/replay/sessao1234",
      posthogSession: "sessao1234",
    });
  });

  it("monta a descrição sem o token da rota", () => {
    expect(alerta).not.toBeNull();
    const texto = montarDescricaoAlerta(alerta!);
    expect(texto).toContain("Erro: TypeError: falhou");
    expect(texto).toContain("Onde: Tela de TI");
    expect(texto).toContain("Issue: 99");
    expect(texto).not.toContain("segredo");
  });

  it("não inventa issue quando o corpo não tem", () => {
    expect(extrairAlertaSentry({ action: "created" })?.issueId).toBeNull();
    expect(extrairAlertaSentry("texto")).toBeNull();
  });
});
