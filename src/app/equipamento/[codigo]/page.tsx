import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getPerfil } from "@/lib/auth";
import { EquipamentoPainel } from "./EquipamentoPainel";
import type { Json } from "@/lib/database.types";

export const dynamic = "force-dynamic";

type ConsultaOk = {
  ok: true;
  equipamento: {
    id: string;
    nome: string;
    codigo: string;
    descricao: string | null;
    area_id: string;
    area_nome: string;
    area_descricao: string | null;
  };
  historico: {
    id: string;
    tipo: string;
    descricao: string;
    foto_url: string | null;
    realizado_em: string;
    realizado_por_nome: string | null;
  }[];
};

type ConsultaErro = { ok: false; erro: string };

export default async function EquipamentoPage({
  params,
}: {
  params: Promise<{ codigo: string }>;
}) {
  const { codigo } = await params;
  const decoded = decodeURIComponent(codigo);

  const supabase = await createClient();
  const [{ data }, perfil] = await Promise.all([
    supabase.rpc("consultar_equipamento", { p_codigo: decoded }),
    getPerfil(),
  ]);

  const raw = data as Json;
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) notFound();
  const consulta = raw as unknown as ConsultaOk | ConsultaErro;
  if (!consulta.ok) notFound();

  return (
    <main className="flex-1 px-4 py-8">
      <div className="mx-auto w-full max-w-lg">
        <Link href="/" className="text-sm text-slate-400 hover:text-brand-700">
          ← VivazManuFlow
        </Link>

        <EquipamentoPainel
          equipamento={consulta.equipamento}
          historico={consulta.historico ?? []}
          logado={!!perfil}
          nomeUsuario={perfil?.nome ?? null}
        />
      </div>
    </main>
  );
}
