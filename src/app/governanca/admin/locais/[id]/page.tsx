import { createClient } from "@/lib/supabase/server";
import { exigirGovernanca } from "@/lib/governanca-acesso";
import { GovernancaShell } from "../../../GovernancaShell";
import { carregarGruposItem, carregarSetores } from "../../../setores-dados";
import { Vazio } from "../../../ui";
import { LocalEditor } from "./LocalEditor";

export const dynamic = "force-dynamic";

export default async function LocalEditorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { perfil, papel } = await exigirGovernanca(`/governanca/admin/locais/${id}`, true);
  const supabase = await createClient();
  const [{ data: local }, { data: itens }, { data: tipos }, { setores, propriedades }, { data: lugares }, { data: etiquetas }, gruposItem] =
    await Promise.all([
      supabase.from("gov_acomodacoes").select("*").eq("id", id).maybeSingle(),
      supabase.from("gov_local_itens").select("*").eq("local_id", id).order("criado_em"),
      supabase.from("gov_tipos_item").select("*").order("nome"),
      carregarSetores(supabase),
      supabase.from("gov_lugares").select("*").order("ordem"),
      supabase.from("gov_local_setores").select("setor_id").eq("local_id", id),
      carregarGruposItem(supabase),
    ]);

  return (
    <GovernancaShell perfil={perfil} papel={papel}>
      {!local ? (
        <Vazio texto="Local não encontrado." />
      ) : (
        <LocalEditor
          local={local}
          itens={itens ?? []}
          tipos={tipos ?? []}
          propriedades={propriedades}
          lugares={lugares ?? []}
          setores={setores}
          etiquetas={(etiquetas ?? []).map((e) => e.setor_id)}
          gruposItem={gruposItem}
        />
      )}
    </GovernancaShell>
  );
}
