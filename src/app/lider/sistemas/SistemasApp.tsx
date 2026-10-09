"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Sistema = {
  id: string;
  nome: string;
  ativo: boolean;
};

const inputCls =
  "w-full min-w-0 rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30";

export function SistemasApp({
  sistemas,
  aviso,
}: {
  sistemas: Sistema[];
  aviso: string | null;
}) {
  const supabase = createClient();
  const router = useRouter();
  const [nome, setNome] = useState("");
  const [erro, setErro] = useState<string | null>(aviso);
  const [salvando, setSalvando] = useState(false);

  async function adicionar() {
    setErro(null);
    if (!nome.trim()) return setErro("Informe o nome do sistema.");
    setSalvando(true);
    const { error } = await supabase.from("sistemas").insert({
      nome: nome.trim(),
      ativo: true,
    });
    setSalvando(false);
    if (error) {
      if (
        error.message.includes("schema cache") ||
        error.code === "42P01" ||
        error.message.includes("sistemas")
      ) {
        return setErro(
          "Rode o SQL em supabase/migrations/20261009140000_sistemas_ti.sql no Supabase.",
        );
      }
      if (error.code === "23505") {
        return setErro("Já existe um sistema com esse nome.");
      }
      return setErro(error.message);
    }
    setNome("");
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
            onChange={(e) => setNome(e.target.value)}
            maxLength={80}
          />
          <button
            type="button"
            onClick={adicionar}
            disabled={salvando}
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:opacity-60"
          >
            {salvando ? "Salvando…" : "Cadastrar sistema"}
          </button>
        </div>
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
          <div
            key={sistema.id}
            className={`flex flex-col gap-2 rounded-xl border bg-white px-4 py-3 sm:flex-row sm:items-center ${
              sistema.ativo ? "border-slate-200" : "border-slate-100 opacity-60"
            }`}
          >
            <p className="min-w-0 flex-1 break-words font-semibold text-slate-900">
              {sistema.nome}
              {!sistema.ativo && (
                <span className="ml-2 text-xs font-medium text-slate-400">
                  inativo
                </span>
              )}
            </p>
            <button
              type="button"
              onClick={() => toggle(sistema)}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
            >
              {sistema.ativo ? "Desativar" : "Ativar"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
