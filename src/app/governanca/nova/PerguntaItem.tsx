"use client";

import { useState } from "react";
import type { Camareira, Pergunta, Prioridade, RespostaValor } from "@/lib/governanca";
import { inputCls, labelCls } from "../ui";

const MAX_ANEXO_BYTES = 10 * 1024 * 1024;
const EXTENSAO_IMAGEM = /\.(jpe?g|png|gif|webp|heic|heif|bmp)$/i;

export type PlanoLocal = {
  prioridade: Prioridade;
  o_que_fazer: string;
  quem_vai_fazer: string;
  quem_pediu: string;
};

export type RespostaLocal = {
  resposta: RespostaValor | null;
  comentario: string;
  mostrarComentario: boolean;
  anexoFile: File | null;
  anexoPreview: string | null;
  plano: PlanoLocal | null;
};

export function respostaVazia(): RespostaLocal {
  return {
    resposta: null,
    comentario: "",
    mostrarComentario: false,
    anexoFile: null,
    anexoPreview: null,
    plano: null,
  };
}

function planoVazio(quemPediu: string, quemVaiFazer = ""): PlanoLocal {
  return { prioridade: "media", o_que_fazer: "", quem_vai_fazer: quemVaiFazer, quem_pediu: quemPediu };
}

const botao =
  "inline-flex items-center justify-center rounded-xl px-4 py-2.5 text-sm font-semibold transition";

export function PerguntaItem({
  pergunta,
  valor,
  onChange,
  camareiras,
  camareiraPadrao,
  quemPediu,
}: {
  pergunta: Pergunta;
  valor: RespostaLocal;
  onChange: (v: RespostaLocal) => void;
  camareiras: Camareira[];
  camareiraPadrao?: string;
  quemPediu: string;
}) {
  const [anexoErro, setAnexoErro] = useState<string | null>(null);

  function setResposta(r: RespostaValor) {
    if (r === "nao") {
      onChange({
        ...valor,
        resposta: "nao",
        plano: valor.plano ?? planoVazio(quemPediu, camareiraPadrao ?? ""),
      });
    } else {
      onChange({ ...valor, resposta: "sim", plano: null });
    }
  }

  function setPlano(patch: Partial<PlanoLocal>) {
    onChange({
      ...valor,
      plano: { ...(valor.plano ?? planoVazio(quemPediu, camareiraPadrao ?? "")), ...patch },
    });
  }

  function handleAnexo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    e.target.value = "";
    if (!file) return;

    const ehImagem = file.type.startsWith("image/") || EXTENSAO_IMAGEM.test(file.name);
    if (!ehImagem) return setAnexoErro("Envie somente imagens (máx. 10 MB).");
    if (file.size > MAX_ANEXO_BYTES) return setAnexoErro("A imagem deve ter no máximo 10 MB.");

    setAnexoErro(null);
    if (valor.anexoPreview) URL.revokeObjectURL(valor.anexoPreview);
    onChange({ ...valor, anexoFile: file, anexoPreview: URL.createObjectURL(file) });
  }

  function removerAnexo() {
    if (valor.anexoPreview) URL.revokeObjectURL(valor.anexoPreview);
    setAnexoErro(null);
    onChange({ ...valor, anexoFile: null, anexoPreview: null });
  }

  const borda =
    valor.resposta === null
      ? "border-slate-200"
      : valor.resposta === "sim"
        ? "border-green-300"
        : "border-red-300";

  return (
    <div className={`rounded-2xl border bg-white p-5 shadow-sm ${borda}`}>
      <p className="mb-3 font-medium text-slate-800">{pergunta.texto}</p>

      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => setResposta("sim")}
          className={`${botao} ${valor.resposta === "sim" ? "bg-green-600 text-white" : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"}`}
        >
          ✓ Sim
        </button>
        <button
          type="button"
          onClick={() => setResposta("nao")}
          className={`${botao} ${valor.resposta === "nao" ? "bg-red-600 text-white" : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"}`}
        >
          ✕ Não
        </button>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => onChange({ ...valor, mostrarComentario: !valor.mostrarComentario })}
          className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
        >
          💬 {valor.mostrarComentario || valor.comentario ? "Comentário" : "Comentar"}
        </button>
        <label className="cursor-pointer rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50">
          📎 {valor.anexoFile ? "Trocar foto" : "Anexar foto"}
          <input
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={handleAnexo}
          />
        </label>
      </div>
      {anexoErro && <p className="mt-1 text-xs text-red-600">{anexoErro}</p>}

      {(valor.mostrarComentario || valor.comentario) && (
        <textarea
          className={`${inputCls} mt-3`}
          rows={2}
          placeholder="Comentário (opcional)"
          value={valor.comentario}
          onChange={(e) => onChange({ ...valor, comentario: e.target.value })}
        />
      )}

      {valor.anexoPreview && (
        <div className="mt-3 flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element -- prévia local (blob:) */}
          <img
            src={valor.anexoPreview}
            alt="Foto anexada"
            className="h-16 w-16 rounded-lg object-cover ring-1 ring-slate-200"
          />
          <button
            type="button"
            onClick={removerAnexo}
            className="text-xs font-medium text-red-600 hover:underline"
          >
            Remover foto
          </button>
        </div>
      )}

      {valor.resposta === "nao" && valor.plano && (
        <div className="mt-4 space-y-3 rounded-xl border border-red-100 bg-red-50 p-4">
          <p className="text-sm font-semibold text-red-800">Plano de ação</p>

          <div>
            <span className={labelCls}>Prioridade</span>
            <div className="grid grid-cols-3 gap-2">
              {(["baixa", "media", "alta"] as Prioridade[]).map((p) => {
                const ativa = valor.plano!.prioridade === p;
                const cor = p === "alta" ? "bg-red-600" : p === "media" ? "bg-amber-500" : "bg-slate-500";
                return (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPlano({ prioridade: p })}
                    className={`rounded-xl px-3 py-2 text-xs font-semibold ${
                      ativa ? `${cor} text-white` : "border border-slate-300 bg-white text-slate-700"
                    }`}
                  >
                    {p === "baixa" ? "Baixa" : p === "media" ? "Média" : "Alta"}
                  </button>
                );
              })}
            </div>
          </div>

          <label className="block">
            <span className={labelCls}>O que precisa ser feito?</span>
            <textarea
              className={inputCls}
              rows={2}
              value={valor.plano.o_que_fazer}
              onChange={(e) => setPlano({ o_que_fazer: e.target.value })}
              placeholder="Descreva a ação necessária"
            />
          </label>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="block">
              <span className={labelCls}>Quem vai fazer?</span>
              <select
                className={inputCls}
                value={valor.plano.quem_vai_fazer}
                onChange={(e) => setPlano({ quem_vai_fazer: e.target.value })}
              >
                <option value="">Selecione a camareira</option>
                {camareiras.map((c) => (
                  <option key={c.id} value={c.nome}>
                    {c.nome}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className={labelCls}>Quem está pedindo?</span>
              <input
                className={`${inputCls} bg-slate-50 text-slate-600`}
                value={valor.plano.quem_pediu || quemPediu}
                readOnly
                tabIndex={-1}
              />
            </label>
          </div>
        </div>
      )}
    </div>
  );
}
