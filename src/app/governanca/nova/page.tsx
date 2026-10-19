import { createClient } from "@/lib/supabase/server";
import { exigirGovernanca } from "@/lib/governanca-acesso";
import { inspecionaEquipe, ordenarSecoes, type SecaoComPerguntas } from "@/lib/governanca";
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
      supabase
        .from("gov_processos")
        .select("*, gov_secoes(*, gov_perguntas(*))")
        .eq("ativo", true)
        .order("nome"),
    ]);

  return (
    <GovernancaShell perfil={perfil} papel={papel}>
      <NovaInspecao
        eu={{ id: perfil.id, nome: perfil.nome }}
        escolheCamareira={inspecionaEquipe(papel)}
        acomodacoes={acomodacoes ?? []}
        camareiras={camareiras ?? []}
        processos={(processos ?? []).map(({ gov_secoes, ...p }) => ({
          ...p,
          secoes: ordenarSecoes((gov_secoes ?? []) as SecaoComPerguntas[]),
        }))}
      />
    </GovernancaShell>
  );
}
