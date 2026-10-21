import { afterEach, describe, expect, it, vi } from "vitest";
import { opcoesSentry, quadroDaRequisicao, sentryDsn } from "@/lib/sentry";

describe("Sentry", () => {
  const env = process.env;

  afterEach(() => {
    process.env = { ...env };
    vi.unstubAllEnvs();
  });

  it("fica desligado sem DSN", () => {
    delete process.env.NEXT_PUBLIC_SENTRY_DSN;
    delete process.env.SENTRY_DSN;
    expect(sentryDsn()).toBeUndefined();
    expect(opcoesSentry().enabled).toBe(false);
  });

  it("liga com NEXT_PUBLIC_SENTRY_DSN", () => {
    process.env.NEXT_PUBLIC_SENTRY_DSN = "https://abc@o1.ingest.sentry.io/1";
    expect(opcoesSentry().enabled).toBe(true);
    expect(opcoesSentry().sendDefaultPii).toBe(false);
  });

  it("remove query string e cookie no beforeSend", () => {
    process.env.NEXT_PUBLIC_SENTRY_DSN = "https://abc@o1.ingest.sentry.io/1";
    const event = {
      request: {
        url: "http://localhost:3000/admin?token=secreto",
        cookies: { a: "1" },
        headers: { authorization: "x" },
        data: { senha: "x" },
        query_string: "token=secreto",
      },
      user: { id: "u1", email: "x@y.com", username: "ana" },
    };
    const limpo = opcoesSentry().beforeSend(event as never, {} as never);
    expect(limpo?.request?.url).toBe("http://localhost:3000/admin");
    expect(limpo?.request?.cookies).toBeUndefined();
    expect(limpo?.request?.headers).toBeUndefined();
    expect(limpo?.user).toEqual({ id: "u1" });
    expect(limpo?.tags).toMatchObject({ sistema: "chamados" });
  });

  it("marca o quadro do cookie e descarta o webhook", () => {
    process.env.NEXT_PUBLIC_SENTRY_DSN = "https://abc@o1.ingest.sentry.io/1";
    expect(quadroDaRequisicao("vivaz-ambiente=ti; outra=1")).toBe("ti");
    const comQuadro = opcoesSentry().beforeSend(
      {
        request: { cookies: { "vivaz-ambiente": "manutencao" }, url: "https://app/lider" },
      } as never,
      {} as never,
    );
    expect(comQuadro?.tags).toMatchObject({
      sistema: "chamados",
      quadro: "manutencao",
    });
    expect(comQuadro?.request?.cookies).toBeUndefined();
    expect(
      opcoesSentry().beforeSend(
        { request: { url: "https://app/api/webhooks/sentry" } } as never,
        {} as never,
      ),
    ).toBeNull();
  });

  it("descarta falha do serviço de push do navegador", () => {
    process.env.NEXT_PUBLIC_SENTRY_DSN = "https://abc@o1.ingest.sentry.io/1";
    expect(
      opcoesSentry().beforeSend(
        {
          exception: {
            values: [
              {
                type: "AbortError",
                value: "Registration failed - push service error",
              },
            ],
          },
        } as never,
        {} as never,
      ),
    ).toBeNull();
  });

  it("descarta a resposta da página cortada no meio, só com a mensagem exata", () => {
    process.env.NEXT_PUBLIC_SENTRY_DSN = "https://abc@o1.ingest.sentry.io/1";
    const evento = (value: string) =>
      ({ exception: { values: [{ type: "Error", value }] } }) as never;
    expect(opcoesSentry().beforeSend(evento("Connection closed."), {} as never)).toBeNull();
    expect(
      opcoesSentry().beforeSend(evento("Connection closed while saving"), {} as never),
    ).not.toBeNull();
  });

  it("usa 20% de traces em produção", () => {
    vi.stubEnv("NODE_ENV", "production");
    process.env.NEXT_PUBLIC_SENTRY_DSN = "https://abc@o1.ingest.sentry.io/1";
    expect(opcoesSentry().tracesSampleRate).toBe(0.2);
  });
});
