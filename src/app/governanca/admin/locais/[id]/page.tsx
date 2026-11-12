import { createClient } from "@/lib/supabase/server";
import { exigirGovernanca } from "@/lib/governanca-acesso";
import { GovernancaShell } from "../../../GovernancaShell";
import { Vazio } from "../../../ui";
import { LocalEditor } from "./LocalEditor";

export const dynamic = "force-dynamic";

export default async function LocalEditorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { perfil, papel } = await exigirGovernanca(`/governanca/admin/locais/${id}`, true);
  const supabase = await createClient();
  const [{ data: local }, { data: itens }, { data: tipos }, { data: propriedades }, { data: categorias }] =
    await Promise.all([
      supabase.from("gov_acomodacoes").select("*").eq("id", id).maybeSingle(),
      supabase.from("gov_local_itens").select("*").eq("local_id", id).order("criado_em"),
      supabase.from("gov_tipos_item").select("*").order("nome"),
      supabase.from("propriedades").select("id, nome, ativo").order("nome"),
      // Categorias já usadas, para sugerir ao digitar.
      supabase.from("gov_acomodacoes").select("categoria").not("categoria", "is", null),
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
          propriedades={propriedades ?? []}
          categorias={[...new Set((categorias ?? []).map((c) => c.categoria as string))].sort()}
        />
      )}
    </GovernancaShell>
  );
}
