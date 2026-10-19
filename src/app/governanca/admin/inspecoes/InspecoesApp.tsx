"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { formatDataHora, rotuloTipo } from "@/lib/governanca";
import { StatusBadge, Titulo, Vazio, inputCls } from "../../ui";

export type LinhaInspecao = {
  id: string;
  tipo: string;
  status: string;
  data: string;
  uh: string | null;
  camareira: string | null;
  inspetor: string | null;
};

export function InspecoesApp({ lista }: { lista: LinhaInspecao[] }) {
  const [busca, setBusca] = useState("");

  const filtradas = useMemo(() => {
    const q = busca.trim().toLowerCase();
    if (!q) return lista;
    return lista.filter((i) =>
      [i.uh, i.camareira, i.inspetor].some((v) => v?.toLowerCase().includes(q)),
    );
  }, [lista, busca]);

  return (
    <>
      <Titulo titulo="Inspeções" subtitulo="Todas as inspeções registradas." />

      <input
        className={`${inputCls} mb-4 max-w-sm`}
        type="search"
        value={busca}
        onChange={(e) => setBusca(e.target.value)}
        placeholder="Buscar por UH, camareira ou inspetor…"
      />

      {filtradas.length === 0 ? (
        <Vazio texto="Nenhuma inspeção encontrada." />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">UH</th>
                <th className="px-4 py-3 font-medium">Tipo</th>
                <th className="hidden px-4 py-3 font-medium md:table-cell">Camareira</th>
                <th className="hidden px-4 py-3 font-medium sm:table-cell">Inspetor</th>
                <th className="px-4 py-3 font-medium">Data</th>
                <th className="hidden px-4 py-3 font-medium sm:table-cell">Status</th>
              </tr>
            </thead>
            <tbody>
              {filtradas.map((i) => (
                <tr key={i.id} className="border-t border-slate-100 hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <Link href={`/governanca/inspecao/${i.id}`} className="font-semibold text-brand-700 hover:underline">
                      {i.uh ?? "—"}
                    </Link>
                  </td>
                  <td className="px-4 py-3">{rotuloTipo(i.tipo, true)}</td>
                  <td className="hidden px-4 py-3 text-slate-500 md:table-cell">{i.camareira ?? "—"}</td>
                  <td className="hidden px-4 py-3 text-slate-500 sm:table-cell">{i.inspetor ?? "—"}</td>
                  <td className="px-4 py-3 text-slate-500">{formatDataHora(i.data)}</td>
                  <td className="hidden px-4 py-3 sm:table-cell">
                    <StatusBadge status={i.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
