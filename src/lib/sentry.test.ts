import { afterEach, describe, expect, it } from "vitest";
import { opcoesSentry, sentryDsn } from "@/lib/sentry";

describe("Sentry", () => {
  const env = process.env;

  afterEach(() => {
    process.env = { ...env };
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
  });

  it("usa 20% de traces em produção", () => {
    process.env.NODE_ENV = "production";
    process.env.NEXT_PUBLIC_SENTRY_DSN = "https://abc@o1.ingest.sentry.io/1";
    expect(opcoesSentry().tracesSampleRate).toBe(0.2);
  });
});
