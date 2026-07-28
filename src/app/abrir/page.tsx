import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { FormAbrir } from "./FormAbrir";

export const dynamic = "force-dynamic";

export default async function AbrirPage() {
  const supabase = await createClient();

  const [
    { data: propriedades },
    { data: solicitantes },
    { data: locais },
    predefRes,
    eventosRes,
  ] = await Promise.all([
    supabase.from("propriedades").select("id, nome").eq("ativo", true).order("nome"),
    supabase
      .from("solicitantes")
      .select("id, nome, propriedade_id")
      .eq("ativo", true)
      .order("nome"),
    supabase
      .from("locais")
      .select("id, nome, propriedade_id")
      .eq("ativo", true)
      .order("nome"),
    supabase
      .from("demandas_predefinidas")
      .select("id, titulo, descricao, prioridade, propriedade_id")
      .eq("ativo", true)
      .order("titulo"),
    supabase
      .from("eventos")
      .select("id, nome, propriedade_id, data_inicio, data_fim")
      .eq("ativo", true)
      .order("data_inicio", { ascending: false, nullsFirst: false }),
  ]);

  return (
    <main className="flex-1 px-4 py-8">
      <div className="mx-auto w-full max-w-md">
        <Link href="/" className="text-sm text-slate-400 hover:text-brand-700">
          ← VivazManuFlow
        </Link>
        <h1 className="mt-2 text-xl font-bold">Abrir uma demanda</h1>
        <p className="mt-1 text-sm text-slate-500">
          Conte o que precisa ser feito. Você receberá um link para acompanhar.
        </p>

        <div className="mt-6">
          <FormAbrir
            propriedades={propriedades ?? []}
            solicitantes={solicitantes ?? []}
            locais={locais ?? []}
            predefinidas={predefRes.data ?? []}
            eventos={eventosRes.data ?? []}
          />
        </div>
      </div>
    </main>
  );
}
