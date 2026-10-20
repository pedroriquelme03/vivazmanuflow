import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  COOKIE_AMBIENTE,
  ambienteEscolhido,
  ambientesDoPapel,
  painelEscolhido,
  paineisDoUsuario,
  type PainelEquipe,
} from "@/lib/ambiente-equipe";
import { ROTA_CHECKLIST } from "@/lib/rotas";

/** Ambiente de chamado da tela. Quem só tem Checklist vai para os checklists. */
export async function resolverAmbiente(
  ambientes: readonly string[] | null | undefined,
  role?: string | null,
) {
  const lista = ambientesDoPapel(role, ambientes);
  if (lista.length === 0) redirect(ROTA_CHECKLIST);
  const jar = await cookies();
  return ambienteEscolhido(lista, jar.get(COOKIE_AMBIENTE)?.value);
}

/** Painel do menu lateral (chamado ou checklist), pelo cookie do seletor. */
export async function resolverPainel(
  ambientes: readonly string[] | null | undefined,
): Promise<PainelEquipe> {
  const jar = await cookies();
  return (
    painelEscolhido(paineisDoUsuario(ambientes), jar.get(COOKIE_AMBIENTE)?.value) ??
    "manutencao"
  );
}
