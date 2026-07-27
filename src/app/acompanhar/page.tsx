import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { BuscaHistorico } from "./BuscaHistorico";

export const dynamic = "force-dynamic";

export default async function AcompanharPage() {
  const supabase = await createClient();

  const [{ data: propriedades }, { data: solicitantes }] = await Promise.all([
    supabase.from("propriedades").select("id, nome").eq("ativo", true).order("nome"),
    supabase
      .from("solicitantes")
      .select("id, nome, propriedade_id")
      .eq("ativo", true)
      .order("nome"),
  ]);

  return (
    <main className="flex-1 px-4 py-8">
      <div className="mx-auto w-full max-w-lg">
        <Link href="/" className="text-sm text-slate-400 hover:text-brand-700">
          ← VivazManuFlow
        </Link>
        <h1 className="mt-2 text-xl font-bold">Acompanhar meus pedidos</h1>
        <p className="mt-1 text-sm text-slate-500">
          Selecione seu nome para ver todas as demandas que você abriu.
        </p>

        <div className="mt-6">
          <BuscaHistorico
            propriedades={propriedades ?? []}
            solicitantes={solicitantes ?? []}
          />
        </div>
      </div>
    </main>
  );
}
