import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CopiarLink } from "@/components/CopiarLink";
import {
  STATUS_LABEL,
  STATUS_BADGE,
  formatarData,
} from "@/lib/demanda-ui";
import { PrioridadeTag } from "@/components/PrioridadeTag";
import { ValidacaoSolicitante } from "./ValidacaoSolicitante";
import type { Enums } from "@/lib/database.types";

export const dynamic = "force-dynamic";

type Detalhe = {
  id: string;
  titulo: string;
  descricao: string | null;
  prioridade: Enums<"demanda_prioridade">;
  status: Enums<"demanda_status">;
  criado_em: string;
  atribuido_em: string | null;
  iniciado_em: string | null;
  concluido_em: string | null;
  prazo: string | null;
  solicitante: string;
  propriedade: string;
  local: string | null;
  colaborador: string | null;
  timeline: { status: Enums<"demanda_status">; em: string; obs: string | null }[];
  anexos: { tipo: "foto" | "video"; url: string; por: string; em: string }[];
};

export default async function AcompanharToken({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ nova?: string }>;
}) {
  const { token } = await params;
  const { nova } = await searchParams;

  const supabase = await createClient();
  const { data } = await supabase.rpc("acompanhar_demanda", { p_token: token });
  const d = data as Detalhe | null;
  if (!d || !d.id) notFound();

  return (
    <main className="flex-1 px-4 py-8">
      <div className="mx-auto w-full max-w-lg">
        <Link href="/" className="text-sm text-slate-400 hover:text-brand-700">
          ← VivazManuFlow
        </Link>

        {nova && (
          <div className="mt-3 rounded-xl border border-brand-200 bg-brand-50 p-4">
            <p className="text-sm font-semibold text-brand-800">
              Demanda registrada! ✅
            </p>
            <p className="mt-1 text-sm text-brand-700">
              Salve esta página para acompanhar o andamento.
            </p>
            <div className="mt-3">
              <CopiarLink />
            </div>
          </div>
        )}

        <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <h1 className="text-lg font-bold">{d.titulo}</h1>
            <div className="flex shrink-0 flex-col items-end gap-1.5">
              <PrioridadeTag prioridade={d.prioridade} />
              <span
                className={`rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_BADGE[d.status]}`}
              >
                {STATUS_LABEL[d.status]}
              </span>
            </div>
          </div>

          {d.descricao && (
            <p className="mt-2 text-sm text-slate-600">{d.descricao}</p>
          )}

          <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            <Info titulo="Local principal" valor={d.propriedade} />
            <Info titulo="Sublocal" valor={d.local ?? "—"} />
            <Info titulo="Solicitante" valor={d.solicitante} />
            <Info titulo="Responsável" valor={d.colaborador ?? "A definir"} />
            <Info titulo="Prazo" valor={formatarData(d.prazo)} />
          </dl>
        </div>

        {d.status === "aguardando_validacao" && (
          <ValidacaoSolicitante token={token} />
        )}

        {d.anexos.length > 0 && (
          <div className="mt-4">
            <h2 className="mb-2 text-sm font-semibold text-slate-600">Anexos</h2>
            <div className="grid grid-cols-3 gap-2">
              {d.anexos.map((a, i) => (
                <a
                  key={i}
                  href={a.url}
                  target="_blank"
                  rel="noreferrer"
                  className="group relative overflow-hidden rounded-lg border border-slate-200 bg-slate-100"
                >
                  {a.tipo === "foto" ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={a.url}
                      alt="Anexo"
                      className="aspect-square w-full object-cover"
                    />
                  ) : (
                    <div className="flex aspect-square w-full items-center justify-center text-2xl">
                      🎬
                    </div>
                  )}
                </a>
              ))}
            </div>
          </div>
        )}

        <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold text-slate-600">
            Acompanhamento
          </h2>
          <ol className="relative border-l border-slate-200 pl-4">
            {d.timeline.map((t, i) => (
              <li key={i} className="mb-4 last:mb-0">
                <span className="absolute -left-1.5 mt-1 h-3 w-3 rounded-full bg-brand-500" />
                <p className="text-sm font-medium text-slate-800">
                  {STATUS_LABEL[t.status]}
                </p>
                <p className="text-xs text-slate-400">{formatarData(t.em)}</p>
                {t.obs && <p className="mt-0.5 text-sm text-slate-600">{t.obs}</p>}
              </li>
            ))}
          </ol>
        </div>
      </div>
    </main>
  );
}

function Info({ titulo, valor }: { titulo: string; valor: string }) {
  return (
    <div>
      <dt className="text-xs text-slate-400">{titulo}</dt>
      <dd className="font-medium text-slate-700">{valor}</dd>
    </div>
  );
}
