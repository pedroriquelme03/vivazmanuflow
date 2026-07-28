"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Tables } from "@/lib/database.types";

type Evento = Tables<"eventos">;
type Prop = Tables<"propriedades">;

const inputCls =
  "rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30";

function formatarData(iso: string | null) {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  if (!y || !m || !d) return iso;
  return `${d}/${m}/${y}`;
}

export function EventosApp({
  eventos,
  propriedades,
}: {
  eventos: Evento[];
  propriedades: Prop[];
}) {
  const supabase = createClient();
  const router = useRouter();
  const [nome, setNome] = useState("");
  const [descricao, setDescricao] = useState("");
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");
  const [propId, setPropId] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  const nomeProp = (id: string | null) =>
    id ? propriedades.find((p) => p.id === id)?.nome ?? "?" : "Todos os locais";

  async function adicionar() {
    setErro(null);
    if (!nome.trim()) return setErro("Informe o nome do evento.");
    setSalvando(true);
    const { error } = await supabase.from("eventos").insert({
      nome: nome.trim(),
      descricao: descricao.trim() || null,
      data_inicio: dataInicio || null,
      data_fim: dataFim || null,
      propriedade_id: propId || null,
    });
    setSalvando(false);
    if (error) {
      if (error.message.includes("schema cache") || error.code === "42P01") {
        return setErro(
          "Tabela ainda não existe. Rode o SQL em supabase/migrations/20260728170000_eventos.sql no Supabase.",
        );
      }
      return setErro(error.message);
    }
    setNome("");
    setDescricao("");
    setDataInicio("");
    setDataFim("");
    setPropId("");
    router.refresh();
  }

  async function toggle(e: Evento) {
    await supabase.from("eventos").update({ ativo: !e.ativo }).eq("id", e.id);
    router.refresh();
  }

  async function renomear(e: Evento) {
    const novo = window.prompt("Novo nome do evento:", e.nome);
    if (!novo?.trim()) return;
    await supabase.from("eventos").update({ nome: novo.trim() }).eq("id", e.id);
    router.refresh();
  }

  return (
    <div className="mx-auto w-full max-w-4xl flex-1 px-4 py-6">
      <h1 className="text-xl font-bold">Eventos</h1>
      <p className="mt-0.5 text-sm text-slate-500">
        Cadastre eventos para vincular demandas. Isso alimenta as métricas
        separando manutenção de rotina e de eventos.
      </p>

      <div className="mt-5 rounded-xl border border-slate-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-slate-800">Novo evento</h2>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <input
            className={`${inputCls} sm:col-span-2`}
            placeholder="Nome do evento (ex.: Casamento Silva)"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
          />
          <input
            className={`${inputCls} sm:col-span-2`}
            placeholder="Descrição (opcional)"
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
          />
          <label className="grid gap-1 text-xs font-medium text-slate-500">
            Início
            <input
              type="date"
              className={inputCls}
              value={dataInicio}
              onChange={(e) => setDataInicio(e.target.value)}
            />
          </label>
          <label className="grid gap-1 text-xs font-medium text-slate-500">
            Fim
            <input
              type="date"
              className={inputCls}
              value={dataFim}
              onChange={(e) => setDataFim(e.target.value)}
            />
          </label>
          <select
            className={`${inputCls} sm:col-span-2`}
            value={propId}
            onChange={(e) => setPropId(e.target.value)}
          >
            <option value="">Todos os locais principais</option>
            {propriedades.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nome}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={adicionar}
            disabled={salvando}
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:opacity-60 sm:col-span-2"
          >
            {salvando ? "Salvando…" : "Cadastrar evento"}
          </button>
        </div>
        {erro && (
          <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {erro}
          </p>
        )}
      </div>

      <div className="mt-5 rounded-xl border border-slate-200 bg-white p-4">
        <h2 className="mb-2 text-sm font-semibold text-slate-800">
          Eventos cadastrados ({eventos.length})
        </h2>
        {eventos.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-400">
            Nenhum evento ainda. Cadastre o primeiro acima.
          </p>
        ) : (
          <ul>
            {eventos.map((ev) => (
              <li
                key={ev.id}
                className="flex items-center justify-between gap-2 border-t border-slate-100 py-2.5 first:border-t-0"
              >
                <div className={ev.ativo ? "" : "opacity-50"}>
                  <p className="text-sm font-medium text-slate-800">{ev.nome}</p>
                  <p className="text-xs text-slate-400">
                    {nomeProp(ev.propriedade_id)}
                    {" · "}
                    {formatarData(ev.data_inicio)}
                    {ev.data_fim ? ` → ${formatarData(ev.data_fim)}` : ""}
                  </p>
                  {ev.descricao && (
                    <p className="mt-0.5 text-xs text-slate-500">{ev.descricao}</p>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    type="button"
                    onClick={() => renomear(ev)}
                    className="rounded-md px-2 py-1 text-xs text-slate-500 hover:bg-slate-100"
                  >
                    Renomear
                  </button>
                  <button
                    type="button"
                    onClick={() => toggle(ev)}
                    className={`rounded-md px-2 py-1 text-xs font-medium ${
                      ev.ativo
                        ? "text-slate-500 hover:bg-slate-100"
                        : "text-emerald-600 hover:bg-emerald-50"
                    }`}
                  >
                    {ev.ativo ? "Desativar" : "Reativar"}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
