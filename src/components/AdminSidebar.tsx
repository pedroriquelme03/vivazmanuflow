"use client";

import Link from "next/link";
import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { logout } from "@/lib/logout";
import type { Perfil } from "@/lib/auth";
import { BrandMark } from "@/components/BrandMark";
import { TrocaAmbiente } from "@/components/TrocaAmbiente";
import type { AmbienteEquipe } from "@/lib/ambiente-equipe";

const ROLE_BADGE: Record<Perfil["role"], string> = {
  admin: "ADMIN",
  lider: "LÍDER",
  colaborador: "COLAB",
  solicitante: "SOLIC",
};

type NavItem = {
  href: string;
  rotulo: string;
  match: (path: string) => boolean;
  icone: React.ReactNode;
  soAdmin?: boolean;
  soManutencao?: boolean;
};

const NAV: NavItem[] = [
  {
    href: "/admin",
    rotulo: "Cadastros",
    soAdmin: true,
    match: (p) =>
      p === "/admin" ||
      (p.startsWith("/admin/") &&
        !p.startsWith("/admin/eventos") &&
        !p.startsWith("/admin/projetos") &&
        !p.startsWith("/admin/areas")),
    icone: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 7h16M4 12h16M4 17h10" />
        <circle cx="18" cy="17" r="2" />
      </svg>
    ),
  },
  {
    href: "/admin/projetos",
    rotulo: "Projetos",
    soAdmin: true,
    soManutencao: true,
    match: (p) => p.startsWith("/admin/projetos"),
    icone: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 20V8l8-4 8 4v12M9 20v-6h6v6" />
      </svg>
    ),
  },
  {
    href: "/admin/eventos",
    rotulo: "Eventos",
    soAdmin: true,
    soManutencao: true,
    match: (p) => p.startsWith("/admin/eventos"),
    icone: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
        <rect x="3" y="5" width="18" height="16" rx="2" />
        <path strokeLinecap="round" d="M8 3v4M16 3v4M3 11h18" />
      </svg>
    ),
  },
  {
    href: "/admin/areas",
    rotulo: "Áreas",
    soAdmin: true,
    soManutencao: true,
    match: (p) => p.startsWith("/admin/areas"),
    icone: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M3 21h18M5 21V8l7-4 7 4v13M9 21v-6h6v6"
        />
      </svg>
    ),
  },
  {
    href: "/lider/preventivas",
    rotulo: "Preventivas",
    soManutencao: true,
    match: (p) => p.startsWith("/lider/preventivas"),
    icone: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
        <rect x="3" y="4" width="7" height="7" rx="1.5" />
        <rect x="14" y="4" width="7" height="7" rx="1.5" />
        <rect x="3" y="15" width="7" height="6" rx="1.5" />
        <rect x="14" y="15" width="7" height="6" rx="1.5" />
      </svg>
    ),
  },
  {
    href: "/lider",
    rotulo: "Quadro",
    match: (p) =>
      p === "/lider" ||
      (p.startsWith("/lider/") &&
        !p.startsWith("/lider/metricas") &&
        !p.startsWith("/lider/preventivas")),
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

export function AdminSidebar({
  perfil,
  ambiente = "manutencao",
  mostraTroca = false,
}: {
  perfil: Perfil;
  ambiente?: AmbienteEquipe;
  mostraTroca?: boolean;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const ti = ambiente === "ti";
  const itens = itensDoMenu(perfil.role === "admin", ti);
  const destaque = ti ? "text-white" : "text-brand-500";
  const ponto = ti ? "bg-white" : "bg-brand-500";

  useEffect(() => {
    if (!ti) return;
    if (
      pathname.startsWith("/admin/projetos") ||
      pathname.startsWith("/admin/eventos") ||
      pathname.startsWith("/admin/areas") ||
      pathname.startsWith("/lider/preventivas")
    ) {
      router.replace("/lider");
    }
  }, [ti, pathname, router]);

  return (
    <aside
      className={`flex w-64 shrink-0 flex-col text-white ${ti ? "bg-[#1E293B]" : "bg-[#063b45]"}`}
    >
      <div className="px-5 pt-5">
        <div className="flex items-center gap-3">
          <BrandMark
            className="h-10 w-10 rounded-xl bg-[#06b6d4] shadow-inner"
          />
          <div className="leading-tight">
            <p className="text-sm font-bold tracking-wide">VIVAZ CATARATAS</p>
            <p className="text-xs text-white/55">{ti ? "TI" : "Manutenção"}</p>
          </div>
        </div>
        {mostraTroca && (
          <div className="pb-4 pt-4">
            <TrocaAmbiente valor={ambiente} />
          </div>
        )}
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
              <span className={ativo ? destaque : "text-white/60"}>
                {item.icone}
              </span>
              <span className="flex-1">{item.rotulo}</span>
              {ativo && (
                <span className={`h-2 w-2 rounded-full ${ponto}`} />
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
        <span
          className={`mt-1.5 inline-block rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wide text-white ${ti ? "bg-white/20" : "bg-brand-500"}`}
        >
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
  ambiente = "manutencao",
  mostraTroca = false,
  children,
}: {
  perfil: Perfil;
  ambiente?: AmbienteEquipe;
  mostraTroca?: boolean;
  children: React.ReactNode;
}) {
  return (
    // Altura de viewport + overflow travado: o menu lateral fica fixo e a
    // rolagem (inclusive a horizontal do quadro) acontece só na área de conteúdo.
    <div
      className="flex h-dvh overflow-hidden"
      data-ambiente={ambiente}
    >
      <div className="hidden md:flex">
        <AdminSidebar
          perfil={perfil}
          ambiente={ambiente}
          mostraTroca={mostraTroca}
        />
      </div>

      {/* Mobile: barra superior + links */}
      <div className="flex min-w-0 flex-1 flex-col">
        <MobileBar
          perfil={perfil}
          ambiente={ambiente}
          mostraTroca={mostraTroca}
        />
        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          {children}
        </div>
      </div>
    </div>
  );
}

function itensDoMenu(ehAdmin: boolean, ti: boolean) {
  return NAV.filter(
    (item) =>
      (!item.soAdmin || ehAdmin) && (!item.soManutencao || !ti),
  );
}

function MobileBar({
  perfil,
  ambiente,
  mostraTroca,
}: {
  perfil: Perfil;
  ambiente: AmbienteEquipe;
  mostraTroca: boolean;
}) {
  const pathname = usePathname();
  const ti = ambiente === "ti";
  const itens = itensDoMenu(perfil.role === "admin", ti);

  return (
    <div
      className={`border-b border-slate-200 text-white md:hidden ${ti ? "bg-[#1E293B]" : "bg-[#063b45]"}`}
    >
      <div className="flex items-center justify-between px-4 py-3">
        <div className="leading-tight">
          <p className="text-sm font-bold">{ti ? "TI Vivaz" : "Manutenção Vivaz"}</p>
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
      {mostraTroca && (
        <div className="px-4 pb-2">
          <TrocaAmbiente valor={ambiente} />
        </div>
      )}
      <nav
        className={`mx-4 mb-3 grid gap-1 rounded-xl bg-white/15 p-1 ${
          itens.length <= 2 ? "grid-cols-2" : "grid-cols-3"
        }`}
      >
        {itens.map((item) => {
          const ativo = item.match(pathname);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`rounded-lg px-2 py-2 text-center text-xs font-semibold ${
                ativo
                  ? ti
                    ? "bg-white text-[#1E293B]"
                    : "bg-[#0891b2] text-white"
                  : "text-white/70"
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
