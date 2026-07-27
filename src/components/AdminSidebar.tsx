"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { logout } from "@/lib/logout";
import type { Perfil } from "@/lib/auth";

const ROLE_BADGE: Record<Perfil["role"], string> = {
  admin: "ADMIN",
  lider: "LÍDER",
  colaborador: "COLAB",
};

type NavItem = {
  href: string;
  rotulo: string;
  match: (path: string) => boolean;
  icone: React.ReactNode;
  soAdmin?: boolean;
};

const NAV: NavItem[] = [
  {
    href: "/admin",
    rotulo: "Cadastros",
    soAdmin: true,
    match: (p) => p.startsWith("/admin"),
    icone: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 7h16M4 12h16M4 17h10" />
        <circle cx="18" cy="17" r="2" />
      </svg>
    ),
  },
  {
    href: "/lider",
    rotulo: "Quadro",
            match: (p) =>
              p === "/lider" ||
              (p.startsWith("/lider/") && !p.startsWith("/lider/metricas")),
    icone: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
        <rect x="3" y="4" width="7" height="16" rx="1.5" />
        <rect x="14" y="4" width="7" height="10" rx="1.5" />
      </svg>
    ),
  },
  {
    href: "/lider/metricas",
    rotulo: "Métricas",
    match: (p) => p.startsWith("/lider/metricas"),
    icone: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 19V9M10 19V5M16 19v-7M22 19H2" />
      </svg>
    ),
  },
];

export function AdminSidebar({ perfil }: { perfil: Perfil }) {
  const pathname = usePathname();
  const itens = NAV.filter((n) => !n.soAdmin || perfil.role === "admin");

  return (
    <aside className="flex w-64 shrink-0 flex-col bg-[#063b45] text-white">
      <div className="flex items-center gap-3 px-5 py-5">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-500 text-sm font-bold shadow-inner">
          V
        </div>
        <div className="leading-tight">
          <p className="text-sm font-bold tracking-wide">VIVAZ CATARATAS</p>
          <p className="text-xs text-white/55">ManuFlow · Manutenção</p>
        </div>
      </div>

      <nav className="mt-2 flex flex-1 flex-col gap-1 px-3">
        {itens.map((item) => {
          const ativo = item.match(pathname);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                ativo
                  ? "bg-white/15 text-white"
                  : "text-white/70 hover:bg-white/10 hover:text-white"
              }`}
            >
              <span className={ativo ? "text-brand-500" : "text-white/60"}>
                {item.icone}
              </span>
              <span className="flex-1">{item.rotulo}</span>
              {ativo && (
                <span className="h-2 w-2 rounded-full bg-brand-500" />
              )}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto border-t border-white/10 px-5 py-4">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-white/40">
          Usuário
        </p>
        <p className="mt-1 truncate text-sm font-semibold">{perfil.nome}</p>
        <span className="mt-1.5 inline-block rounded-full bg-brand-500 px-2 py-0.5 text-[10px] font-bold tracking-wide text-white">
          {ROLE_BADGE[perfil.role]}
        </span>

        <form action={logout} className="mt-4">
          <button
            type="submit"
            className="flex w-full items-center gap-2.5 rounded-xl px-2 py-2 text-sm font-medium text-white/70 transition hover:bg-white/10 hover:text-white"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              className="h-5 w-5"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15 12H3m0 0 4-4m-4 4 4 4M10 4h7a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-7"
              />
            </svg>
            Sair
          </button>
        </form>
      </div>
    </aside>
  );
}

/** Shell com menu lateral (desktop) + drawer no mobile. */
export function PainelShell({
  perfil,
  children,
}: {
  perfil: Perfil;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-full flex-1">
      <div className="hidden md:flex">
        <AdminSidebar perfil={perfil} />
      </div>

      {/* Mobile: barra superior + links */}
      <div className="flex min-w-0 flex-1 flex-col">
        <MobileBar perfil={perfil} />
        <div className="flex min-h-0 flex-1 flex-col overflow-auto">
          {children}
        </div>
      </div>
    </div>
  );
}

function MobileBar({ perfil }: { perfil: Perfil }) {
  const pathname = usePathname();
  const itens = NAV.filter((n) => !n.soAdmin || perfil.role === "admin");

  return (
    <div className="border-b border-slate-200 bg-[#063b45] text-white md:hidden">
      <div className="flex items-center justify-between px-4 py-3">
        <div className="leading-tight">
          <p className="text-sm font-bold">VivazManuFlow</p>
          <p className="text-xs text-white/55">{perfil.nome}</p>
        </div>
        <form action={logout}>
          <button
            type="submit"
            className="rounded-lg bg-white/10 px-3 py-1.5 text-xs font-semibold text-white"
          >
            Sair
          </button>
        </form>
      </div>
      <nav className="flex gap-1 overflow-x-auto px-2 pb-2">
        {itens.map((item) => {
          const ativo = item.match(pathname);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold ${
                ativo ? "bg-white/20 text-white" : "text-white/65"
              }`}
            >
              {item.rotulo}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
