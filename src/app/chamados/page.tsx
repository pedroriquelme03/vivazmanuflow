import { redirect } from "next/navigation";
import { getPerfil } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { lerAmbiente } from "@/lib/ambiente-equipe";
import { CHAMADO_LISTA_SELECT_SISTEMA } from "@/lib/demanda-select";
import { resolverVoltar } from "@/lib/resolver-ambiente";
import {
  AbaChamados,
  type ChamadoSolicitante,
} from "@/app/solicitante/SolicitantePainel";
import { ChamadosNav } from "./ChamadosNav";

export const dynamic = "force-dynamic";

/** Chamados que a pessoa logada abriu, de qualquer área. */
export default async function MeusChamadosPage({
  searchParams,
}: {
  searchParams: Promise<{ tipo?: string }>;
}) {
  const perfil = await getPerfil();
  if (!perfil) redirect("/login?next=/chamados");
  if (perfil.role === "solicitante") redirect("/solicitante?aba=chamados");

  const [{ tipo }, voltar, supabase] = await Promise.all([
    searchParams,
    resolverVoltar(perfil),
    createClient(),
  ]);
  // RPC (e não select na tabela): sem policy nova em demandas, nada muda nas
  // outras telas. Ela já filtra por quem abriu e tira os arquivados.
  const { data, error } = await supabase
    .rpc("meus_chamados")
    .select(CHAMADO_LISTA_SELECT_SISTEMA);

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <main className="mx-auto w-full max-w-md flex-1 px-4 pt-6 pb-16">
        <ChamadosNav voltar={voltar} atual="lista" />
        <div className="mt-6">
          {error ? (
            <p className="rounded-xl bg-red-50 p-4 text-sm text-red-700">
              Não deu para carregar seus chamados: {error.message}
            </p>
          ) : (
            <AbaChamados
              chamados={(data ?? []) as unknown as ChamadoSolicitante[]}
              ambientes={["ti", "manutencao"]}
              filtroInicial={lerAmbiente(tipo) ?? voltar.ambiente}
            />
          )}
        </div>
      </main>
    </div>
  );
}
