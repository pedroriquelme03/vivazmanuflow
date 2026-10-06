import { redirect } from "next/navigation";
import { getPerfil, rotaInicial } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PainelComAmbiente } from "@/components/PainelComAmbiente";
import {
  pessoaDoAmbiente,
  recursoAmbienteAusente,
} from "@/lib/ambiente-equipe";
import { resolverAmbiente } from "@/lib/resolver-ambiente";
import { MetricasDashboard } from "./MetricasDashboard";

export const dynamic = "force-dynamic";

export default async function MetricasPage() {
  const perfil = await getPerfil();
  if (!perfil) redirect("/login?next=/lider/metricas");
  if (perfil.role === "colaborador" || perfil.role === "solicitante") {
    redirect(rotaInicial(perfil.role));
  }

  const supabase = await createClient();
  const ambiente = await resolverAmbiente(perfil.ambientes, perfil.role);
  const [
    equipeRes,
    { data: setores },
    { data: propriedades },
    { data: locais },
    eventosRes,
  ] = await Promise.all([
    supabase
      .from("usuarios")
      .select("id, nome, ambientes")
      .eq("role", "colaborador")
      .eq("ativo", true)
      .order("nome"),
    supabase.from("setores").select("id, nome, propriedade_id").eq("ativo", true).order("nome"),
    supabase.from("propriedades").select("id, nome").eq("ativo", true).order("nome"),
    supabase
      .from("locais")
      .select("id, nome, propriedade_id")
      .eq("ativo", true)
      .order("nome"),
    supabase.from("eventos").select("id, nome").eq("ativo", true).order("nome"),
  ]);

  let colaboradores = (equipeRes.data ?? []).map(({ id, nome }) => ({
    id,
    nome,
  }));
  if (equipeRes.error && recursoAmbienteAusente(equipeRes.error.message)) {
    const legado = await supabase
      .from("usuarios")
      .select("id, nome")
      .eq("role", "colaborador")
      .eq("ativo", true)
      .order("nome");
    colaboradores = legado.data ?? [];
  } else {
    colaboradores = (equipeRes.data ?? [])
      .filter((pessoa) => pessoaDoAmbiente(pessoa.ambientes, ambiente))
      .map(({ id, nome }) => ({ id, nome }));
  }

  return (
    <PainelComAmbiente perfil={perfil}>
      <MetricasDashboard
        ambiente={ambiente}
        colaboradores={colaboradores ?? []}
        setores={setores ?? []}
        propriedades={propriedades ?? []}
        locais={locais ?? []}
        eventos={eventosRes.data ?? []}
      />
    </PainelComAmbiente>
  );
}
