"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { logout } from "@/lib/logout";
import type { Perfil } from "@/lib/auth";
import type { AmbienteEquipe } from "@/lib/ambiente-equipe";
import {
  STATUS_BADGE,
  STATUS_LABEL,
  formatarData,
  nomeSublocal,
} from "@/lib/demanda-ui";
import { PrioridadeTag } from "@/components/PrioridadeTag";
import type { Enums } from "@/lib/database.types";
import { SolicitanteNav } from "./SolicitanteNav";

export type ChamadoSolicitante = {
  id: string;
  titulo: string;
  status: Enums<"demanda_status">;
  prioridade: Enums<"demanda_prioridade">;
  criado_em: string;
  ambiente: AmbienteEquipe | null;
  sublocal: string | null;
  token_acompanhamento: string;
  local: { nome: string } | null;
  propriedade: { nome: string } | null;
};

export function chamadosDoAmbiente(
  lista: ChamadoSolicitante[],
  ambiente: AmbienteEquipe,
) {
  return lista.filter((c) => (c.ambiente ?? "manutencao") === ambiente);
}

function lerAba(valor: string | undefined): "abrir" | "chamados" | "perfil" {
  if (valor === "chamados" || valor === "perfil") return valor;
  return "abrir";
}

export function SolicitantePainel({
  perfil,
  chamados,
  abaInicial,
}: {
  perfil: Perfil;
  chamados: ChamadoSolicitante[];
  abaInicial?: string;
}) {
  const aba = lerAba(abaInicial);
  const [filtro, setFiltro] = useState<AmbienteEquipe>("ti");
  const primeiroNome = perfil.nome.split(" ")[0];
  const abertos = useMemo(
    () =>
      chamados.filter(
        (c) => c.status !== "concluida" && c.status !== "cancelada",
      ).length,
    [chamados],
  );
  const lista = useMemo(
    () => chamadosDoAmbiente(chamados, filtro),
    [chamados, filtro],
  );

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <main className="mx-auto w-full max-w-md flex-1 px-4 pt-6 pb-28">
        {aba === "abrir" && <AbaAbrir nome={primeiroNome} />}
        {aba === "chamados" && (
          <AbaChamados
            filtro={filtro}
            onFiltro={setFiltro}
            lista={lista}
          />
        )}
        {aba === "perfil" && <AbaPerfil perfil={perfil} />}
      </main>
      <SolicitanteNav badgeChamados={abertos} />
    </div>
  );
}

function AbaAbrir({ nome }: { nome: string }) {
  return (
    <div className="flex min-h-[calc(100dvh-8.5rem)] flex-col items-center justify-center text-center">
      <h1 className="text-xl font-bold">Olá, {nome}</h1>
      <p className="mt-0.5 text-sm text-slate-500">
        Abra um chamado de TI ou de Manutenção.
      </p>
      <div className="mt-6 grid w-full max-w-xs gap-3">
        <Link
          href="/solicitante/abrir?tipo=ti"
          className="block rounded-2xl bg-[#1E293B] px-5 py-4 text-center text-base font-semibold text-white shadow-lg shadow-slate-900/20 transition hover:bg-[#0f172a]"
        >
          Abrir chamado de TI
        </Link>
        <Link
          href="/solicitante/abrir?tipo=manutencao"
          className="block rounded-2xl bg-[#0891b2] px-5 py-4 text-center text-base font-semibold text-white shadow-lg shadow-cyan-600/25 transition hover:bg-[#0e7490]"
        >
          Abrir chamado de Manutenção
        </Link>
      </div>
    </div>
  );
}

function AbaChamados({
  filtro,
  onFiltro,
  lista,
}: {
  filtro: AmbienteEquipe;
  onFiltro: (valor: AmbienteEquipe) => void;
  lista: ChamadoSolicitante[];
}) {
  return (
    <>
      <h1 className="text-xl font-bold">Meus chamados</h1>
      <p className="mt-0.5 text-sm text-slate-500">
        TI e Manutenção ficam em listas separadas.
      </p>

      <div className="mt-4 grid grid-cols-2 rounded-full bg-slate-100 p-1 text-sm font-semibold">
        <button
          type="button"
          onClick={() => onFiltro("ti")}
          className={`rounded-full px-3 py-2 ${
            filtro === "ti"
              ? "bg-[#1E293B] text-white shadow"
              : "cursor-pointer text-slate-500"
          }`}
        >
          TI
        </button>
        <button
          type="button"
          onClick={() => onFiltro("manutencao")}
          className={`rounded-full px-3 py-2 ${
            filtro === "manutencao"
              ? "bg-brand-600 text-white shadow"
              : "cursor-pointer text-slate-500"
          }`}
        >
          Manutenção
        </button>
      </div>

      {lista.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-400">
          Nenhum chamado de {filtro === "ti" ? "TI" : "Manutenção"} ainda.
        </div>
      ) : (
        <div className="mt-5 grid gap-3">
          {lista.map((c) => (
            <Link
              key={c.id}
              href={`/acompanhar/${c.token_acompanhamento}`}
              className="block rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-brand-300"
            >
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-semibold text-slate-900">
                  {c.titulo}
                </p>
                <PrioridadeTag prioridade={c.prioridade} />
              </div>
              <p className="mt-1 text-xs text-slate-500">
                {nomeSublocal(c.sublocal, c.local?.nome) ||
                  c.propriedade?.nome ||
                  "—"}
              </p>
              <div className="mt-2 flex items-center justify-between gap-2">
                <span
                  className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${STATUS_BADGE[c.status]}`}
                >
                  {STATUS_LABEL[c.status]}
                </span>
                <span className="text-[11px] text-slate-400">
                  {formatarData(c.criado_em)}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}

function AbaPerfil({ perfil }: { perfil: Perfil }) {
  const iniciais = perfil.nome
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");

  return (
    <>
      <h1 className="text-xl font-bold">Perfil</h1>
      <p className="mt-0.5 text-sm text-slate-500">Seus dados de acesso.</p>
      <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-600 text-lg font-bold text-white">
            {iniciais || "S"}
          </div>
          <div className="min-w-0">
            <p className="truncate text-base font-bold text-slate-900">
              {perfil.nome}
            </p>
            <p className="text-sm text-slate-500">Solicitante</p>
          </div>
        </div>
        <dl className="mt-5 grid gap-3 border-t border-slate-100 pt-4 text-sm">
          <div>
            <dt className="text-xs text-slate-400">E-mail</dt>
            <dd className="font-medium text-slate-700">
              {perfil.email ?? "—"}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-slate-400">Local principal</dt>
            <dd className="font-medium text-slate-700">
              {perfil.propriedade_nome ?? "Todos"}
            </dd>
          </div>
        </dl>
      </div>
      <form action={logout} className="mt-4">
        <button
          type="submit"
          className="w-full cursor-pointer rounded-xl border border-slate-300 bg-white px-4 py-3.5 text-base font-semibold text-slate-700 transition hover:bg-slate-50"
        >
          Sair da conta
        </button>
      </form>
    </>
  );
}
