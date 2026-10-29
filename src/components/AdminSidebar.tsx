"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { logout } from "@/lib/logout";
import type { Perfil } from "@/lib/auth";
import { BrandMark } from "@/components/BrandMark";
import { AvisoPush } from "@/components/AvisoPush";
import { TrocaAmbiente } from "@/components/TrocaAmbiente";
import {
  ROTULO_PAINEL,
  paineisDoUsuario,
  type PainelEquipe,
} from "@/lib/ambiente-equipe";
import { PAPEL_GOV_LABEL, papelGovernanca } from "@/lib/governanca";
import { itemChecklistAtivo, menuChecklist } from "@/lib/menu-checklist";

const ROLE_BADGE: Record<Perfil["role"], string> = {
  admin: "ADMIN",
  lider: "LÍDER",
  colaborador: "COLAB",
  solicitante: "SOLIC",
};

const FUNDO: Record<PainelEquipe, string> = {
  manutencao: "bg-[#063b45]",
  ti: "bg-[#1E293B]",
  checklist: "bg-[#064e3b]",
};

type NavItem = {
  href: string;
  rotulo: string;
  match: (path: string) => boolean;
  icone: React.ReactNode;
  soAdmin?: boolean;
  soManutencao?: boolean;
  soTi?: boolean;
};

const ICONE_CHECKLIST: Record<string, React.ReactNode> = {
  "/governanca": (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 11l9-7 9 7M5 10v10h14V10" />
    </svg>
  ),
  "/governanca/nova": (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
      <rect x="5" y="4" width="14" height="17" rx="2" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 4V3h6v1M9 12l2 2 4-4" />
    </svg>
  ),
  "/governanca/admin/inspecoes": (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
      <path strokeLinecap="round" d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01" />
    </svg>
  ),
  "/governanca/admin/processos": (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 20h4L19 9l-4-4L4 16v4zM13 7l4 4" />
    </svg>
  ),
  "/governanca/admin/acomodacoes": (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 18v-6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v6M3 18h18M3 14h18M7 10V7h4v3" />
    </svg>
  ),
  "/governanca/admin/camareiras": (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
      <circle cx="12" cy="8" r="3.5" />
      <path strokeLinecap="round" d="M5 20a7 7 0 0 1 14 0" />
    </svg>
  ),
  "/governanca/como-funciona": (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
      <circle cx="12" cy="12" r="9" />
      <path strokeLinecap="round" d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6M12 17h.01" />
    </svg>
  ),
  "/governanca/admin/kanban": (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
      <rect x="3" y="4" width="5" height="16" rx="1.5" />
      <rect x="10" y="4" width="5" height="11" rx="1.5" />
      <rect x="17" y="4" width="4" height="7" rx="1.5" />
    </svg>
  ),
  "/governanca/admin/relatorios": (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 19V9M10 19V5M16 19v-7M22 19H2" />
    </svg>
  ),
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
    href: "/lider/sistemas",
    rotulo: "Sistemas",
    soTi: true,
    match: (p) => p.startsWith("/lider/sistemas"),
    icone: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
        <rect x="3" y="4" width="18" height="12" rx="2" />
        <path strokeLinecap="round" d="M8 20h8M12 16v4" />
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
        !p.startsWith("/lider/preventivas") &&
        !p.startsWith("/lider/sistemas")),
    icone: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
        <rect x="3" y="4" width="7" height="16" rx="1.5" />
        <rect x="14" y="4" width="7" height="10" rx="1.5" />
      </svg>
    ),
  },
  {
    href: "/novidades",
    rotulo: "Novidades",
    soManutencao: true,
    match: (p) => p.startsWith("/novidades"),
    icone: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 3l1.8 4.7L18.5 9.5l-4.7 1.8L12 16l-1.8-4.7L5.5 9.5l4.7-1.8L12 3zM18 15l.8 2.2L21 18l-2.2.8L18 21l-.8-2.2L15 18l2.2-.8L18 15z"
        />
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
  onFechar,
  className = "",
}: {
  perfil: Perfil;
  ambiente?: PainelEquipe;
  mostraTroca?: boolean;
  /** No menu do celular: botão de fechar e fecha ao escolher um item. */
  onFechar?: () => void;
  className?: string;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const ti = ambiente === "ti";
  const itens = itensDoMenu(perfil, ambiente);
  const claro = ti;
  const destaque = claro ? "text-white" : "text-brand-500";
  const ponto = claro ? "bg-white" : "bg-brand-500";

  useEffect(() => {
    if (ambiente === "checklist") return;
    if (ti) {
      if (
        pathname.startsWith("/admin/projetos") ||
        pathname.startsWith("/admin/eventos") ||
        pathname.startsWith("/admin/areas") ||
        pathname.startsWith("/lider/preventivas") ||
        pathname.startsWith("/novidades")
      ) {
        router.replace("/lider");
      }
      return;
    }
    if (pathname.startsWith("/lider/sistemas")) {
      router.replace("/lider");
    }
  }, [ambiente, ti, pathname, router]);

  return (
    <aside className={`flex w-64 shrink-0 flex-col text-white ${FUNDO[ambiente]} ${className}`}>
      <div className="px-5 pt-5">
        <div className="flex items-center gap-3">
          <BrandMark
            className="h-10 w-10 rounded-xl bg-[#06b6d4] shadow-inner"
          />
          <div className="min-w-0 flex-1 leading-tight">
            <p className="text-sm font-bold tracking-wide">VIVAZ CATARATAS</p>
            <p className="text-xs text-white/55">{ROTULO_PAINEL[ambiente]}</p>
          </div>
          {onFechar && (
            <button
              type="button"
              onClick={onFechar}
              aria-label="Fechar menu"
              className="-mr-2 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-white/70 hover:bg-white/10 hover:text-white"
            >
              ✕
            </button>
          )}
        </div>
        {mostraTroca && (
          <div className="pb-4 pt-4">
            <TrocaAmbiente
              valor={ambiente}
              opcoes={paineisDoUsuario(perfil.ambientes)}
              role={perfil.role}
            />
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
              onClick={onFechar}
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
          className={`mt-1.5 inline-block rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wide text-white ${claro ? "bg-white/20" : "bg-brand-500"}`}
        >
          {rotuloPapel(perfil, ambiente)}
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
  ambiente?: PainelEquipe;
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
        <AvisoPush />
        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          {children}
        </div>
      </div>
    </div>
  );
}

function itensDoMenu(perfil: Perfil, ambiente: PainelEquipe): NavItem[] {
  if (ambiente === "checklist") {
    const papel = papelGovernanca(perfil.role, perfil.governanca_papel, perfil.ambientes);
    return menuChecklist(papel).map((item) => ({
      href: item.href,
      rotulo: item.rotulo,
      match: (p: string) => itemChecklistAtivo(item.href, p),
      icone: ICONE_CHECKLIST[item.href],
    }));
  }
  const ehAdmin = perfil.role === "admin";
  const ti = ambiente === "ti";
  return NAV.filter(
    (item) =>
      (!item.soAdmin || ehAdmin) &&
      (!item.soManutencao || !ti) &&
      (!item.soTi || ti),
  );
}

function rotuloPapel(perfil: Perfil, ambiente: PainelEquipe) {
  if (ambiente !== "checklist") return ROLE_BADGE[perfil.role];
  const papel =
    papelGovernanca(perfil.role, perfil.governanca_papel, perfil.ambientes) ?? "camareira";
  return PAPEL_GOV_LABEL[papel].toUpperCase();
}

/** Mobile: barra fina com a página atual; o ☰ abre o mesmo menu lateral do desktop. */
function MobileBar({
  perfil,
  ambiente,
  mostraTroca,
}: {
  perfil: Perfil;
  ambiente: PainelEquipe;
  mostraTroca: boolean;
}) {
  const pathname = usePathname();
  const [aberto, setAberto] = useState(false);
  const atual = itensDoMenu(perfil, ambiente).find((item) => item.match(pathname));

  useEffect(() => {
    if (!aberto) return;
    function aoTeclar(e: KeyboardEvent) {
      if (e.key === "Escape") setAberto(false);
    }
    document.addEventListener("keydown", aoTeclar);
    return () => document.removeEventListener("keydown", aoTeclar);
  }, [aberto]);

  return (
    <>
      <div
        className={`shrink-0 pt-[env(safe-area-inset-top)] text-white shadow-md md:hidden ${FUNDO[ambiente]}`}
      >
        <div className="flex h-20 items-center gap-3 px-3">
          <button
            type="button"
            onClick={() => setAberto(true)}
            aria-label="Abrir menu"
            aria-expanded={aberto}
            className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-white hover:bg-white/15"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-7 w-7">
              <path strokeLinecap="round" d="M4 7h16M4 12h16M4 17h16" />
            </svg>
          </button>
          <div className="min-w-0 flex-1 leading-tight">
            <p className="truncate text-lg font-bold">{atual?.rotulo ?? ROTULO_PAINEL[ambiente]}</p>
            <p className="truncate text-xs text-white/60">{ROTULO_PAINEL[ambiente]} Vivaz</p>
          </div>
          <BrandMark className="h-14 w-14 shrink-0 rounded-2xl bg-[#06b6d4] shadow-inner" />
        </div>
      </div>

      {aberto && (
        <div
          className="fixed inset-0 z-50 flex md:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="Menu"
        >
          <button
            type="button"
            aria-label="Fechar menu"
            onClick={() => setAberto(false)}
            className="absolute inset-0 cursor-default bg-slate-900/50"
          />
          <AdminSidebar
            perfil={perfil}
            ambiente={ambiente}
            mostraTroca={mostraTroca}
            onFechar={() => setAberto(false)}
            className="relative h-full max-w-[85vw] overflow-y-auto shadow-2xl"
          />
        </div>
      )}
    </>
  );
}
