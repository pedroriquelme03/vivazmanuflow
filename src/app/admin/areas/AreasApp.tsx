"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Tables } from "@/lib/database.types";
import {
  gerarCodigoEquipamento,
  normalizarCodigo,
  urlEquipamento,
  urlQrCode,
} from "@/lib/equipamento";

type Area = Tables<"hotel_areas">;
type Equip = Tables<"equipamentos">;
type Prop = Tables<"propriedades">;

const inputCls =
  "rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30";

const MIGRATION_HINT =
  "Tabelas ainda não existem. Rode o SQL em supabase/migrations/20260728190000_areas_equipamentos.sql no Supabase.";

function erroSchema(msg: string, code?: string) {
  return msg.includes("schema cache") || code === "42P01" || msg.includes("hotel_areas");
}

export function AreasApp({
  areas,
  equipamentos,
  propriedades,
}: {
  areas: Area[];
  equipamentos: Equip[];
  propriedades: Prop[];
}) {
  const supabase = createClient();
  const router = useRouter();
  const [areaId, setAreaId] = useState<string | null>(null);

  const area = areas.find((a) => a.id === areaId) ?? null;
  const eqs = useMemo(
    () => equipamentos.filter((e) => e.area_id === areaId),
    [equipamentos, areaId],
  );

  if (area) {
    return (
      <AreaDetalhe
        area={area}
        equipamentos={eqs}
        onVoltar={() => setAreaId(null)}
        onRefresh={() => router.refresh()}
      />
    );
  }

  return (
    <ListaAreas
      areas={areas}
      equipamentos={equipamentos}
      propriedades={propriedades}
      onAbrir={setAreaId}
      onRefresh={() => router.refresh()}
    />
  );
}

function ListaAreas({
  areas,
  equipamentos,
  propriedades,
  onAbrir,
  onRefresh,
}: {
  areas: Area[];
  equipamentos: Equip[];
  propriedades: Prop[];
  onAbrir: (id: string) => void;
  onRefresh: () => void;
}) {
  const supabase = createClient();
  const [nome, setNome] = useState("");
  const [descricao, setDescricao] = useState("");
  const [propId, setPropId] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  const qtd = (id: string) =>
    equipamentos.filter((e) => e.area_id === id && e.ativo).length;

  const nomeProp = (id: string | null) =>
    id ? propriedades.find((p) => p.id === id)?.nome ?? "?" : "Todos";

  async function adicionar() {
    setErro(null);
    if (!nome.trim()) return setErro("Informe o nome da área.");
    setSalvando(true);
    const { error } = await supabase.from("hotel_areas").insert({
      nome: nome.trim(),
      descricao: descricao.trim() || null,
      propriedade_id: propId || null,
    });
    setSalvando(false);
    if (error) {
      if (erroSchema(error.message, error.code)) return setErro(MIGRATION_HINT);
      return setErro(error.message);
    }
    setNome("");
    setDescricao("");
    setPropId("");
    onRefresh();
  }

  async function toggle(a: Area) {
    await supabase.from("hotel_areas").update({ ativo: !a.ativo }).eq("id", a.id);
    onRefresh();
  }

  return (
    <div className="mx-auto w-full max-w-4xl flex-1 px-4 py-6">
      <h1 className="text-xl font-bold">Áreas do Hotel</h1>
      <p className="mt-0.5 text-sm text-slate-500">
        Cadastre áreas e os equipamentos de cada uma. Cada equipamento recebe um
        código com QR Code para registrar manutenções no local.
      </p>

      <div className="mt-5 rounded-xl border border-slate-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-slate-800">Nova área</h2>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <input
            className={`${inputCls} sm:col-span-2`}
            placeholder="Nome (ex.: Casa de Máquinas da Piscina)"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
          />
          <input
            className={`${inputCls} sm:col-span-2`}
            placeholder="Descrição (opcional)"
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
          />
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
            {salvando ? "Salvando…" : "Cadastrar área"}
          </button>
        </div>
        {erro && (
          <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {erro}
          </p>
        )}
      </div>

      <div className="mt-5 space-y-2">
        {areas.length === 0 && (
          <p className="rounded-xl border border-dashed border-slate-300 bg-white px-4 py-8 text-center text-sm text-slate-500">
            Nenhuma área cadastrada ainda.
          </p>
        )}
        {areas.map((a) => (
          <div
            key={a.id}
            className={`flex flex-wrap items-center gap-3 rounded-xl border bg-white px-4 py-3 ${
              a.ativo ? "border-slate-200" : "border-slate-100 opacity-60"
            }`}
          >
            <button
              type="button"
              onClick={() => onAbrir(a.id)}
              className="min-w-0 flex-1 text-left"
            >
              <p className="font-semibold text-slate-900">{a.nome}</p>
              <p className="text-xs text-slate-500">
                {nomeProp(a.propriedade_id)} · {qtd(a.id)} equipamento
                {qtd(a.id) === 1 ? "" : "s"}
                {!a.ativo && " · inativa"}
              </p>
            </button>
            <button
              type="button"
              onClick={() => onAbrir(a.id)}
              className="rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-700"
            >
              Equipamentos
            </button>
            <button
              type="button"
              onClick={() => toggle(a)}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
            >
              {a.ativo ? "Desativar" : "Ativar"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function AreaDetalhe({
  area,
  equipamentos,
  onVoltar,
  onRefresh,
}: {
  area: Area;
  equipamentos: Equip[];
  onVoltar: () => void;
  onRefresh: () => void;
}) {
  const supabase = createClient();
  const [nome, setNome] = useState("");
  const [codigo, setCodigo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [qrEq, setQrEq] = useState<Equip | null>(null);

  async function adicionar() {
    setErro(null);
    if (!nome.trim()) return setErro("Informe o nome do equipamento.");
    const cod = codigo.trim()
      ? normalizarCodigo(codigo)
      : gerarCodigoEquipamento(nome);
    if (!cod) return setErro("Código inválido.");
    setSalvando(true);
    const { error } = await supabase.from("equipamentos").insert({
      area_id: area.id,
      nome: nome.trim(),
      codigo: cod,
      descricao: descricao.trim() || null,
    });
    setSalvando(false);
    if (error) {
      if (erroSchema(error.message, error.code)) return setErro(MIGRATION_HINT);
      if (error.code === "23505")
        return setErro("Já existe um equipamento com esse código.");
      return setErro(error.message);
    }
    setNome("");
    setCodigo("");
    setDescricao("");
    onRefresh();
  }

  async function toggle(e: Equip) {
    await supabase
      .from("equipamentos")
      .update({ ativo: !e.ativo })
      .eq("id", e.id);
    onRefresh();
  }

  return (
    <div className="mx-auto w-full max-w-4xl flex-1 px-4 py-6">
      <button
        type="button"
        onClick={onVoltar}
        className="text-sm font-medium text-brand-700 hover:underline"
      >
        ← Voltar às áreas
      </button>
      <h1 className="mt-2 text-xl font-bold">{area.nome}</h1>
      {area.descricao && (
        <p className="mt-0.5 text-sm text-slate-500">{area.descricao}</p>
      )}

      <div className="mt-5 rounded-xl border border-slate-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-slate-800">
          Novo equipamento
        </h2>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <input
            className={`${inputCls} sm:col-span-2`}
            placeholder="Nome (ex.: Bomba d'água 1)"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
          />
          <input
            className={inputCls}
            placeholder="Código (vazio = gerar automático)"
            value={codigo}
            onChange={(e) => setCodigo(e.target.value.toUpperCase())}
          />
          <input
            className={inputCls}
            placeholder="Descrição (opcional)"
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
          />
          <button
            type="button"
            onClick={adicionar}
            disabled={salvando}
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:opacity-60 sm:col-span-2"
          >
            {salvando ? "Salvando…" : "Cadastrar equipamento"}
          </button>
        </div>
        {erro && (
          <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {erro}
          </p>
        )}
      </div>

      <div className="mt-5 space-y-2">
        {equipamentos.length === 0 && (
          <p className="rounded-xl border border-dashed border-slate-300 bg-white px-4 py-8 text-center text-sm text-slate-500">
            Nenhum equipamento nesta área.
          </p>
        )}
        {equipamentos.map((eq) => {
          const link = urlEquipamento(eq.codigo);
          return (
            <div
              key={eq.id}
              className={`rounded-xl border bg-white px-4 py-3 ${
                eq.ativo ? "border-slate-200" : "border-slate-100 opacity-60"
              }`}
            >
              <div className="flex flex-wrap items-start gap-3">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-slate-900">{eq.nome}</p>
                  <p className="mt-0.5 font-mono text-xs text-brand-700">
                    {eq.codigo}
                  </p>
                  {eq.descricao && (
                    <p className="mt-1 text-xs text-slate-500">{eq.descricao}</p>
                  )}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => setQrEq(eq)}
                    className="rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-700"
                  >
                    QR / Imprimir
                  </button>
                  <Link
                    href={`/equipamento/${encodeURIComponent(eq.codigo)}`}
                    target="_blank"
                    className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                  >
                    Abrir link
                  </Link>
                  <button
                    type="button"
                    onClick={() => toggle(eq)}
                    className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                  >
                    {eq.ativo ? "Desativar" : "Ativar"}
                  </button>
                </div>
              </div>
              <p className="mt-2 truncate text-[11px] text-slate-400">{link}</p>
            </div>
          );
        })}
      </div>

      {qrEq && (
        <QrModal
          equipamento={qrEq}
          areaNome={area.nome}
          onClose={() => setQrEq(null)}
        />
      )}
    </div>
  );
}

function QrModal({
  equipamento,
  areaNome,
  onClose,
}: {
  equipamento: Equip;
  areaNome: string;
  onClose: () => void;
}) {
  const link = urlEquipamento(equipamento.codigo);
  const qr = urlQrCode(link, 320);

  function imprimir() {
    const w = window.open("", "_blank", "width=480,height=640");
    if (!w) return;
    w.document.write(`<!DOCTYPE html><html><head><title>${equipamento.codigo}</title>
<style>
  @page { margin: 12mm; }
  body { font-family: system-ui, sans-serif; text-align: center; color: #0f172a; }
  h1 { font-size: 18px; margin: 0 0 4px; }
  .area { font-size: 12px; color: #64748b; margin-bottom: 16px; }
  .codigo { font-family: ui-monospace, monospace; font-size: 16px; font-weight: 700;
    letter-spacing: 0.04em; margin: 12px 0 4px; }
  img { width: 240px; height: 240px; }
  .url { font-size: 10px; color: #94a3b8; word-break: break-all; margin-top: 12px; }
  .marca { font-size: 10px; margin-top: 20px; color: #64748b; }
</style></head><body>
  <p class="marca">Vivaz Cataratas · ManuFlow</p>
  <h1>${equipamento.nome.replace(/</g, "&lt;")}</h1>
  <p class="area">${areaNome.replace(/</g, "&lt;")}</p>
  <img src="${qr}" alt="QR Code" />
  <p class="codigo">${equipamento.codigo}</p>
  <p class="url">${link}</p>
  <script>window.onload=function(){window.print()}</script>
</body></html>`);
    w.document.close();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-center text-lg font-bold">{equipamento.nome}</h3>
        <p className="text-center text-xs text-slate-500">{areaNome}</p>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={qr}
          alt={`QR ${equipamento.codigo}`}
          className="mx-auto mt-4 h-56 w-56"
        />
        <p className="mt-3 text-center font-mono text-sm font-bold tracking-wide text-brand-700">
          {equipamento.codigo}
        </p>
        <p className="mt-1 break-all text-center text-[10px] text-slate-400">
          {link}
        </p>
        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={imprimir}
            className="flex-1 rounded-lg bg-brand-600 py-2.5 text-sm font-semibold text-white hover:bg-brand-700"
          >
            Imprimir etiqueta
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
