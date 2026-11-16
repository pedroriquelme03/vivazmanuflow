import { createClient } from "@/lib/supabase/server";
import { exigirGovernanca } from "@/lib/governanca-acesso";
import { inspecionaEquipe } from "@/lib/governanca";
import { hojeEmSaoPaulo } from "@/lib/checklist-inspecao";
import { GovernancaShell } from "../GovernancaShell";
import { carregarArvore, carregarSetores } from "../setores-dados";
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
  const hoje = hojeEmSaoPaulo();
  // O banco já devolve só os checklists e colaboradores dos setores da pessoa.
  const [
    { data: acomodacoes },
    { data: camareiras },
    { data: processos },
    rascunhoRes,
    { data: doRelatorio },
    { setores, propriedades },
    { data: tiposItem },
    arvore,
  ] = await Promise.all([
    supabase.from("gov_acomodacoes").select("*").eq("ativo", true).order("numero"),
    supabase.from("gov_camareiras").select("*").eq("ativo", true).order("nome"),
    // Só a contagem de itens aqui; as perguntas vêm quando o checklist é escolhido.
    supabase.from("gov_processos").select("*, gov_secoes(gov_perguntas(id))").eq("ativo", true).order("nome"),
    // Continuar: o próprio checklist ou, para o líder do setor, o de outra pessoa.
    continuar
      ? supabase
          .from("gov_inspecoes")
          .select(
            "id, processo_id, acomodacao_id, camareira_id, data_referencia, gov_respostas(pergunta_id, resposta, valor, comentario, anexo_url, item_diferente, item_encontrado, gov_planos_acao(prioridade, o_que_fazer, quem_vai_fazer, quem_pediu, prazo, onde, por_que, como, custo))",
          )
          .eq("id", continuar)
          .in("status", ["em_andamento", "pausada"])
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
    carregarSetores(supabase),
    supabase.from("gov_tipos_item").select("*"),
    carregarArvore(supabase),
  ]);

  const linha = rascunhoRes.data;
  const rascunho: RascunhoInspecao | null = linha
    ? {
        id: linha.id,
        processoId: linha.processo_id,
        acomodacaoId: linha.acomodacao_id,
        camareiraId: linha.camareira_id,
        dataReferencia: linha.data_referencia,
        respostas: (linha.gov_respostas ?? []).map((r) => ({
          pergunta_id: r.pergunta_id,
          resposta: r.resposta,
          valor: r.valor,
          comentario: r.comentario,
          anexo_url: r.anexo_url,
          item_diferente: r.item_diferente,
          item_encontrado: r.item_encontrado,
          plano: r.gov_planos_acao?.[0] ?? null,
        })),
      }
    : null;

  // Setor desativado some da escolha (o checklist continua no histórico).
  const setoresAtivos = new Set(setores.filter((s) => s.ativo).map((s) => s.id));

  return (
    <GovernancaShell perfil={perfil} papel={papel}>
      <NovaInspecao
        eu={{ id: perfil.id, nome: perfil.nome }}
        equipe={inspecionaEquipe(papel)}
        acomodacoes={acomodacoes ?? []}
        camareiras={camareiras ?? []}
        processos={(processos ?? [])
          .filter((p) => setoresAtivos.has(p.setor_id) || p.id === rascunho?.processoId)
          .map(({ gov_secoes, ...p }) => ({
            ...p,
            itens: (gov_secoes ?? []).reduce((n, s) => n + (s.gov_perguntas?.length ?? 0), 0),
          }))}
        setores={setores}
        propriedades={propriedades}
        rascunho={rascunho}
        hoje={hoje}
        tiposItem={tiposItem ?? []}
        lugares={arvore.lugares}
        ligacoes={arvore.ligacoes}
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
