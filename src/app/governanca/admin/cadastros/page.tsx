import Link from "next/link";
import type { ReactNode } from "react";
import { createClient } from "@/lib/supabase/server";
import { exigirGovernanca } from "@/lib/governanca-acesso";
import { GovernancaShell } from "../../GovernancaShell";
import { Titulo } from "../../ui";

export const dynamic = "force-dynamic";

type Cartao = {
  href: string;
  titulo: string;
  texto: string;
  icone: ReactNode;
  cor: string;
  soAdmin?: boolean;
  total?: number | null;
  rotuloTotal?: string;
  extra?: { href: string; rotulo: string };
};

const svg = (d: ReactNode) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-6 w-6" aria-hidden>
    {d}
  </svg>
);

/** Cadastros do checklist numa tela só: equipe, colaboradores, setores e locais. */
export default async function CadastrosPage() {
  const { perfil, papel } = await exigirGovernanca("/governanca/admin/cadastros", "equipe");
  const supabase = await createClient();
  const contar = (tabela: "gov_camareiras" | "gov_setores" | "gov_acomodacoes") =>
    supabase.from(tabela).select("id", { count: "exact", head: true }).eq("ativo", true);
  const [colaboradores, setores, locais] = await Promise.all([
    contar("gov_camareiras"),
    contar("gov_setores"),
    contar("gov_acomodacoes"),
  ]);

  const cartoes: Cartao[] = [
    {
      href: "/governanca/admin/equipe",
      titulo: "Equipe",
      texto: "Quem entra no checklist com login: líderes e aplicadores, e os setores de cada um.",
      cor: "bg-brand-50 text-brand-700",
      icone: svg(
        <>
          <circle cx="9" cy="8" r="3.2" />
          <path strokeLinecap="round" d="M3.5 19a5.5 5.5 0 0 1 11 0M16 5.5a3 3 0 0 1 0 5.8M17.5 19a5.5 5.5 0 0 0-2.4-4.5" />
        </>,
      ),
    },
    {
      href: "/governanca/admin/colaboradores",
      titulo: "Colaboradores",
      texto: "Quem é avaliado nos checklists. Nome e setor, sem login.",
      cor: "bg-emerald-50 text-emerald-700",
      total: colaboradores.count,
      rotuloTotal: "ativos",
      icone: svg(
        <>
          <circle cx="12" cy="8" r="3.5" />
          <path strokeLinecap="round" d="M5 20a7 7 0 0 1 14 0" />
        </>,
      ),
    },
    {
      href: "/governanca/admin/setores",
      titulo: "Setores",
      texto: "Setores de cada propriedade, os checklists de cada um e quem acessa.",
      cor: "bg-amber-50 text-amber-700",
      soAdmin: true,
      total: setores.count,
      rotuloTotal: "ativos",
      icone: svg(
        <>
          <rect x="3" y="3" width="7" height="7" rx="1.5" />
          <rect x="14" y="3" width="7" height="7" rx="1.5" />
          <rect x="3" y="14" width="7" height="7" rx="1.5" />
          <rect x="14" y="14" width="7" height="7" rx="1.5" />
        </>,
      ),
    },
    {
      href: "/governanca/admin/locais",
      titulo: "Locais",
      texto: "UHs e áreas, com os eletrônicos e a mobília de cada uma.",
      cor: "bg-sky-50 text-sky-700",
      soAdmin: true,
      total: locais.count,
      rotuloTotal: "ativos",
      extra: { href: "/governanca/admin/locais/tipos", rotulo: "Tipos de item" },
      icone: svg(
        <>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z" />
          <circle cx="12" cy="9.5" r="2.5" />
        </>,
      ),
    },
  ];

  return (
    <GovernancaShell perfil={perfil} papel={papel} largo>
      <Titulo titulo="Cadastros" subtitulo="Tudo o que o checklist usa: pessoas, setores e locais." />
      <div className="grid gap-4 md:grid-cols-2">
        {cartoes
          .filter((c) => !c.soAdmin || papel === "admin")
          .map((c) => (
            <div
              key={c.href}
              className="group relative flex items-start gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-brand-300 hover:shadow-md sm:p-6"
            >
              <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${c.cor}`}>{c.icone}</span>
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-3">
                  <Link
                    href={c.href}
                    className="text-lg font-bold text-slate-800 after:absolute after:inset-0 after:content-[''] group-hover:text-brand-700"
                  >
                    {c.titulo}
                  </Link>
                  {typeof c.total === "number" && (
                    <span className="shrink-0 text-right leading-tight">
                      <span className="block text-2xl font-bold text-slate-700">{c.total}</span>
                      <span className="block text-[11px] text-slate-400">{c.rotuloTotal}</span>
                    </span>
                  )}
                </div>
                <p className="mt-1 text-sm text-slate-500">{c.texto}</p>
                <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm font-semibold">
                  <span className="text-brand-700">Abrir →</span>
                  {c.extra && (
                    <Link
                      href={c.extra.href}
                      className="relative z-10 rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-600 hover:border-brand-300 hover:text-brand-700"
                    >
                      {c.extra.rotulo}
                    </Link>
                  )}
                </div>
              </div>
            </div>
          ))}
      </div>
    </GovernancaShell>
  );
}
