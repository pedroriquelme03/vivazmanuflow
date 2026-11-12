import { createClient } from "@/lib/supabase/server";
import { exigirGovernanca } from "@/lib/governanca-acesso";
import type { Colaborador } from "@/lib/checklist-setores";
import { GovernancaShell } from "../../GovernancaShell";
import { carregarSetoresDaPessoa } from "../../setores-dados";
import { ColaboradoresApp } from "./ColaboradoresApp";

export const dynamic = "force-dynamic";

export default async function ColaboradoresPage({
  searchParams,
}: {
  searchParams: Promise<{ setor?: string }>;
}) {
  const { perfil, papel } = await exigirGovernanca("/governanca/admin/colaboradores", "equipe");
  const supabase = await createClient();
  const { setores, propriedades, meusSetores } = await carregarSetoresDaPessoa(supabase, perfil.id, papel);

  // O líder vê e cadastra só o pessoal dos próprios setores; o admin, todos.
  let colaboradores: Colaborador[] = [];
  if (papel === "admin" || meusSetores.length) {
    let consulta = supabase.from("gov_camareiras").select("*").order("nome");
    if (papel !== "admin") consulta = consulta.in("setor_id", meusSetores.map((s) => s.id));
    colaboradores = (await consulta).data ?? [];
  }

  return (
    <GovernancaShell perfil={perfil} papel={papel}>
      <ColaboradoresApp
        lista={colaboradores}
        setores={setores}
        propriedades={propriedades}
        meusSetores={meusSetores}
        filtroInicial={(await searchParams).setor}
      />
    </GovernancaShell>
  );
}
