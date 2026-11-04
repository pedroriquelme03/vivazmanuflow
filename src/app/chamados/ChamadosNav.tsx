import Link from "next/link";

/** Topo das telas de chamado para qualquer papel: voltar ao painel e alternar abrir/listar. */
export function ChamadosNav({
  voltar,
  atual,
}: {
  voltar: { href: string; rotulo: string };
  atual: "abrir" | "lista";
}) {
  const base = "rounded-full px-3 py-2 text-center";
  return (
    <>
      <Link
        href={voltar.href}
        className="text-sm text-slate-400 transition hover:text-brand-700"
      >
        ← {voltar.rotulo}
      </Link>
      <nav className="mt-4 grid grid-cols-2 rounded-full bg-slate-100 p-1 text-sm font-semibold">
        <Link
          href="/chamados/abrir"
          className={`${base} ${atual === "abrir" ? "bg-white text-slate-800 shadow" : "text-slate-500"}`}
        >
          Abrir chamado
        </Link>
        <Link
          href="/chamados"
          className={`${base} ${atual === "lista" ? "bg-white text-slate-800 shadow" : "text-slate-500"}`}
        >
          Meus chamados
        </Link>
      </nav>
    </>
  );
}
