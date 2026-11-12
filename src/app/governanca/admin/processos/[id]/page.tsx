import { createClient } from "@/lib/supabase/server";
import { exigirGovernanca } from "@/lib/governanca-acesso";
import { ordenarSecoes, type SecaoComPerguntas } from "@/lib/governanca";
import { GovernancaShell } from "../../../GovernancaShell";
import { carregarSetoresDaPessoa } from "../../../setores-dados";
import { Vazio } from "../../../ui";
import { ProcessoEditor } from "./ProcessoEditor";

export const dynamic = "force-dynamic";

export default async function ProcessoEditorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { perfil, papel } = await exigirGovernanca(`/governanca/admin/processos/${id}`, "equipe");
  const supabase = await createClient();
  // Checklist de outro setor não volta do banco para o líder: aparece como não encontrado.
  const [{ data }, { setores, propriedades, meusSetores }, { data: tiposItem }] = await Promise.all([
    supabase.from("gov_processos").select("*, gov_secoes(*, gov_perguntas(*))").eq("id", id).maybeSingle(),
    carregarSetoresDaPessoa(supabase, perfil.id, papel),
    supabase.from("gov_tipos_item").select("*").order("nome"),
  ]);
  const idsPerguntas = (data?.gov_secoes ?? []).flatMap((s) => s.gov_perguntas.map((q) => q.id));
  const { data: dependencias } = idsPerguntas.length
    ? await supabase.from("gov_dependencias").select("*").in("pergunta_id", idsPerguntas)
    : { data: [] };

  return (
    <GovernancaShell perfil={perfil} papel={papel}>
      {!data ? (
        <Vazio texto="Checklist não encontrado." />
      ) : (
        <ProcessoEditor
          processo={data}
          secoes={ordenarSecoes((data.gov_secoes ?? []) as SecaoComPerguntas[])}
          setores={setores}
          propriedades={propriedades}
          meusSetores={meusSetores}
          dependencias={dependencias ?? []}
          tiposItem={tiposItem ?? []}
        />
      )}
    </GovernancaShell>
  );
}
