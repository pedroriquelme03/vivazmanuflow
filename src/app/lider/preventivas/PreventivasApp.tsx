"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Tables } from "@/lib/database.types";
import { propriedadesAtivas } from "@/lib/propriedade-opcoes";
import {
  RITMOS_PREVENTIVA,
  rotuloRitmo,
  type UnidadePreventiva,
} from "@/lib/preventiva";

type Lugar = Tables<"preventiva_locais">;
type Rotina = Tables<"preventivas">;
type Prop = { id: string; nome: string; ativo: boolean };

const inputCls =
  "w-full min-w-0 rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30";

const SQL_HINT =
  "Rode o SQL em supabase/migrations/20261008160000_preventivas.sql no Supabase.";

function dataBr(iso: string) {
  const [y, m, d] = iso.slice(0, 10).split("-");
  if (!y || !m || !d) return iso;
  return `${d}/${m}/${y}`;
}

function hojeSp() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
  }).format(new Date());
}

function unidadeDe(valor: string): UnidadePreventiva {
  if (valor === "dia" || valor === "ano") return valor;
  return "mes";
}

export function PreventivasApp({
  lugares,
  rotinas,
  propriedades,
  propriedadePadrao,
  abertasAgora,
  aviso,
}: {
  lugares: Lugar[];
  rotinas: Rotina[];
  propriedades: Prop[];
  propriedadePadrao: string | null;
  abertasAgora: number;
  aviso: string | null;
}) {
  const [lugarId, setLugarId] = useState<string | null>(null);
  const lugar = lugares.find((l) => l.id === lugarId) ?? null;

  if (lugar) {
    return (
      <LugarDetalhe
        lugar={lugar}
        rotinas={rotinas.filter((r) => r.local_id === lugar.id)}
        onVoltar={() => setLugarId(null)}
      />
    );
  }

  return (
    <ListaLugares
      lugares={lugares}
      rotinas={rotinas}
      propriedades={propriedades}
      propriedadePadrao={propriedadePadrao}
      abertasAgora={abertasAgora}
      aviso={aviso}
      onAbrir={setLugarId}
    />
  );
}

function ListaLugares({
  lugares,
  rotinas,
  propriedades,
  propriedadePadrao,
  abertasAgora,
  aviso,
  onAbrir,
}: {
  lugares: Lugar[];
  rotinas: Rotina[];
  propriedades: Prop[];
  propriedadePadrao: string | null;
  abertasAgora: number;
  aviso: string | null;
  onAbrir: (id: string) => void;
}) {
  const supabase = createClient();
  const router = useRouter();
  const ativos = propriedadesAtivas(propriedades);
  const [nome, setNome] = useState("");
  const [propId, setPropId] = useState(
    propriedadePadrao && ativos.some((p) => p.id === propriedadePadrao)
      ? propriedadePadrao
      : (ativos[0]?.id ?? ""),
  );
  const [erro, setErro] = useState<string | null>(aviso);
  const [salvando, setSalvando] = useState(false);

  const qtd = (id: string) => rotinas.filter((r) => r.local_id === id).length;
  const nomeProp = (id: string) =>
    propriedades.find((p) => p.id === id)?.nome ?? "";

  async function criar() {
    setErro(null);
    if (!nome.trim()) return setErro("Informe o nome do lugar.");
    if (!propId) return setErro("Escolha o hotel.");
    setSalvando(true);
    const { error } = await supabase.from("preventiva_locais").insert({
      nome: nome.trim(),
      propriedade_id: propId,
    });
    setSalvando(false);
    if (error) {
      if (error.code === "42P01" || error.message.includes("schema cache")) {
        return setErro(SQL_HINT);
      }
      return setErro(error.message);
    }
    setNome("");
    router.refresh();
  }

  async function pausarLugar(lugar: Lugar) {
    const { error } = await supabase
      .from("preventiva_locais")
      .update({ ativo: !lugar.ativo })
      .eq("id", lugar.id);
    if (error) return setErro(error.message);
    router.refresh();
  }

  return (
    <div className="mx-auto min-h-0 w-full max-w-4xl flex-1 overflow-y-auto px-4 py-6">
      <h1 className="text-xl font-bold text-slate-900">Preventivas</h1>
      <p className="mt-0.5 text-sm text-slate-500">
        Cadastre o lugar e, dentro dele, as preventivas. No dia marcado elas
        caem na fila com prioridade alta, sem responsável.
      </p>

      {abertasAgora > 0 && (
        <p className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          {abertasAgora === 1
            ? "1 preventiva entrou na fila agora."
            : `${abertasAgora} preventivas entraram na fila agora.`}
        </p>
      )}

      <div className="mt-5 rounded-xl border border-slate-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-slate-800">Novo lugar</h2>
        <div className="mt-3 grid gap-2">
          <input
            className={inputCls}
            placeholder="Nome (ex.: Cozinha)"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
          />
          {ativos.length > 1 && (
            <select
              className={inputCls}
              value={propId}
              onChange={(e) => setPropId(e.target.value)}
            >
              {ativos.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nome}
                </option>
              ))}
            </select>
          )}
          <button
            type="button"
            onClick={criar}
            disabled={salvando}
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:opacity-60"
          >
            {salvando ? "Salvando…" : "Cadastrar lugar"}
          </button>
        </div>
        {erro && (
          <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {erro}
          </p>
        )}
      </div>

      <div className="mt-5 space-y-2">
        {lugares.length === 0 && (
          <p className="rounded-xl border border-dashed border-slate-300 bg-white px-4 py-8 text-center text-sm text-slate-500">
            Nenhum lugar cadastrado ainda.
          </p>
        )}
        {lugares.map((lugar) => (
          <div
            key={lugar.id}
            className={`flex flex-col gap-2 rounded-xl border bg-white px-4 py-3 sm:flex-row sm:items-center ${
              lugar.ativo ? "border-slate-200" : "border-slate-100 opacity-60"
            }`}
          >
            <button
              type="button"
              onClick={() => onAbrir(lugar.id)}
              className="min-w-0 flex-1 text-left"
            >
              <p className="break-words font-semibold text-slate-900">
                {lugar.nome}
              </p>
              <p className="break-words text-xs text-slate-500">
                {ativos.length > 1 ? `${nomeProp(lugar.propriedade_id)} · ` : ""}
                {qtd(lugar.id)} preventiva{qtd(lugar.id) === 1 ? "" : "s"}
                {!lugar.ativo && " · inativo"}
              </p>
            </button>
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => onAbrir(lugar.id)}
                className="rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-700"
              >
                Preventivas
              </button>
              <button
                type="button"
                onClick={() => pausarLugar(lugar)}
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                {lugar.ativo ? "Desativar" : "Ativar"}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function LugarDetalhe({
  lugar,
  rotinas,
  onVoltar,
}: {
  lugar: Lugar;
  rotinas: Rotina[];
  onVoltar: () => void;
}) {
  const supabase = createClient();
  const router = useRouter();
  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [data, setData] = useState(hojeSp());
  const [qtd, setQtd] = useState(1);
  const [unidade, setUnidade] = useState<UnidadePreventiva>("mes");
  const [editId, setEditId] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [confirmarApagar, setConfirmarApagar] = useState(false);

  const ritmoAtual = useMemo(
    () => rotuloRitmo(qtd, unidade),
    [qtd, unidade],
  );

  function limparForm() {
    setEditId(null);
    setTitulo("");
    setDescricao("");
    setData(hojeSp());
    setQtd(1);
    setUnidade("mes");
  }

  function editar(r: Rotina) {
    setEditId(r.id);
    setTitulo(r.titulo);
    setDescricao(r.descricao ?? "");
    setData(r.proxima_abertura.slice(0, 10));
    setQtd(r.intervalo_quantidade);
    setUnidade(unidadeDe(r.intervalo_unidade));
    setErro(null);
  }

  async function salvarRotina() {
    setErro(null);
    if (!titulo.trim()) return setErro("Informe o nome da preventiva.");
    if (!data) return setErro("Informe o dia em que ela abre.");
    if (qtd < 1) return setErro("O intervalo precisa ser pelo menos 1.");
    setSalvando(true);
    const payload = {
      titulo: titulo.trim(),
      descricao: descricao.trim() || null,
      intervalo_quantidade: qtd,
      intervalo_unidade: unidade,
      proxima_abertura: data,
    };
    const { error } = editId
      ? await supabase.from("preventivas").update(payload).eq("id", editId)
      : await supabase
          .from("preventivas")
          .insert({ ...payload, local_id: lugar.id });
    setSalvando(false);
    if (error) {
      if (error.code === "42P01" || error.message.includes("schema cache")) {
        return setErro(SQL_HINT);
      }
      return setErro(error.message);
    }
    limparForm();
    router.refresh();
  }

  async function pausar(r: Rotina) {
    const { error } = await supabase
      .from("preventivas")
      .update({ ativo: !r.ativo })
      .eq("id", r.id);
    if (error) return setErro(error.message);
    router.refresh();
  }

  async function apagarRotina(id: string) {
    const { error } = await supabase.from("preventivas").delete().eq("id", id);
    if (error) return setErro(error.message);
    if (editId === id) limparForm();
    router.refresh();
  }

  async function apagarLugar() {
    const { error } = await supabase
      .from("preventiva_locais")
      .delete()
      .eq("id", lugar.id);
    if (error) return setErro(error.message);
    onVoltar();
    router.refresh();
  }

  return (
    <div className="mx-auto min-h-0 w-full max-w-4xl flex-1 overflow-y-auto px-4 py-6">
      <button
        type="button"
        onClick={onVoltar}
        className="text-sm font-medium text-brand-700 hover:underline"
      >
        ← Voltar aos lugares
      </button>
      <h1 className="mt-2 text-xl font-bold">{lugar.nome}</h1>

      <form
        className="mt-5 space-y-3 rounded-xl border border-slate-200 bg-white p-4"
        onSubmit={(e) => {
          e.preventDefault();
          void salvarRotina();
        }}
      >
        <h2 className="text-sm font-semibold text-slate-800">
          {editId ? "Editar preventiva" : "Nova preventiva"}
        </h2>
        <input
          className={inputCls}
          placeholder="Ex.: Limpeza da coifa"
          value={titulo}
          onChange={(e) => setTitulo(e.target.value)}
        />
        <textarea
          className={inputCls}
          rows={2}
          placeholder="Descrição (opcional)"
          value={descricao}
          onChange={(e) => setDescricao(e.target.value)}
        />
        <label className="block text-xs font-medium text-slate-600">
          Abre neste dia
          <input
            type="date"
            className={`${inputCls} mt-1`}
            value={data}
            onChange={(e) => setData(e.target.value)}
          />
        </label>
        <div className="flex flex-wrap gap-2">
          {RITMOS_PREVENTIVA.map((r) => {
            const ativo = r.quantidade === qtd && r.unidade === unidade;
            return (
              <button
                key={r.id}
                type="button"
                onClick={() => {
                  setQtd(r.quantidade);
                  setUnidade(r.unidade);
                }}
                className={`rounded-full px-3 py-1 text-xs font-semibold ${
                  ativo
                    ? "bg-brand-600 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {r.rotulo}
              </button>
            );
          })}
        </div>
        <div className="grid grid-cols-2 gap-2">
          <label className="text-xs font-medium text-slate-600">
            A cada
            <input
              type="number"
              min={1}
              max={365}
              className={`${inputCls} mt-1`}
              value={qtd}
              onChange={(e) => setQtd(Number(e.target.value))}
            />
          </label>
          <label className="text-xs font-medium text-slate-600">
            Unidade
            <select
              className={`${inputCls} mt-1`}
              value={unidade}
              onChange={(e) => setUnidade(unidadeDe(e.target.value))}
            >
              <option value="dia">Dias</option>
              <option value="mes">Meses</option>
              <option value="ano">Anos</option>
            </select>
          </label>
        </div>
        <p className="text-xs text-slate-500">
          {ritmoAtual}. Na fila entra como prioridade alta, com o título
          “Preventiva: {titulo.trim() || "…"}”, sem responsável.
        </p>
        {erro && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {erro}
          </p>
        )}
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={salvando}
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
          >
            {salvando ? "Salvando…" : editId ? "Salvar" : "Criar preventiva"}
          </button>
          {editId && (
            <button
              type="button"
              onClick={limparForm}
              className="rounded-lg px-3 py-2 text-sm font-semibold text-slate-500 hover:bg-slate-50"
            >
              Cancelar
            </button>
          )}
        </div>
      </form>

      <ul className="mt-4 space-y-2">
        {rotinas.length === 0 && (
          <li className="rounded-xl border border-dashed border-slate-300 bg-white px-4 py-6 text-center text-sm text-slate-500">
            Nenhuma preventiva neste lugar.
          </li>
        )}
        {rotinas.map((r) => (
          <li
            key={r.id}
            className={`rounded-xl border bg-white px-4 py-3 ${
              r.ativo ? "border-slate-200" : "border-slate-100 opacity-60"
            }`}
          >
            <p className="font-semibold text-slate-900">{r.titulo}</p>
            <p className="mt-0.5 text-xs text-slate-500">
              {rotuloRitmo(r.intervalo_quantidade, unidadeDe(r.intervalo_unidade))}
              {" · "}próxima {dataBr(r.proxima_abertura)}
              {" · "}prioridade alta
              {!r.ativo && " · pausada"}
            </p>
            {r.descricao && (
              <p className="mt-1 text-sm text-slate-600">{r.descricao}</p>
            )}
            <div className="mt-2 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => editar(r)}
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Editar
              </button>
              <button
                type="button"
                onClick={() => pausar(r)}
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                {r.ativo ? "Pausar" : "Ativar"}
              </button>
              <button
                type="button"
                onClick={() => apagarRotina(r.id)}
                className="rounded-lg px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50"
              >
                Apagar
              </button>
            </div>
          </li>
        ))}
      </ul>

      <div className="mt-6">
        {confirmarApagar ? (
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm text-slate-600">
              Apagar este lugar e as preventivas dele?
            </p>
            <button
              type="button"
              onClick={apagarLugar}
              className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white"
            >
              Apagar lugar
            </button>
            <button
              type="button"
              onClick={() => setConfirmarApagar(false)}
              className="rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-500"
            >
              Cancelar
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setConfirmarApagar(true)}
            className="text-xs font-semibold text-red-600 hover:underline"
          >
            Apagar lugar
          </button>
        )}
      </div>
    </div>
  );
}
