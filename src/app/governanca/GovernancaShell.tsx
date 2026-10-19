import Link from "next/link";
import { rotaInicial, type Perfil } from "@/lib/auth";
import { logout } from "@/lib/logout";
import { PAPEL_GOV_LABEL, type GovPapel } from "@/lib/governanca";
import { BrandMark } from "@/components/BrandMark";
import { PainelComAmbiente } from "@/components/PainelComAmbiente";
import { GovernancaNav } from "./GovernancaNav";

/**
 * Moldura das telas da Governança. Admin e líder do sistema ficam dentro do
 * painel com menu lateral; colaboradores (camareiras) ganham uma barra simples.
 */
export function GovernancaShell({
  perfil,
  papel,
  children,
}: {
  perfil: Perfil;
  papel: GovPapel;
  children: React.ReactNode;
}) {
  const conteudo = (
    <>
      <GovernancaNav papel={papel} />
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-4xl px-4 py-6">{children}</div>
      </div>
    </>
  );

  if (perfil.role === "admin" || perfil.role === "lider") {
    return <PainelComAmbiente perfil={perfil}>{conteudo}</PainelComAmbiente>;
  }

  return (
    <div className="flex h-dvh flex-col overflow-hidden">
      <header className="flex shrink-0 items-center gap-3 bg-[#063b45] px-4 py-3 text-white">
        <Link
          href={rotaInicial(perfil.role)}
          aria-label="Voltar aos chamados"
          className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/10"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 18l-6-6 6-6" />
          </svg>
        </Link>
        <BrandMark className="h-9 w-9 rounded-lg bg-[#06b6d4]" />
        <div className="min-w-0 flex-1 leading-tight">
          <p className="truncate text-sm font-bold">Governança Vivaz</p>
          <p className="truncate text-xs text-white/60">
            {perfil.nome} · {PAPEL_GOV_LABEL[papel]}
          </p>
        </div>
        <form action={logout}>
          <button
            type="submit"
            className="rounded-lg bg-white/10 px-3 py-1.5 text-xs font-semibold"
          >
            Sair
          </button>
        </form>
      </header>
      {conteudo}
    </div>
  );
}
