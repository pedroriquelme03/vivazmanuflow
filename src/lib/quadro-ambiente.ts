import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import type { AmbienteEquipe } from "@/lib/ambiente-equipe";
import { DEMANDA_SELECT, type DemandaKanban } from "@/lib/demanda-select";

type Cliente = SupabaseClient<Database>;

export async function listarQuadro(
  supabase: Cliente,
  ambiente: AmbienteEquipe,
): Promise<DemandaKanban[]> {
  const filtrado = await supabase
    .from("demandas")
    .select(`${DEMANDA_SELECT}, ambiente`)
    .eq("ambiente", ambiente)
    .order("peso", { ascending: false })
    .order("criado_em", { ascending: true });

  if (!filtrado.error) {
    return (filtrado.data ?? []) as unknown as DemandaKanban[];
  }

  const tudo = await supabase
    .from("demandas")
    .select(DEMANDA_SELECT)
    .order("peso", { ascending: false })
    .order("criado_em", { ascending: true });

  return (tudo.data ?? []) as unknown as DemandaKanban[];
}
