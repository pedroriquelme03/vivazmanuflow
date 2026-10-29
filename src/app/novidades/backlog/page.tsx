import { createClient } from "@/lib/supabase/server";
import { ABERTOS } from "@/lib/novidades/formato";
import { Titulo } from "../../governanca/ui";
import { SQL_NOVIDADES, exigirNovidades } from "../acesso";
import { hojeSp, lerRegistros } from "../dados";
import { NovidadesShell } from "../NovidadesShell";
import { BacklogApp, type Capacidade, type ItemCarteira, type RegistroBacklog } from "./BacklogApp";

export const dynamic = "force-dynamic";

export default async function BacklogPage() {
  const perfil = await exigirNovidades("/novidades/backlog");
  const supabase = await createClient();
  const [{ data }, registros, capacidade] = await Promise.all([
    supabase
      .from("demandas")
      .select(
        "id, titulo, prioridade, status, criado_em, prazo_confirmado, sublocal, preventiva_id, local:locais(nome), colaborador:usuarios!demandas_colaborador_id_fkey(nome)",
      )
      .eq("ambiente", "manutencao")
      .eq("arquivado", false)
      .in("status", ABERTOS)
      .order("criado_em"),
    lerRegistros<RegistroBacklog>("backlog"),
    lerRegistros<Capacidade>("backlog_capacidade"),
  ]);

  const itens: ItemCarteira[] = (data ?? []).map((d) => ({
    id: d.id,
    titulo: d.titulo,
    prioridade: d.prioridade,
    status: d.status,
    criado_em: d.criado_em,
    prazo: d.prazo_confirmado,
    local: [(d.local as { nome: string } | null)?.nome, d.sublocal].filter(Boolean).join(" · "),
    responsavel: (d.colaborador as { nome: string } | null)?.nome ?? null,
    preventiva: Boolean(d.preventiva_id),
  }));

  return (
    <NovidadesShell perfil={perfil} largo>
      <Titulo
        titulo="Backlog de manutenção"
        subtitulo="Fotografia da carteira de chamados em aberto, medida em horas-pessoa (HP). Separe o que dá para executar do que está bloqueado e veja quantas semanas de trabalho a equipe tem pela frente."
      />
      {registros.faltaTabela && (
        <p className="mb-4 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">{SQL_NOVIDADES}</p>
      )}
      <BacklogApp
        itens={itens}
        registros={registros.mapa}
        capacidade={capacidade.mapa.geral ?? null}
        hoje={hojeSp()}
      />
    </NovidadesShell>
  );
}
