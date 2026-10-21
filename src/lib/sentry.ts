import type { ErrorEvent, EventHint } from "@sentry/nextjs";

export const TAG_SISTEMA = "chamados";

export function sentryDsn() {
  return process.env.NEXT_PUBLIC_SENTRY_DSN ?? process.env.SENTRY_DSN;
}

export function quadroDaRequisicao(cookies: unknown): "ti" | "manutencao" | null {
  const texto =
    typeof cookies === "string"
      ? cookies
      : cookies && typeof cookies === "object"
        ? Object.entries(cookies as Record<string, unknown>)
            .map(([chave, valor]) => `${chave}=${String(valor ?? "")}`)
            .join("; ")
        : "";
  const achado = texto.match(/(?:^|;\s*)vivaz-ambiente=(ti|manutencao)(?:;|$)/);
  return achado?.[1] === "ti" || achado?.[1] === "manutencao" ? achado[1] : null;
}

function eventoDoWebhook(event: ErrorEvent) {
  const url = event.request?.url ?? "";
  const transacao = event.transaction ?? "";
  return (
    url.includes("/api/webhooks/sentry") ||
    transacao.includes("/api/webhooks/sentry")
  );
}

/** Falha do serviço de push do navegador. Não é defeito da tela. */
function ruidoDePush(event: ErrorEvent) {
  const textos = [
    event.message,
    ...(event.exception?.values ?? []).flatMap((item) => [item.type, item.value]),
  ];
  return textos.some(
    (texto) =>
      typeof texto === "string" &&
      /push service error|push service not available/i.test(texto),
  );
}

function stripUrlSearch(url: string | undefined) {
  if (!url) return url;
  const corte = url.search(/[?#]/);
  return corte === -1 ? url : url.slice(0, corte);
}

export function opcoesSentry() {
  const dsn = sentryDsn();
  return {
    dsn,
    enabled: Boolean(dsn),
    environment: process.env.NODE_ENV,
    sendDefaultPii: false,
    dataCollection: {
      userInfo: false,
      httpBodies: [],
    },
    tracesSampleRate: process.env.NODE_ENV === "development" ? 1.0 : 0.2,
    initialScope: {
      tags: { sistema: TAG_SISTEMA },
    },
    beforeSend(event: ErrorEvent, _hint: EventHint) {
      if (eventoDoWebhook(event) || ruidoDePush(event)) return null;
      const quadro =
        quadroDaRequisicao(event.request?.cookies) ??
        (typeof document !== "undefined"
          ? quadroDaRequisicao(document.cookie)
          : null);
      event.tags = {
        ...event.tags,
        sistema: TAG_SISTEMA,
        ...(quadro ? { quadro } : {}),
      };
      if (event.request) {
        delete event.request.cookies;
        delete event.request.headers;
        delete event.request.data;
        delete event.request.query_string;
        event.request.url = stripUrlSearch(event.request.url);
      }
      if (event.user) {
        event.user = event.user.id ? { id: String(event.user.id) } : undefined;
      }
      return event;
    },
  };
}
