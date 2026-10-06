import { cookies } from "next/headers";
import {
  COOKIE_AMBIENTE,
  ambienteEscolhido,
  ambientesDoPapel,
} from "@/lib/ambiente-equipe";

export async function resolverAmbiente(
  ambientes: readonly string[] | null | undefined,
  role?: string | null,
) {
  const lista = ambientesDoPapel(role, ambientes);
  const jar = await cookies();
  return ambienteEscolhido(lista, jar.get(COOKIE_AMBIENTE)?.value);
}
