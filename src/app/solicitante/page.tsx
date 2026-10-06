import { redirect } from "next/navigation";
import { getPerfil, rotaInicial } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { idsSolicitanteDoNome } from "@/lib/solicitante-gestor";
import { recursoAmbienteAusente } from "@/lib/ambiente-equipe";
import {
  SolicitantePainel,
  type ChamadoSolicitante,
} from "./SolicitantePainel";

export const dynamic = "force-dynamic";

const CHAMADO_SELECT = `
  id, titulo, status, prioridade, criado_em, ambiente, sublocal,
  token_acompanhamento,
  local:locais(nome),
  propriedade:propriedades(nome)
`;

export default async function SolicitanteHome({
  searchParams,
}: {
  searchParams: Promise<{ aba?: string }>;
}) {
  const perfil = await getPerfil();
  if (!perfil) redirect("/login?next=/solicitante");
  if (perfil.role !== "solicitante") redirect(rotaInicial(perfil.role));

  const { aba } = await searchParams;
  const supabase = await createClient();
  const { data: cadastros } = await supabase
    .from("solicitantes")
    .select("id, nome")
    .eq("ativo", true);
  const ids = idsSolicitanteDoNome(cadastros ?? [], perfil.nome);

  let chamados: ChamadoSolicitante[] = [];
  if (ids.length > 0) {
    const comAmbiente = await supabase
      .from("demandas")
      .select(CHAMADO_SELECT)
      .in("solicitante_id", ids)
      .eq("arquivado", false)
      .order("criado_em", { ascending: false });
    if (comAmbiente.error && recursoAmbienteAusente(comAmbiente.error.message)) {
      const semAmbiente = await supabase
        .from("demandas")
        .select(
          `id, titulo, status, prioridade, criado_em, sublocal,
           token_acompanhamento, local:locais(nome), propriedade:propriedades(nome)`,
        )
        .in("solicitante_id", ids)
        .eq("arquivado", false)
        .order("criado_em", { ascending: false });
      chamados = (semAmbiente.data ?? []).map((d) => ({
        ...d,
        ambiente: null,
      })) as ChamadoSolicitante[];
    } else {
      chamados = (comAmbiente.data ?? []) as unknown as ChamadoSolicitante[];
    }
  }

  return (
    <SolicitantePainel
      perfil={perfil}
      chamados={chamados}
      abaInicial={aba}
    />
  );
}
