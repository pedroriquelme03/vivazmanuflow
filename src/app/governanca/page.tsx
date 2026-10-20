import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { exigirGovernanca } from "@/lib/governanca-acesso";
import {
  MIGRATION_HINT_GOV,
  erroSchemaGov,
  formatDataHora,
  inspecionaEquipe,
  rotuloTipo,
} from "@/lib/governanca";
import { GovernancaShell } from "./GovernancaShell";
import { Erro, StatusBadge, Vazio } from "./ui";

export const dynamic = "force-dynamic";

export default async function GovernancaHome() {
  const { perfil, papel } = await exigirGovernanca("/governanca");
  const equipe = inspecionaEquipe(papel);

  const supabase = await createClient();
  let query = supabase
    .from("gov_inspecoes")
    .select(
      "id, tipo, status, criado_em, finalizada_em, gov_acomodacoes(numero), gov_camareiras(nome), gov_processos(nome), usuarios(nome)",
    )
    .order("criado_em", { ascending: false })
    .limit(20);
  // Camareira vê só as próprias; líder e admin veem todas.
  if (!equipe) query = query.eq("inspetor_id", perfil.id);
  const { data, error } = await query;
  const inspecoes = data ?? [];

  return (
    <GovernancaShell perfil={perfil} papel={papel}>
      <Erro texto={error && erroSchemaGov(error.message, error.code) ? MIGRATION_HINT_GOV : null} />

      <Link
        href="/governanca/nova"
        className="mb-6 flex items-center gap-4 rounded-2xl bg-brand-600 p-5 text-white shadow-sm transition hover:bg-brand-700"
      >
        <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/15 text-2xl">✓</span>
        <span>
          <span className="block text-base font-semibold">Preencher checklist</span>
          <span className="block text-sm text-white/80">Governança, manutenção, Aquamania, eventos e rondas</span>
        </span>
      </Link>

      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
        {equipe ? "Inspeções recentes" : "Minhas inspeções"}
      </h2>

      {inspecoes.length === 0 ? (
        <Vazio texto="Nenhuma inspeção registrada ainda." />
      ) : (
        <ul className="space-y-2">
          {inspecoes.map((i) => (
            <li key={i.id}>
              <Link
                href={`/governanca/inspecao/${i.id}`}
                className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:bg-slate-50"
              >
                <span className="flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-lg bg-brand-50 text-brand-700">
                  {i.gov_acomodacoes ? (
                    <>
                      <span className="text-[10px] font-medium uppercase">UH</span>
                      <span className="text-sm font-bold leading-none">{i.gov_acomodacoes.numero}</span>
                    </>
                  ) : (
                    <span className="text-lg">📋</span>
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-slate-800">
                    {i.gov_processos?.nome ?? "Checklist"}
                  </p>
                  {i.gov_acomodacoes && i.tipo && (
                    <p className="truncate text-xs text-slate-500">
                      UH {i.gov_acomodacoes.numero} · {rotuloTipo(i.tipo)}
                      {i.gov_camareiras?.nome ? ` · ${i.gov_camareiras.nome}` : ""}
                    </p>
                  )}
                  <p className="truncate text-xs text-slate-500">
                    {formatDataHora(i.finalizada_em ?? i.criado_em)}
                    {equipe && i.usuarios?.nome ? ` · por ${i.usuarios.nome}` : ""}
                  </p>
                </div>
                <StatusBadge status={i.status} />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </GovernancaShell>
  );
}
