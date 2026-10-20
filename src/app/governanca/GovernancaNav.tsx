"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { GovPapel } from "@/lib/governanca";

type Aba = { href: string; rotulo: string; ativa: (p: string) => boolean; soAdmin?: boolean };

const ABAS: Aba[] = [
  {
    href: "/governanca",
    rotulo: "Início",
    ativa: (p) => p === "/governanca" || p.startsWith("/governanca/inspecao/"),
  },
  {
    href: "/governanca/nova",
    rotulo: "Preencher checklist",
    ativa: (p) => p.startsWith("/governanca/nova"),
  },
  {
    href: "/governanca/admin/inspecoes",
    rotulo: "Inspeções",
    soAdmin: true,
    ativa: (p) => p.startsWith("/governanca/admin/inspecoes"),
  },
  {
    href: "/governanca/admin/relatorios",
    rotulo: "Relatórios",
    soAdmin: true,
    ativa: (p) => p.startsWith("/governanca/admin/relatorios"),
  },
  {
    href: "/governanca/admin/processos",
    rotulo: "Gerenciar checklists",
    soAdmin: true,
    ativa: (p) => p.startsWith("/governanca/admin/processos"),
  },
  {
    href: "/governanca/admin/acomodacoes",
    rotulo: "Acomodações",
    soAdmin: true,
    ativa: (p) => p.startsWith("/governanca/admin/acomodacoes"),
  },
  {
    href: "/governanca/admin/camareiras",
    rotulo: "Camareiras",
    soAdmin: true,
    ativa: (p) => p.startsWith("/governanca/admin/camareiras"),
  },
  {
    href: "/governanca/admin/equipe",
    rotulo: "Acessos",
    soAdmin: true,
    ativa: (p) => p.startsWith("/governanca/admin/equipe"),
  },
];

export function GovernancaNav({ papel }: { papel: GovPapel }) {
  const pathname = usePathname();
  const abas = ABAS.filter((a) => !a.soAdmin || papel === "admin");

  return (
    <nav className="flex shrink-0 gap-1 overflow-x-auto border-b border-slate-200 bg-white px-3 py-2">
      {abas.map((a) => {
        const ativa = a.ativa(pathname);
        return (
          <Link
            key={a.href}
            href={a.href}
            className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium transition ${
              ativa
                ? "bg-brand-50 text-brand-700"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            {a.rotulo}
          </Link>
        );
      })}
    </nav>
  );
}
