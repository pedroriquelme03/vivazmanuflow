import type { Instrumentation } from "next";

export async function register() {
  if (process.env.NODE_ENV === "development") return;
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config");
  }
  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config");
  }
}

export const onRequestError: Instrumentation.onRequestError = async (
  erro,
  request,
  contexto,
) => {
  if (process.env.NODE_ENV === "development") return;
  const Sentry = await import("@sentry/nextjs");
  Sentry.captureRequestError(erro, request, contexto);
};
