"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { TIPOS_MANUTENCAO } from "@/lib/equipamento";

type Equipamento = {
  id: string;
  nome: string;
  codigo: string;
  descricao: string | null;
  area_id: string;
  area_nome: string;
  area_descricao: string | null;
};

type HistoricoItem = {
  id: string;
  tipo: string;
  descricao: string;
  foto_url: string | null;
  realizado_em: string;
  realizado_por_nome: string | null;
};

const inputCls =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30";

const TIPO_LABEL: Record<string, string> = Object.fromEntries(
  TIPOS_MANUTENCAO.map((t) => [t.value, t.label]),
);

function formatarData(iso: string) {
  try {
    return new Date(iso).toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export function EquipamentoPainel({
  equipamento,
  historico,
  logado,
  nomeUsuario,
}: {
  equipamento: Equipamento;
  historico: HistoricoItem[];
  logado: boolean;
  nomeUsuario: string | null;
}) {
  const supabase = createClient();
  const router = useRouter();
  const [tipo, setTipo] = useState("corretiva");
  const [descricao, setDescricao] = useState("");
  const [foto, setFoto] = useState<File | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const [salvando, setSalvando] = useState(false);

  const nextLogin = `/login?next=${encodeURIComponent(`/equipamento/${equipamento.codigo}`)}`;

  async function registrar() {
    setErro(null);
    setOk(false);
    if (!descricao.trim()) {
      return setErro("Descreva o que foi feito na manutenção.");
    }
    setSalvando(true);

    let fotoUrl: string | undefined;
    if (foto) {
      const ext = foto.name.split(".").pop() || "jpg";
      const caminho = `equipamentos/${equipamento.codigo}/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("anexos")
        .upload(caminho, foto, { contentType: foto.type });
      if (upErr) {
        setSalvando(false);
        return setErro(`Falha no upload da foto: ${upErr.message}`);
      }
      fotoUrl = supabase.storage.from("anexos").getPublicUrl(caminho).data
        .publicUrl;
    }

    const { error } = await supabase.rpc("registrar_manutencao_equipamento", {
      p_codigo: equipamento.codigo,
      p_descricao: descricao.trim(),
      p_tipo: tipo,
      p_foto_url: fotoUrl,
    });
    setSalvando(false);

    if (error) {
      if (error.message.includes("logado")) {
        return setErro("Faça login para registrar a manutenção.");
      }
      if (
        error.message.includes("schema cache") ||
        error.message.includes("function")
      ) {
        return setErro(
          "Função ainda não existe. Rode o SQL em supabase/migrations/20260728190000_areas_equipamentos.sql no Supabase.",
        );
      }
      return setErro(error.message);
    }

    setDescricao("");
    setFoto(null);
    setTipo("corretiva");
    setOk(true);
    router.refresh();
  }

  return (
    <>
      <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-5">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          {equipamento.area_nome || "Área"}
        </p>
        <h1 className="mt-1 text-2xl font-bold text-slate-900">
          {equipamento.nome}
        </h1>
        <p className="mt-1 font-mono text-sm font-semibold text-brand-700">
          {equipamento.codigo}
        </p>
        {equipamento.descricao && (
          <p className="mt-2 text-sm text-slate-600">{equipamento.descricao}</p>
        )}
      </div>

      <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-5">
        <h2 className="text-sm font-semibold text-slate-800">
          Registrar manutenção
        </h2>

        {!logado ? (
          <div className="mt-3">
            <p className="text-sm text-slate-600">
              Escaneie o QR e entre com sua conta para registrar a manutenção
              neste equipamento.
            </p>
            <Link
              href={nextLogin}
              className="mt-3 inline-flex rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700"
            >
              Entrar para registrar
            </Link>
          </div>
        ) : (
          <div className="mt-3 space-y-3">
            <p className="text-xs text-slate-500">
              Registrando como <strong>{nomeUsuario}</strong>
            </p>
            <label className="block text-xs font-medium text-slate-500">
              Tipo
              <select
                className={`${inputCls} mt-1`}
                value={tipo}
                onChange={(e) => setTipo(e.target.value)}
              >
                {TIPOS_MANUTENCAO.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-xs font-medium text-slate-500">
              O que foi feito?
              <textarea
                className={`${inputCls} mt-1 min-h-[88px]`}
                placeholder="Ex.: Troca de filtro e verificação de pressão"
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
              />
            </label>
            <label className="block text-xs font-medium text-slate-500">
              Foto (opcional)
              <input
                type="file"
                accept="image/*"
                capture="environment"
                className="mt-1 block w-full text-sm"
                onChange={(e) => setFoto(e.target.files?.[0] ?? null)}
              />
            </label>
            <button
              type="button"
              onClick={registrar}
              disabled={salvando}
              className="w-full rounded-lg bg-brand-600 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
            >
              {salvando ? "Salvando…" : "Registrar manutenção"}
            </button>
            {erro && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                {erro}
              </p>
            )}
            {ok && (
              <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
                Manutenção registrada com sucesso.
              </p>
            )}
          </div>
        )}
      </div>

      <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-5">
        <h2 className="text-sm font-semibold text-slate-800">
          Histórico de manutenção
        </h2>
        {historico.length === 0 ? (
          <p className="mt-3 text-sm text-slate-500">
            Nenhuma manutenção registrada ainda.
          </p>
        ) : (
          <ul className="mt-3 space-y-3">
            {historico.map((h) => (
              <li
                key={h.id}
                className="border-b border-slate-100 pb-3 last:border-0 last:pb-0"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-600">
                    {TIPO_LABEL[h.tipo] ?? h.tipo}
                  </span>
                  <span className="text-xs text-slate-400">
                    {formatarData(h.realizado_em)}
                  </span>
                </div>
                <p className="mt-1 text-sm text-slate-800">{h.descricao}</p>
                <p className="mt-0.5 text-xs text-slate-500">
                  {h.realizado_por_nome ?? "—"}
                </p>
                {h.foto_url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={h.foto_url}
                    alt="Foto da manutenção"
                    className="mt-2 max-h-40 rounded-lg object-cover"
                  />
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}
