import { redirect } from "next/navigation";
import { getPerfil } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PainelShell } from "@/components/AdminSidebar";
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
    <PainelShell perfil={perfil}>
      <KanbanLider
        demandasIniciais={demandas ?? []}
        colaboradores={colaboradores ?? []}
        slaHoras={slaHoras}
      />
    </PainelShell>
  );
}
