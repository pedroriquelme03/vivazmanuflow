"use client";

import { useEffect } from "react";

/** PostHog com replay. Campos de formulário ficam mascarados. */
export function Observabilidade() {
  useEffect(() => {
    const chave = process.env.NEXT_PUBLIC_POSTHOG_KEY;
    if (!chave) return;
    let ativo = true;
    void import("posthog-js").then(({ default: posthog }) => {
      if (!ativo) return;
      if (!posthog.__loaded) {
        posthog.init(chave, {
          api_host:
            process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com",
          person_profiles: "identified_only",
          capture_pageview: true,
          autocapture: false,
          disable_session_recording: false,
          session_recording: {
            maskAllInputs: true,
            maskTextSelector: "input, textarea, [data-mask]",
            recordHeaders: false,
            recordBody: false,
          },
        });
      }
      window.__vivazPosthog = {
        sessionId: () => posthog.get_session_id() || undefined,
        replayUrl: () => posthog.get_session_replay_url() || undefined,
      };
    });
    return () => {
      ativo = false;
    };
  }, []);

  return null;
}
