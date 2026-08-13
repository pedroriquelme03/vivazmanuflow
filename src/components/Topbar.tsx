import Link from "next/link";
import { logout } from "@/lib/logout";
import type { Perfil } from "@/lib/auth";
import { BrandMark } from "@/components/BrandMark";

const ROLE_LABEL: Record<Perfil["role"], string> = {
  admin: "Administrador",
  lider: "Líder",
  colaborador: "Colaborador",
};

export function Topbar({ perfil }: { perfil: Perfil }) {
  return (
    <header className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3">
      <div className="flex items-center gap-3">
        <BrandMark className="h-9 w-9 rounded-lg bg-brand-600" />
        <div className="leading-tight">
          <p className="text-sm font-semibold">{perfil.nome}</p>
          <p className="text-xs text-slate-500">
            {ROLE_LABEL[perfil.role]}
            {perfil.propriedade_nome ? ` · ${perfil.propriedade_nome}` : ""}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {perfil.role === "admin" && (
          <Link
            href="/admin"
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
          >
            Cadastros
          </Link>
        )}
        <form action={logout}>
          <button
            type="submit"
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
          >
            Sair
          </button>
        </form>
      </div>
    </header>
  );
}
