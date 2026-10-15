import * as Sentry from "@sentry/nextjs";
import type { ErrorEvent, EventHint } from "@sentry/nextjs";
import { urlPermitida } from "@/lib/alerta-sentry";
import { opcoesSentry } from "@/lib/sentry";

declare global {
  interface Window {
    __vivazPosthog?: {
      sessionId: () => string | undefined;
      replayUrl: () => string | undefined;
    };
  }
}

declare global {
  interface Window {
    Sentry?: typeof Sentry;
  }
}

const opcoes = opcoesSentry();
const beforeSend = opcoes.beforeSend;

function tagsDoReplay() {
  const ponte = window.__vivazPosthog;
  if (!ponte) return {};
  const tags: Record<string, string> = {};
  const sessao = ponte.sessionId();
  const replay = urlPermitida(ponte.replayUrl() ?? null, 200);
  if (sessao && /^[A-Za-z0-9_-]{8,80}$/.test(sessao)) {
    tags.posthog_session = sessao;
  }
  if (replay) tags.posthog_replay = replay;
  return tags;
}

Sentry.init({
  ...opcoes,
  beforeSend(event: ErrorEvent, hint: EventHint) {
    event.tags = { ...tagsDoReplay(), ...event.tags };
    return beforeSend ? beforeSend(event, hint) : event;
  },
});

if (opcoes.enabled) {
  window.Sentry = Sentry;
}

export function iniciarTransicaoRota(...args: unknown[]) {
  Sentry.captureRouterTransitionStart(
    ...(args as Parameters<typeof Sentry.captureRouterTransitionStart>),
  );
}
