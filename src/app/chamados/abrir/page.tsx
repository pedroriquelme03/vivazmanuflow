import Link from "next/link";
import { redirect } from "next/navigation";
import { getPerfil } from "@/lib/auth";
import { AMBIENTES_CHAMADO, lerAmbiente } from "@/lib/ambiente-equipe";
import { primeiroNome } from "@/lib/email-acesso";
import { resolverVoltar } from "@/lib/resolver-ambiente";
import { createClient } from "@/lib/supabase/server";
import { EscolherArea } from "@/components/EscolherArea";
import { CartaoAbrirChamado } from "@/app/solicitante/abrir/CartaoAbrirChamado";
import { ChamadosNav } from "../ChamadosNav";

export const dynamic = "force-dynamic";

const ROTA = "/chamados/abrir";

/**
 * Qualquer pessoa logada abre chamado de Manutenção ou de TI, mesmo sem fazer
 * parte da área. `usuarios.ambientes` só decide onde ela trabalha.
 * Igual ao solicitante: primeiro escolhe a área (nada vem marcado), depois o
 * formulário daquela área.
 */
export default async function AbrirChamadoPage({
  searchParams,
}: {
  searchParams: Promise<{ tipo?: string }>;
}) {
  const perfil = await getPerfil();
  if (!perfil) redirect(`/login?next=${ROTA}`);

  const ambiente = lerAmbiente((await searchParams).tipo);
  if (perfil.role === "solicitante") {
    redirect(ambiente ? `/solicitante/abrir?tipo=${ambiente}` : "/solicitante");
  }
  const voltar = await resolverVoltar(perfil);

  if (!ambiente) {
    return (
      <Moldura voltar={voltar}>
        <EscolherArea
          nome={primeiroNome(perfil.nome)}
          ambientes={AMBIENTES_CHAMADO}
          rota={ROTA}
          className="mt-16"
        />
      </Moldura>
    );
  }

  // O chamado fica no nome da pessoa: só precisa das linhas com o nome dela.
  const supabase = await createClient();
  const nomeLike = perfil.nome.trim().replace(/[\\%_]/g, (c) => `\\${c}`);
  const [{ data: propriedades }, { data: solicitantes }, sistemasRes] = await Promise.all([
    supabase.from("propriedades").select("id, nome").eq("ativo", true).order("nome"),
    supabase
      .from("solicitantes")
      .select("id, nome, propriedade_id")
      .eq("ativo", true)
      .ilike("nome", nomeLike),
    ambiente === "ti"
      ? supabase.from("sistemas").select("id, nome").eq("ativo", true).order("nome")
      : Promise.resolve({ data: [], error: null }),
  ]);

  return (
    <Moldura voltar={voltar}>
      <Link
        href={ROTA}
        className="mt-4 inline-block text-sm text-slate-400 transition hover:text-brand-700"
      >
        ← Escolher outra área
      </Link>
      <CartaoAbrirChamado
        className="mt-3"
        ambiente={ambiente}
        nome={perfil.nome}
        propriedadePadrao={perfil.propriedade_id}
        propriedades={propriedades ?? []}
        solicitantes={solicitantes ?? []}
        sistemas={sistemasRes.data ?? []}
        destino={`/chamados?tipo=${ambiente}`}
      />
    </Moldura>
  );
}

function Moldura({
  voltar,
  children,
}: {
  voltar: React.ComponentProps<typeof ChamadosNav>["voltar"];
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-full flex-1 flex-col">
      <main className="mx-auto w-full max-w-md flex-1 px-4 pt-6 pb-16">
        <ChamadosNav voltar={voltar} atual="abrir" />
        {children}
      </main>
    </div>
  );
}
