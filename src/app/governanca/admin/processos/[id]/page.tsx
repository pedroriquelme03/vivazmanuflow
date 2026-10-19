import { createClient } from "@/lib/supabase/server";
import { exigirGovernanca } from "@/lib/governanca-acesso";
import { ordenarSecoes, type SecaoComPerguntas } from "@/lib/governanca";
import { GovernancaShell } from "../../../GovernancaShell";
import { Vazio } from "../../../ui";
import { ProcessoEditor } from "./ProcessoEditor";

export const dynamic = "force-dynamic";

export default async function ProcessoEditorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { perfil, papel } = await exigirGovernanca(`/governanca/admin/processos/${id}`, true);
  const supabase = await createClient();
  const { data } = await supabase
    .from("gov_processos")
    .select("*, gov_secoes(*, gov_perguntas(*))")
    .eq("id", id)
    .maybeSingle();

  return (
    <GovernancaShell perfil={perfil} papel={papel}>
      {!data ? (
        <Vazio texto="Checklist não encontrado." />
      ) : (
        <ProcessoEditor
          processo={data}
          secoes={ordenarSecoes((data.gov_secoes ?? []) as SecaoComPerguntas[])}
        />
      )}
    </GovernancaShell>
  );
}
