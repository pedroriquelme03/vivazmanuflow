"use client";

import Link from "next/link";
import { Suspense } from "react";
import { usePathname, useSearchParams } from "next/navigation";

type Aba = "abrir" | "chamados" | "perfil";

const ITENS: { id: Aba; href: string; rotulo: string; icone: string }[] = [
  { id: "abrir", href: "/solicitante", rotulo: "Abrir", icone: "➕" },
  {
    id: "chamados",
    href: "/solicitante?aba=chamados",
    rotulo: "Chamados",
    icone: "📋",
  },
  {
    id: "perfil",
    href: "/solicitante?aba=perfil",
    rotulo: "Perfil",
    icone: "👤",
  },
];

export function SolicitanteNav({ badgeChamados = 0 }: { badgeChamados?: number }) {
  return (
    <Suspense fallback={null}>
      <NavInterna badgeChamados={badgeChamados} />
    </Suspense>
  );
}

function NavInterna({ badgeChamados }: { badgeChamados: number }) {
  const pathname = usePathname();
  const params = useSearchParams();
  const abaParam = params.get("aba");
  const aba: Aba = pathname.startsWith("/solicitante/abrir")
    ? "abrir"
    : abaParam === "chamados" || abaParam === "perfil"
      ? abaParam
      : "abrir";

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur">
      <div className="mx-auto flex max-w-md">
        {ITENS.map((item) => {
          const ativa = aba === item.id;
          return (
            <Link
              key={item.id}
              href={item.href}
              className={`relative flex flex-1 flex-col items-center gap-0.5 py-2.5 text-xs font-medium transition ${
                ativa ? "text-brand-700" : "text-slate-400 hover:text-slate-600"
              }`}
            >
              <span className="text-lg leading-none" aria-hidden>
                {item.icone}
              </span>
              {item.rotulo}
              {item.id === "chamados" && badgeChamados > 0 && (
                <span className="absolute top-1.5 right-[calc(50%-1.75rem)] flex h-4 min-w-4 items-center justify-center rounded-full bg-brand-600 px-1 text-[10px] font-bold text-white">
                  {badgeChamados}
                </span>
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
