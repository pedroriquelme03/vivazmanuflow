import * as Sentry from "@sentry/nextjs";
import { opcoesSentry } from "@/lib/sentry";

declare global {
  interface Window {
    Sentry?: typeof Sentry;
  }
}

const opcoes = opcoesSentry();
Sentry.init(opcoes);

if (opcoes.enabled) {
  window.Sentry = Sentry;
}

export function iniciarTransicaoRota(...args: unknown[]) {
  Sentry.captureRouterTransitionStart(
    ...(args as Parameters<typeof Sentry.captureRouterTransitionStart>),
  );
}
