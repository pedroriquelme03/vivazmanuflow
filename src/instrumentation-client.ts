/**
 * No `next dev` o SDK do Sentry não entra neste arquivo: o import
 * estático do @sentry/nextjs intercepta o fetch e quebra a navegação RSC
 * (Cadastros ficava em loading). Em produção o bundle já está pronto;
 * o init abaixo só roda com NODE_ENV=production.
 */
export function onRouterTransitionStart(...args: unknown[]) {
  if (process.env.NODE_ENV !== "production") return;
  void import("./sentry.client").then((m) => m.iniciarTransicaoRota(...args));
}

if (process.env.NODE_ENV === "production") {
  void import("./sentry.client");
}
