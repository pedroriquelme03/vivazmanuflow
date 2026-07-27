"use client";

import { useState } from "react";

export function CopiarLink() {
  const [copiado, setCopiado] = useState(false);

  async function copiar() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      // Alguns navegadores bloqueiam clipboard sem HTTPS — ignora silenciosamente.
    }
  }

  return (
    <button
      type="button"
      onClick={copiar}
      className="rounded-lg border border-brand-200 bg-white px-3 py-1.5 text-sm font-medium text-brand-700 transition hover:bg-brand-50"
    >
      {copiado ? "Link copiado!" : "Copiar link"}
    </button>
  );
}
