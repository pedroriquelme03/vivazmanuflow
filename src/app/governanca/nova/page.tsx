import { createClient } from "@/lib/supabase/server";
import { exigirGovernanca } from "@/lib/governanca-acesso";
import { inspecionaEquipe } from "@/lib/governanca";
import { GovernancaShell } from "../GovernancaShell";
import { NovaInspecao, type RascunhoInspecao } from "./NovaInspecao";

export const dynamic = "force-dynamic";

export default async function NovaInspecaoPage({
  searchParams,
}: {
  searchParams: Promise<{ continuar?: string }>;
}) {
  const { perfil, papel } = await exigirGovernanca("/governanca/nova");
  const { continuar } = await searchParams;

  const supabase = await createClient();
  const hoje = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());
  const [{ data: acomodacoes }, { data: camareiras }, { data: processos }, rascunhoRes, { data: doRelatorio }] =
    await Promise.all([
      supabase.from("gov_acomodacoes").select("*").eq("ativo", true).order("numero"),
      supabase.from("gov_camareiras").select("*").eq("ativo", true).order("nome"),
      // Só a contagem de itens aqui; as perguntas vêm quando o checklist é escolhido.
      supabase
        .from("gov_processos")
        .select("*, gov_secoes(gov_perguntas(id))")
        .eq("ativo", true)
        .order("nome"),
      continuar
        ? supabase
            .from("gov_inspecoes")
            .select(
              "id, processo_id, acomodacao_id, camareira_id, gov_respostas(pergunta_id, resposta, valor, comentario, anexo_url, gov_planos_acao(prioridade, o_que_fazer, quem_vai_fazer, quem_pediu))",
            )
            .eq("id", continuar)
            .eq("inspetor_id", perfil.id)
            .eq("status", "em_andamento")
            .maybeSingle()
        : Promise.resolve({ data: null }),
      // UHs do último relatório diário enviado (o de hoje ou, sem ele, o mais recente),
      // que aparecem primeiro na escolha da acomodação. Mesmo critério da página Relatório diário.
      supabase
        .from("gov_relatorios_diarios")
        .select("data, gov_relatorio_uhs(numero, tarefa, feita_em)")
        .lte("data", hoje)
        .order("data", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

  const linha = rascunhoRes.data;
  const rascunho: RascunhoInspecao | null = linha
    ? {
        id: linha.id,
        processoId: linha.processo_id,
        acomodacaoId: linha.acomodacao_id,
        camareiraId: linha.camareira_id,
        respostas: (linha.gov_respostas ?? []).map((r) => ({
          pergunta_id: r.pergunta_id,
          resposta: r.resposta,
          valor: r.valor,
          comentario: r.comentario,
          anexo_url: r.anexo_url,
          plano: r.gov_planos_acao?.[0] ?? null,
        })),
      }
    : null;

  return (
    <GovernancaShell perfil={perfil} papel={papel}>
      <NovaInspecao
        eu={{ id: perfil.id, nome: perfil.nome }}
        ehAdmin={papel === "admin"}
        escolheCamareira={inspecionaEquipe(papel)}
        acomodacoes={acomodacoes ?? []}
        camareiras={camareiras ?? []}
        processos={(processos ?? []).map(({ gov_secoes, ...p }) => ({
          ...p,
          itens: (gov_secoes ?? []).reduce((n, s) => n + (s.gov_perguntas?.length ?? 0), 0),
        }))}
        rascunho={rascunho}
        dataRelatorio={doRelatorio && doRelatorio.data !== hoje ? doRelatorio.data : null}
        relatorioDoDia={(doRelatorio?.gov_relatorio_uhs ?? []).map((u) => ({
          numero: u.numero,
          tarefa: u.tarefa,
          feita: Boolean(u.feita_em),
        }))}
      />
    </GovernancaShell>
  );
}
