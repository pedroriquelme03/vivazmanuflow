export async function register() {
  if (process.env.NODE_ENV === "development") return;
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config");
  }
  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config");
  }
}

export async function onRequestError(
  erro: unknown,
  request: Request,
  contexto: { routerKind: string; routePath: string },
) {
  if (process.env.NODE_ENV === "development") return;
  const Sentry = await import("@sentry/nextjs");
  return Sentry.captureRequestError(erro, request, contexto);
}
