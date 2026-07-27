import Link from "next/link";
import { redirect } from "next/navigation";
import { getPerfil } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Topbar } from "@/components/Topbar";
import { DEMANDA_SELECT } from "@/lib/demanda-select";
import { KanbanLider } from "./KanbanLider";

export const dynamic = "force-dynamic";

export default async function LiderHome() {
  const perfil = await getPerfil();
  if (!perfil) redirect("/login?next=/lider");
  if (perfil.role === "colaborador") redirect("/colaborador");

  const supabase = await createClient();
  const [{ data: demandas }, { data: colaboradores }, { data: sla }] =
    await Promise.all([
      supabase.from("demandas").select(DEMANDA_SELECT).order("criado_em", {
        ascending: false,
      }),
      supabase
        .from("usuarios")
        .select("id, nome, propriedade_id")
        .eq("role", "colaborador")
        .eq("ativo", true)
        .order("nome"),
      supabase.from("sla_config").select("prioridade, horas_padrao").is(
        "propriedade_id",
        null,
      ),
    ]);

  const slaHoras: Record<string, number> = {};
  for (const s of sla ?? []) slaHoras[s.prioridade] = s.horas_padrao;

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <Topbar perfil={perfil} />
      <div className="border-b border-slate-200 bg-white px-4">
        <nav className="mx-auto flex max-w-5xl gap-1 text-sm">
          <span className="border-b-2 border-brand-600 px-3 py-2.5 font-semibold text-brand-700">
            Quadro
          </span>
          <Link
            href="/lider/metricas"
            className="px-3 py-2.5 font-medium text-slate-500 hover:text-brand-700"
          >
            Métricas
          </Link>
        </nav>
      </div>
      <KanbanLider
        demandasIniciais={demandas ?? []}
        colaboradores={colaboradores ?? []}
        slaHoras={slaHoras}
      />
    </div>
  );
}
