import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import type { AmbienteEquipe } from "@/lib/ambiente-equipe";
import { DEMANDA_SELECT, type DemandaKanban } from "@/lib/demanda-select";

type Cliente = SupabaseClient<Database>;

const SELECT_SISTEMA = `${DEMANDA_SELECT}, sistema_id, sistema:sistemas(nome)`;
const CAMPOS_ALERTA = `
  sentry_issue_id, sentry_ocorrencias, sentry_usuarios,
  sentry_primeira_em, sentry_ultima_em, sentry_rota,
  sentry_quadro, sentry_url, sentry_posthog_url
`;

function faltaSistema(mensagem: string) {
  return mensagem.includes("sistemas") || mensagem.includes("sistema_id");
}

function faltaAlerta(mensagem: string) {
  return mensagem.includes("sentry_");
}

export async function listarQuadro(
  supabase: Cliente,
  ambiente: AmbienteEquipe,
): Promise<DemandaKanban[]> {
  const ordenar = (select: string) =>
    supabase
      .from("demandas")
      .select(select)
      .eq("ambiente", ambiente)
      .order("peso", { ascending: false })
      .order("criado_em", { ascending: true });

  let filtrado = await ordenar(`${SELECT_SISTEMA}, ambiente, ${CAMPOS_ALERTA}`);
  if (filtrado.error && faltaAlerta(filtrado.error.message)) {
    filtrado = await ordenar(`${SELECT_SISTEMA}, ambiente`);
  }

  if (!filtrado.error) {
    return (filtrado.data ?? []) as unknown as DemandaKanban[];
  }

  const selectSemSistema = faltaSistema(filtrado.error.message)
    ? `${DEMANDA_SELECT}, ambiente`
    : `${SELECT_SISTEMA}, ambiente`;

  const semSistema = await supabase
    .from("demandas")
    .select(selectSemSistema)
    .eq("ambiente", ambiente)
    .order("peso", { ascending: false })
    .order("criado_em", { ascending: true });

  if (!semSistema.error) {
    return (semSistema.data ?? []) as unknown as DemandaKanban[];
  }

  const tudo = await supabase
    .from("demandas")
    .select(DEMANDA_SELECT)
    .order("peso", { ascending: false })
    .order("criado_em", { ascending: true });

  return (tudo.data ?? []) as unknown as DemandaKanban[];
}
