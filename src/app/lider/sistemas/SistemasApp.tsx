"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { slugValido, sugerirSlug } from "@/lib/slug-sistema";
import { TesteObservabilidade } from "./TesteObservabilidade";

type Sistema = {
  id: string;
  nome: string;
  slug: string | null;
  ativo: boolean;
};

const inputCls =
  "w-full min-w-0 rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30";

export function SistemasApp({
  sistemas,
  aviso,
  slugDisponivel,
  podeTestar,
}: {
  sistemas: Sistema[];
  aviso: string | null;
  slugDisponivel: boolean;
  podeTestar: boolean;
}) {
  const supabase = createClient();
  const router = useRouter();
  const [nome, setNome] = useState("");
  const [slug, setSlug] = useState("");
  const [slugManual, setSlugManual] = useState(false);
  const [erro, setErro] = useState<string | null>(aviso);
  const [salvando, setSalvando] = useState(false);

  async function adicionar() {
    setErro(null);
    if (!nome.trim()) return setErro("Informe o nome do sistema.");
    const slugFinal = (slugManual ? slug : sugerirSlug(nome)).trim();
    if (slugDisponivel && !slugValido(slugFinal)) {
      return setErro(
        "O slug usa letras minúsculas, números e hífen. Ex.: chamados, portal-rh.",
      );
    }
    setSalvando(true);
    const { error } = await supabase.from("sistemas").insert({
      nome: nome.trim(),
      ativo: true,
      ...(slugDisponivel ? { slug: slugFinal } : {}),
    });
    setSalvando(false);
    if (error) {
      if (
        error.message.includes("schema cache") ||
        error.code === "42P01" ||
        error.message.includes("sistemas")
      ) {
        return setErro(
          error.message.includes("slug")
            ? "Rode o SQL em supabase/migrations/20261014130000_alerta_sentry.sql no Supabase."
            : "Rode o SQL em supabase/migrations/20261009140000_sistemas_ti.sql no Supabase.",
        );
      }
      if (error.code === "23505") {
        return setErro(
          error.message.includes("slug")
            ? "Já existe um sistema com esse slug."
            : "Já existe um sistema com esse nome.",
        );
      }
      return setErro(error.message);
    }
    setNome("");
    setSlug("");
    setSlugManual(false);
    router.refresh();
  }

  async function toggle(sistema: Sistema) {
    setErro(null);
    const { error } = await supabase
      .from("sistemas")
      .update({ ativo: !sistema.ativo })
      .eq("id", sistema.id);
    if (error) return setErro(error.message);
    router.refresh();
  }

  return (
    <div className="mx-auto w-full min-h-0 max-w-4xl flex-1 overflow-y-auto px-4 py-6">
      <h1 className="text-xl font-bold">Sistemas</h1>
      <p className="mt-0.5 text-sm text-slate-500">
        Cadastre os programas do hotel. Na abertura do chamado, a pessoa
        escolhe um deles ou deixa &quot;Não é de um sistema&quot;.
      </p>

      <div className="mt-5 rounded-xl border border-slate-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-slate-800">Novo sistema</h2>
        <div className="mt-3 grid gap-2">
          <input
            className={inputCls}
            placeholder="Nome (ex.: PMS, Wi-Fi, Channel)"
            value={nome}
            onChange={(e) => {
              setNome(e.target.value);
              if (!slugManual) setSlug(sugerirSlug(e.target.value));
            }}
            maxLength={80}
          />
          {slugDisponivel && (
            <input
              className={inputCls}
              placeholder="Slug (ex.: portal-rh)"
              value={slug}
              onChange={(e) => {
                setSlugManual(true);
                setSlug(e.target.value.toLowerCase());
              }}
              maxLength={40}
              spellCheck={false}
            />
          )}
          <button
            type="button"
            onClick={adicionar}
            disabled={salvando}
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:opacity-60"
          >
            {salvando ? "Salvando…" : "Cadastrar sistema"}
          </button>
        </div>
        {slugDisponivel && (
          <p className="mt-2 text-xs text-slate-500">
            O slug é a chave que o Sentry envia. Este sistema usa chamados.
          </p>
        )}
        {erro && (
          <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {erro}
          </p>
        )}
      </div>

      <div className="mt-5 space-y-2">
        {sistemas.length === 0 && (
          <p className="rounded-xl border border-dashed border-slate-300 bg-white px-4 py-8 text-center text-sm text-slate-500">
            Nenhum sistema cadastrado ainda.
          </p>
        )}
        {sistemas.map((sistema) => (
          <LinhaSistema
            key={sistema.id}
            sistema={sistema}
            slugDisponivel={slugDisponivel}
            onErro={setErro}
            onToggle={() => toggle(sistema)}
          />
        ))}
      </div>

      {podeTestar && <TesteObservabilidade />}
    </div>
  );
}

function LinhaSistema({
  sistema,
  slugDisponivel,
  onErro,
  onToggle,
}: {
  sistema: Sistema;
  slugDisponivel: boolean;
  onErro: (mensagem: string | null) => void;
  onToggle: () => void;
}) {
  const supabase = createClient();
  const router = useRouter();
  const [slug, setSlug] = useState(sistema.slug ?? "");
  const [salvando, setSalvando] = useState(false);
  const mudou = slug.trim() !== (sistema.slug ?? "");

  async function salvarSlug() {
    onErro(null);
    if (!slugValido(slug.trim())) {
      return onErro(
        "O slug usa letras minúsculas, números e hífen. Ex.: chamados, portal-rh.",
      );
    }
    setSalvando(true);
    const { error } = await supabase
      .from("sistemas")
      .update({ slug: slug.trim() })
      .eq("id", sistema.id);
    setSalvando(false);
    if (error) {
      if (error.code === "23505") {
        return onErro("Já existe um sistema com esse slug.");
      }
      return onErro(error.message);
    }
    router.refresh();
  }

  return (
    <div
      className={`flex flex-col gap-2 rounded-xl border bg-white px-4 py-3 sm:flex-row sm:items-center ${
        sistema.ativo ? "border-slate-200" : "border-slate-100 opacity-60"
      }`}
    >
      <div className="min-w-0 flex-1">
        <p className="break-words font-semibold text-slate-900">
          {sistema.nome}
          {!sistema.ativo && (
            <span className="ml-2 text-xs font-medium text-slate-400">
              inativo
            </span>
          )}
        </p>
        {slugDisponivel && (
          <div className="mt-2 flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center">
            <input
              className={inputCls}
              value={slug}
              onChange={(e) => setSlug(e.target.value.toLowerCase())}
              maxLength={40}
              spellCheck={false}
              aria-label={`Slug de ${sistema.nome}`}
            />
            {mudou && (
              <button
                type="button"
                onClick={() => void salvarSlug()}
                disabled={salvando}
                className="rounded-lg bg-brand-600 px-3 py-2 text-xs font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
              >
                {salvando ? "Salvando…" : "Salvar slug"}
              </button>
            )}
          </div>
        )}
      </div>
      <button
        type="button"
        onClick={onToggle}
        className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
      >
        {sistema.ativo ? "Desativar" : "Ativar"}
      </button>
    </div>
  );
}
