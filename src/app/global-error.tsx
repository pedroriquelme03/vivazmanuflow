"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";

export default function GlobalError({
  error,
}: {
  error: Error & { digest?: string };
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="pt-BR">
      <body className="flex min-h-dvh items-center justify-center bg-slate-50 px-4 text-slate-800">
        <div className="max-w-sm text-center">
          <p className="text-lg font-semibold">Algo deu errado</p>
          <p className="mt-2 text-sm text-slate-500">
            Recarregue a página. Se continuar, avise a manutenção.
          </p>
          <button
            type="button"
            className="mt-4 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white"
            onClick={() => window.location.reload()}
          >
            Recarregar
          </button>
        </div>
      </body>
    </html>
  );
}
