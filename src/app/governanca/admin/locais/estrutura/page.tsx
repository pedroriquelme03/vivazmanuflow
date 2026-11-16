import { createClient } from "@/lib/supabase/server";
import { exigirGovernanca } from "@/lib/governanca-acesso";
import { GovernancaShell } from "../../../GovernancaShell";
import { EstruturaLocais } from "./EstruturaLocais";

export const dynamic = "force-dynamic";

export default async function EstruturaPage() {
  const { perfil, papel } = await exigirGovernanca("/governanca/admin/locais/estrutura", true);
  const supabase = await createClient();
  const [{ data: lugares, error }, { data: propriedades }, { data: locais }, { data: ligacoes }] = await Promise.all([
    supabase.from("gov_lugares").select("*").order("ordem"),
    supabase.from("propriedades").select("id, nome, ativo").order("nome"),
    supabase.from("gov_acomodacoes").select("lugar_id"),
    supabase.from("gov_processo_lugares").select("lugar_id"),
  ]);

  const contar = (linhas: { lugar_id: string | null }[] | null) => {
    const mapa: Record<string, number> = {};
    for (const l of linhas ?? []) if (l.lugar_id) mapa[l.lugar_id] = (mapa[l.lugar_id] ?? 0) + 1;
    return mapa;
  };

  return (
    <GovernancaShell perfil={perfil} papel={papel}>
      <EstruturaLocais
        lugares={lugares ?? []}
        propriedades={(propriedades ?? []).filter((p) => p.ativo)}
        locaisPorLugar={contar(locais)}
        checklistsPorLugar={contar(ligacoes)}
        faltaSql={Boolean(error)}
      />
    </GovernancaShell>
  );
}
