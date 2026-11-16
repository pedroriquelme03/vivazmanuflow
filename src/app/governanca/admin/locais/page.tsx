import { createClient } from "@/lib/supabase/server";
import { exigirGovernanca } from "@/lib/governanca-acesso";
import { GovernancaShell } from "../../GovernancaShell";
import { carregarSetores } from "../../setores-dados";
import { LocaisApp } from "./LocaisApp";

export const dynamic = "force-dynamic";

export default async function LocaisPage() {
  const { perfil, papel } = await exigirGovernanca("/governanca/admin/locais", true);
  const supabase = await createClient();
  const [{ data: locais }, { setores, propriedades }, { data: lugares }, { data: etiquetas }] = await Promise.all([
    supabase.from("gov_acomodacoes").select("*, gov_local_itens(count)").order("numero"),
    carregarSetores(supabase),
    supabase.from("gov_lugares").select("*").order("ordem"),
    supabase.from("gov_local_setores").select("local_id, setor_id"),
  ]);

  const setoresPorLocal = new Map<string, string[]>();
  for (const e of etiquetas ?? []) setoresPorLocal.set(e.local_id, [...(setoresPorLocal.get(e.local_id) ?? []), e.setor_id]);

  return (
    <GovernancaShell perfil={perfil} papel={papel} largo>
      <LocaisApp
        lista={(locais ?? []).map(({ gov_local_itens, ...l }) => ({
          ...l,
          itens: gov_local_itens[0]?.count ?? 0,
          setores: setoresPorLocal.get(l.id) ?? [],
        }))}
        propriedades={propriedades}
        lugares={lugares ?? []}
        setores={setores}
      />
    </GovernancaShell>
  );
}
