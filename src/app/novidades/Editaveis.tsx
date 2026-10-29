"use client";

import { useState } from "react";

/** Texto livre que aparece na impressão (sem a borda do campo). */
export function TextoLivre({
  inicial = "",
  placeholder,
  linhas = 3,
}: {
  inicial?: string;
  placeholder?: string;
  linhas?: number;
}) {
  const [valor, setValor] = useState(inicial);
  return (
    <>
      <textarea
        rows={linhas}
        value={valor}
        placeholder={placeholder}
        onChange={(e) => setValor(e.target.value)}
        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500 print:hidden"
      />
      <p className="hidden whitespace-pre-line text-sm print:block">{valor || "—"}</p>
    </>
  );
}

export function ChecklistLocal({ itens }: { itens: string[] }) {
  const [marcados, setMarcados] = useState<Set<number>>(new Set());
  return (
    <ul className="space-y-1.5 text-sm">
      {itens.map((t, i) => (
        <li key={t}>
          <label className="flex cursor-pointer items-start gap-2">
            <input
              type="checkbox"
              className="mt-0.5 h-4 w-4 accent-brand-600"
              checked={marcados.has(i)}
              onChange={(e) =>
                setMarcados((m) => {
                  const n = new Set(m);
                  if (e.target.checked) n.add(i);
                  else n.delete(i);
                  return n;
                })
              }
            />
            <span className={marcados.has(i) ? "text-slate-400 line-through" : "text-slate-700"}>{t}</span>
          </label>
        </li>
      ))}
      <li className="pt-1 text-xs text-slate-500">
        {marcados.size} de {itens.length} conferidos.
      </li>
    </ul>
  );
}
