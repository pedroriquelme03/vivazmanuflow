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
  const [
    { data: demandas },
    { data: colaboradores },
    { data: sla },
    { data: propriedades },
    { data: solicitantes },
    eventosRes,
    projetosRes,
    membrosRes,
    equipeRes,
  ] = await Promise.all([
    supabase.from("demandas").select(DEMANDA_SELECT).order("peso", {
      ascending: false,
    }).order("criado_em", { ascending: true }),
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
    supabase.from("propriedades").select("id, nome").eq("ativo", true).order("nome"),
    supabase
      .from("solicitantes")
      .select("id, nome, propriedade_id")
      .eq("ativo", true)
      .order("nome"),
    supabase
      .from("eventos")
      .select("id, nome, propriedade_id, data_inicio, data_fim")
      .eq("ativo", true)
      .order("data_inicio", { ascending: false, nullsFirst: false }),
    supabase.rpc("listar_projetos_ativos"),
    supabase.from("projeto_membros").select("projeto_id, usuario_id"),
    supabase
      .from("usuarios")
      .select("id, nome, propriedade_id")
      .eq("ativo", true)
      .in("role", ["colaborador", "lider", "admin"])
      .order("nome"),
  ]);

  const slaHoras: Record<string, number> = {};
  for (const s of sla ?? []) slaHoras[s.prioridade] = s.horas_padrao;

  const membrosPorProjeto: Record<string, string[]> = {};
  for (const m of membrosRes.data ?? []) {
    membrosPorProjeto[m.projeto_id] = [
      ...(membrosPorProjeto[m.projeto_id] ?? []),
      m.usuario_id,
    ];
  }

  return (
    <PainelShell perfil={perfil}>
      <KanbanLider
        demandasIniciais={demandas ?? []}
        colaboradores={colaboradores ?? []}
        slaHoras={slaHoras}
        agoraInicial={Date.now()}
        ehAdmin={perfil.role === "admin"}
        membrosPorProjeto={membrosPorProjeto}
        equipeAtribuir={equipeRes.data ?? []}
        opcoesNovaDemanda={{
          propriedades: propriedades ?? [],
          solicitantes: solicitantes ?? [],
          eventos: eventosRes.data ?? [],
          projetos: projetosRes.data ?? [],
          nomeSolicitantePadrao: perfil.nome,
          propriedadePadrao: perfil.propriedade_id,
        }}
      />
    </PainelShell>
  );
}
