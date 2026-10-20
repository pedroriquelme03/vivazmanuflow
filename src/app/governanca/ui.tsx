import { PRIORIDADE_LABEL, type Prioridade } from "@/lib/governanca";

export const inputCls =
  "w-full min-w-0 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30";

export const labelCls = "mb-1 block text-sm font-medium text-slate-700";

const btnBase =
  "inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50";

export const btnPrimario = `${btnBase} bg-brand-600 text-white hover:bg-brand-700`;
export const btnSecundario = `${btnBase} border border-slate-300 bg-white text-slate-700 hover:bg-slate-50`;

export const cardCls = "rounded-2xl border border-slate-200 bg-white p-5 shadow-sm";

export function Titulo({ titulo, subtitulo }: { titulo: string; subtitulo?: string }) {
  return (
    <div className="mb-5">
      <h1 className="text-xl font-bold">{titulo}</h1>
      {subtitulo && <p className="mt-0.5 text-sm text-slate-500">{subtitulo}</p>}
    </div>
  );
}

export function Vazio({ texto }: { texto: string }) {
  return <div className={`${cardCls} text-sm text-slate-500`}>{texto}</div>;
}

export function Erro({ texto }: { texto: string | null }) {
  if (!texto) return null;
  return <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{texto}</p>;
}

export function StatusBadge({ status }: { status: string }) {
  const finalizada = status === "finalizada";
  return (
    <span
      className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${
        finalizada ? "bg-brand-100 text-brand-700" : "bg-amber-100 text-amber-700"
      }`}
    >
      {finalizada ? "Finalizada" : "Em andamento"}
    </span>
  );
}

export function PrioridadeBadge({ prioridade }: { prioridade: string }) {
  const p = (prioridade in PRIORIDADE_LABEL ? prioridade : "media") as Prioridade;
  const cor =
    p === "alta" ? "bg-red-600" : p === "media" ? "bg-amber-500" : "bg-slate-500";
  return (
    <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium text-white ${cor}`}>
      {PRIORIDADE_LABEL[p]}
    </span>
  );
}

export function Kpi({ titulo, valor, cor }: { titulo: string; valor: number | string; cor: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <span className="text-sm text-slate-500">{titulo}</span>
      <p className={`mt-2 text-3xl font-bold ${cor}`}>{valor}</p>
    </div>
  );
}
