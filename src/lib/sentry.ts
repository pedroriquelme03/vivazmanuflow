import type { ErrorEvent, EventHint } from "@sentry/nextjs";

export function sentryDsn() {
  return process.env.NEXT_PUBLIC_SENTRY_DSN ?? process.env.SENTRY_DSN;
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
    beforeSend(event: ErrorEvent, _hint: EventHint) {
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
