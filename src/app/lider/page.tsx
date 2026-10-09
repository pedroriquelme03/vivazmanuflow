import { redirect } from "next/navigation";
import { getPerfil, rotaInicial } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PainelComAmbiente } from "@/components/PainelComAmbiente";
import { pessoaDoAmbiente, recursoAmbienteAusente } from "@/lib/ambiente-equipe";
import { resolverAmbiente } from "@/lib/resolver-ambiente";
import { listarQuadro } from "@/lib/quadro-ambiente";
import { KanbanLider } from "./KanbanLider";

export const dynamic = "force-dynamic";

export default async function LiderHome() {
  const perfil = await getPerfil();
  if (!perfil) redirect("/login?next=/lider");
  if (perfil.role === "colaborador" || perfil.role === "solicitante") {
    redirect(rotaInicial(perfil.role));
  }

  const supabase = await createClient();
  const ambiente = await resolverAmbiente(perfil.ambientes, perfil.role);
  if (ambiente === "manutencao") {
    await supabase.rpc("abrir_preventivas_vencidas");
  }
  const [
    demandas,
    colaboradores,
    { data: sla },
    { data: propriedades },
    { data: solicitantes },
    eventosRes,
    projetosRes,
    membrosRes,
    sistemasRes,
  ] = await Promise.all([
    listarQuadro(supabase, ambiente),
    equipeAtribuivel(supabase, ambiente),
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
    ambiente === "ti"
      ? supabase.from("sistemas").select("id, nome, ativo").order("nome")
      : Promise.resolve({ data: [], error: null }),
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
    <PainelComAmbiente perfil={perfil}>
      <KanbanLider
        ambiente={ambiente}
        demandasIniciais={demandas}
        colaboradores={colaboradores}
        slaHoras={slaHoras}
        agoraInicial={Date.now()}
        ehAdmin={perfil.role === "admin"}
        eu={{ id: perfil.id, nome: perfil.nome }}
        ehGestor
        membrosPorProjeto={membrosPorProjeto}
        equipeAtribuir={colaboradores}
        opcoesNovaDemanda={{
          propriedades: propriedades ?? [],
          solicitantes: solicitantes ?? [],
          eventos: eventosRes.data ?? [],
          projetos: projetosRes.data ?? [],
          nomeSolicitantePadrao: perfil.nome,
          propriedadePadrao: perfil.propriedade_id,
          ambiente,
          sistemas: (sistemasRes.data ?? [])
            .filter((s) => s.ativo)
            .map(({ id, nome }) => ({ id, nome })),
        }}
        sistemas={(sistemasRes.data ?? []).map(({ id, nome }) => ({ id, nome }))}
      />
    </PainelComAmbiente>
  );
}

async function equipeAtribuivel(
  supabase: Awaited<ReturnType<typeof createClient>>,
  ambiente: Awaited<ReturnType<typeof resolverAmbiente>>,
) {
  const comAmbiente = await supabase
    .from("usuarios")
    .select("id, nome, propriedade_id, ambientes")
    .eq("role", "colaborador")
    .eq("ativo", true)
    .order("nome");

  if (
    comAmbiente.error &&
    recursoAmbienteAusente(comAmbiente.error.message)
  ) {
    const legado = await supabase
      .from("usuarios")
      .select("id, nome, propriedade_id")
      .eq("role", "colaborador")
      .eq("ativo", true)
      .order("nome");
    return legado.data ?? [];
  }

  return (comAmbiente.data ?? [])
    .filter((pessoa) => pessoaDoAmbiente(pessoa.ambientes, ambiente))
    .map(({ id, nome, propriedade_id }) => ({ id, nome, propriedade_id }));
}
