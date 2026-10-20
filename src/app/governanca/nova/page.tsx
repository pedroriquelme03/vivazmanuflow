import { createClient } from "@/lib/supabase/server";
import { exigirGovernanca } from "@/lib/governanca-acesso";
import { inspecionaEquipe } from "@/lib/governanca";
import { GovernancaShell } from "../GovernancaShell";
import { NovaInspecao } from "./NovaInspecao";

export const dynamic = "force-dynamic";

export default async function NovaInspecaoPage() {
  const { perfil, papel } = await exigirGovernanca("/governanca/nova");

  const supabase = await createClient();
  const [{ data: acomodacoes }, { data: camareiras }, { data: processos }] =
    await Promise.all([
      supabase.from("gov_acomodacoes").select("*").eq("ativo", true).order("numero"),
      supabase.from("gov_camareiras").select("*").eq("ativo", true).order("nome"),
      // Só a contagem de itens aqui; as perguntas vêm quando o checklist é escolhido.
      supabase
        .from("gov_processos")
        .select("*, gov_secoes(gov_perguntas(id))")
        .eq("ativo", true)
        .order("nome"),
    ]);

  return (
    <GovernancaShell perfil={perfil} papel={papel}>
      <NovaInspecao
        eu={{ id: perfil.id, nome: perfil.nome }}
        ehAdmin={papel === "admin"}
        escolheCamareira={inspecionaEquipe(papel)}
        acomodacoes={acomodacoes ?? []}
        camareiras={camareiras ?? []}
        processos={(processos ?? []).map(({ gov_secoes, ...p }) => ({
          ...p,
          itens: (gov_secoes ?? []).reduce((n, s) => n + (s.gov_perguntas?.length ?? 0), 0),
        }))}
      />
    </GovernancaShell>
  );
}
