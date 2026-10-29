import { createClient } from "@/lib/supabase/server";

export type EquipamentoBase = {
  id: string;
  nome: string;
  codigo: string;
  descricao: string | null;
  ativo: boolean;
  area: string;
};

/** Equipamentos cadastrados em Áreas, com o nome da área. */
export async function listarEquipamentos(): Promise<EquipamentoBase[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("equipamentos")
    .select("id, nome, codigo, descricao, ativo, area:hotel_areas(nome)")
    .order("codigo");
  return (data ?? []).map((e) => ({
    id: e.id,
    nome: e.nome,
    codigo: e.codigo,
    descricao: e.descricao,
    ativo: e.ativo,
    area: (e.area as { nome: string } | null)?.nome ?? "",
  }));
}
