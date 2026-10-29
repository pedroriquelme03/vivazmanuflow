"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export const FERRAMENTAS = [
  { href: "/novidades/atividades", rotulo: "Biblioteca de atividades" },
  { href: "/novidades/cronograma", rotulo: "Cronograma anual" },
  { href: "/novidades/ordem-servico", rotulo: "Ordem de serviço" },
  { href: "/novidades/inventario", rotulo: "Inventário de ativos" },
  { href: "/novidades/criticidade", rotulo: "Criticidade" },
  { href: "/novidades/backlog", rotulo: "Backlog" },
  { href: "/novidades/indicadores", rotulo: "Indicadores" },
  { href: "/novidades/relatorio", rotulo: "Relatório" },
  { href: "/novidades/pmoc", rotulo: "PMOC" },
] as const;

const ABAS = [{ href: "/novidades", rotulo: "Início" }, ...FERRAMENTAS];

export function NovidadesNav() {
  const pathname = usePathname();
  return (
    <nav className="flex shrink-0 gap-1 overflow-x-auto border-b border-slate-200 bg-white px-3 py-2 print:hidden">
      {ABAS.map((a) => {
        const ativa = a.href === "/novidades" ? pathname === a.href : pathname.startsWith(a.href);
        return (
          <Link
            key={a.href}
            href={a.href}
            className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium transition ${
              ativa ? "bg-brand-50 text-brand-700" : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            {a.rotulo}
          </Link>
        );
      })}
    </nav>
  );
}
