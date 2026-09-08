import * as Sentry from "@sentry/nextjs";
import { opcoesSentry } from "@/lib/sentry";

declare global {
  interface Window {
    Sentry?: typeof Sentry;
  }
}

const opcoes = opcoesSentry();
Sentry.init(opcoes);

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;

if (opcoes.enabled) {
  window.Sentry = Sentry;
}
