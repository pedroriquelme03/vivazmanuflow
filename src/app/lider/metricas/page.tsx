import { redirect } from "next/navigation";
import Link from "next/link";
import { getPerfil } from "@/lib/auth";
import { Topbar } from "@/components/Topbar";
import { MetricasDashboard } from "./MetricasDashboard";

export const dynamic = "force-dynamic";

export default async function MetricasPage() {
  const perfil = await getPerfil();
  if (!perfil) redirect("/login?next=/lider/metricas");
  if (perfil.role === "colaborador") redirect("/colaborador");

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <Topbar perfil={perfil} />
      <div className="border-b border-slate-200 bg-white px-4">
        <nav className="mx-auto flex max-w-5xl gap-1 text-sm">
          <Link
            href="/lider"
            className="px-3 py-2.5 font-medium text-slate-500 hover:text-brand-700"
          >
            Quadro
          </Link>
          <span className="border-b-2 border-brand-600 px-3 py-2.5 font-semibold text-brand-700">
            Métricas
          </span>
        </nav>
      </div>
      <MetricasDashboard />
    </div>
  );
}
