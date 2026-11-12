import type { ReactNode } from "react";
import Link from "next/link";
import { PRIORIDADE_LABEL, type Prioridade } from "@/lib/governanca";
import { rotuloStatus } from "@/lib/checklist-inspecao";

export const inputCls =
  "w-full min-w-0 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30";

export const labelCls = "mb-1 block text-sm font-medium text-slate-700";

const btnBase =
  "inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50";

export const btnPrimario = `${btnBase} bg-brand-600 text-white hover:bg-brand-700`;
export const btnSecundario = `${btnBase} border border-slate-300 bg-white text-slate-700 hover:bg-slate-50`;

export const cardCls = "rounded-2xl border border-slate-200 bg-white p-5 shadow-sm";

const ABAS_RELATORIOS = [
  { valor: "indicadores", rotulo: "Indicadores", href: "/governanca/admin/relatorios" },
  { valor: "fechamento", rotulo: "Fechamento do mês", href: "/governanca/admin/fechamento" },
] as const;

/** Relatórios e Fechamento do mês ficam juntos no menu: as abas trocam entre os dois. */
export function AbasRelatorios({ atual }: { atual: (typeof ABAS_RELATORIOS)[number]["valor"] }) {
  return (
    <nav className="mb-5 flex gap-1 border-b border-slate-200" aria-label="Relatórios">
      {ABAS_RELATORIOS.map((a) => (
        <Link
          key={a.valor}
          href={a.href}
          aria-current={a.valor === atual ? "page" : undefined}
          className={`-mb-px border-b-2 px-3 py-2 text-sm font-semibold ${
            a.valor === atual
              ? "border-brand-600 text-brand-700"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          {a.rotulo}
        </Link>
      ))}
    </nav>
  );
}

/** Link de volta para a tela de cima (ex.: "← Cadastros"). */
export function Voltar({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="mb-3 inline-block text-sm text-slate-500 hover:text-slate-800">
      ← {children}
    </Link>
  );
}

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

/** Botões pequenos das listas (Editar, Remover...), com cara de botão. */
const btnPequenoBase =
  "inline-flex items-center justify-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition disabled:pointer-events-none disabled:opacity-40";
export const btnPequeno = `${btnPequenoBase} border-slate-300 bg-white text-slate-700 hover:bg-slate-50`;
export const btnPequenoPerigo = `${btnPequenoBase} border-red-200 bg-white text-red-700 hover:bg-red-50`;

/** Chave liga/desliga com texto ao lado. */
export function Chave({
  ligado,
  onChange,
  children,
  rotulo,
  ajuda,
}: {
  ligado: boolean;
  onChange: (ligado: boolean) => void;
  children: ReactNode;
  /** Nome para leitores de tela quando o texto visível não basta. */
  rotulo?: string;
  /** Explicação curta embaixo do texto. */
  ajuda?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={ligado}
      aria-label={rotulo}
      onClick={() => onChange(!ligado)}
      className="inline-flex shrink-0 items-start gap-2 rounded-lg py-1 text-left text-sm"
    >
      <span
        className={`relative mt-0.5 inline-block h-5 w-9 shrink-0 rounded-full transition ${ligado ? "bg-brand-600" : "bg-slate-300"}`}
        aria-hidden
      >
        <span
          className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${ligado ? "left-[18px]" : "left-0.5"}`}
        />
      </span>
      <span>
        <span className="block font-medium text-slate-700">{children}</span>
        {ajuda && <span className="block text-xs text-slate-500">{ajuda}</span>}
      </span>
    </button>
  );
}

/** Chave liga/desliga dos cadastros (Ativo / Inativo). */
export function ChaveAtivo({
  ativo,
  onChange,
  rotulo,
}: {
  ativo: boolean;
  onChange: (ativo: boolean) => void;
  /** Para leitores de tela, ex.: "Colaborador Ana Souza". */
  rotulo?: string;
}) {
  return (
    <Chave ligado={ativo} onChange={onChange} rotulo={rotulo ? `${rotulo}: ${ativo ? "ativo" : "inativo"}` : undefined}>
      <span className={`text-xs font-semibold ${ativo ? "text-brand-700" : "text-slate-500"}`}>
        {ativo ? "Ativo" : "Inativo"}
      </span>
    </Chave>
  );
}

const COR_STATUS: Record<string, string> = {
  finalizada: "bg-brand-100 text-brand-700",
  em_andamento: "bg-amber-100 text-amber-700",
  pausada: "bg-sky-100 text-sky-700",
  cancelada: "bg-slate-200 text-slate-600",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${COR_STATUS[status] ?? COR_STATUS.cancelada}`}>
      {rotuloStatus(status)}
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
