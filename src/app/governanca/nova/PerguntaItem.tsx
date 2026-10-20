"use client";

import { useState } from "react";
import {
  CARINHAS,
  tipoItem,
  type Pergunta,
  type Prioridade,
  type RespostaValor,
} from "@/lib/governanca";
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
  resposta: RespostaValor | "na" | null;
  valor: string;
  selecionadas: string[];
  comentario: string;
  mostrarComentario: boolean;
  anexoFile: File | null;
  anexoPreview: string | null;
  plano: PlanoLocal | null;
};

export function respostaVazia(): RespostaLocal {
  return {
    resposta: null,
    valor: "",
    selecionadas: [],
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
const botaoSolto = "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50";

export function PerguntaItem({
  pergunta,
  valor,
  onChange,
  responsaveis,
  responsavelPadrao,
  quemPediu,
}: {
  pergunta: Pergunta;
  valor: RespostaLocal;
  onChange: (v: RespostaLocal) => void;
  /** Nomes sugeridos em "Quem vai fazer?" (camareiras). */
  responsaveis: string[];
  responsavelPadrao?: string;
  quemPediu: string;
}) {
  const [anexoErro, setAnexoErro] = useState<string | null>(null);
  const tipo = tipoItem(pergunta.tipo);
  const na = valor.resposta === "na";

  function setSimNao(r: RespostaValor) {
    if (r === "nao" && pergunta.plano_acao) {
      onChange({
        ...valor,
        resposta: "nao",
        plano: valor.plano ?? planoVazio(quemPediu, responsavelPadrao ?? ""),
      });
    } else {
      onChange({ ...valor, resposta: r, plano: null });
    }
  }

  function alternarNa() {
    onChange(
      na
        ? { ...valor, resposta: null }
        : { ...valor, resposta: "na", valor: "", selecionadas: [], plano: null },
    );
  }

  function setValor(v: string) {
    onChange({ ...valor, valor: v, resposta: null });
  }

  function alternarOpcao(op: string) {
    const tem = valor.selecionadas.includes(op);
    onChange({
      ...valor,
      resposta: null,
      selecionadas: tem ? valor.selecionadas.filter((o) => o !== op) : [...valor.selecionadas, op],
    });
  }

  function setPlano(patch: Partial<PlanoLocal>) {
    onChange({
      ...valor,
      plano: { ...(valor.plano ?? planoVazio(quemPediu, responsavelPadrao ?? "")), ...patch },
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
    tipo === "sim_nao" && valor.resposta === "sim"
      ? "border-green-300"
      : tipo === "sim_nao" && valor.resposta === "nao"
        ? "border-red-300"
        : "border-slate-200";

  return (
    <div className={`rounded-2xl border bg-white p-5 shadow-sm ${borda}`}>
      <p className="font-medium text-slate-800">
        {pergunta.texto}
        {!pergunta.obrigatoria && <span className="ml-1 text-xs font-normal text-slate-400">(opcional)</span>}
      </p>
      {pergunta.dica && <p className="mt-0.5 text-xs text-slate-500">{pergunta.dica}</p>}

      <div className="mt-3">
        {tipo === "sim_nao" && (
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setSimNao("sim")}
              className={`${botao} ${valor.resposta === "sim" ? "bg-green-600 text-white" : botaoSolto}`}
            >
              ✓ Sim
            </button>
            <button
              type="button"
              onClick={() => setSimNao("nao")}
              className={`${botao} ${valor.resposta === "nao" ? "bg-red-600 text-white" : botaoSolto}`}
            >
              ✕ Não
            </button>
          </div>
        )}

        {tipo === "carinhas" && (
          <div className="grid grid-cols-3 gap-2">
            {CARINHAS.map((c) => (
              <button
                key={c.valor}
                type="button"
                disabled={na}
                onClick={() => setValor(c.valor)}
                className={`${botao} flex-col gap-0.5 ${valor.valor === c.valor ? "bg-brand-600 text-white" : botaoSolto}`}
              >
                <span className="text-2xl">{c.emoji}</span>
                <span className="text-xs">{c.rotulo}</span>
              </button>
            ))}
          </div>
        )}

        {tipo === "texto_curto" && (
          <input className={inputCls} disabled={na} value={valor.valor} onChange={(e) => setValor(e.target.value)} />
        )}

        {tipo === "texto_longo" && (
          <textarea
            className={inputCls}
            rows={3}
            disabled={na}
            value={valor.valor}
            onChange={(e) => setValor(e.target.value)}
          />
        )}

        {(tipo === "numero" || tipo === "decimal" || tipo === "porcentagem") && (
          <div className="flex items-center gap-2">
            <input
              className={`${inputCls} max-w-48`}
              type="number"
              inputMode={tipo === "numero" ? "numeric" : "decimal"}
              step={tipo === "numero" ? 1 : "any"}
              disabled={na}
              value={valor.valor}
              onChange={(e) => setValor(e.target.value)}
            />
            {tipo === "porcentagem" && <span className="text-sm text-slate-500">%</span>}
          </div>
        )}

        {(tipo === "data" || tipo === "mes_ano" || tipo === "hora") && (
          <input
            className={`${inputCls} max-w-56`}
            type={tipo === "data" ? "date" : tipo === "mes_ano" ? "month" : "time"}
            disabled={na}
            value={valor.valor}
            onChange={(e) => setValor(e.target.value)}
          />
        )}

        {tipo === "selecao_unica" && (
          <div className="space-y-1.5">
            {pergunta.opcoes.map((op) => (
              <label
                key={op}
                className={`flex cursor-pointer items-start gap-2 rounded-lg border px-3 py-2 text-sm ${
                  valor.valor === op ? "border-brand-400 bg-brand-50" : "border-slate-200"
                } ${na ? "opacity-50" : ""}`}
              >
                <input
                  type="radio"
                  className="mt-0.5"
                  disabled={na}
                  checked={valor.valor === op}
                  onChange={() => setValor(op)}
                />
                <span>{op}</span>
              </label>
            ))}
          </div>
        )}

        {tipo === "selecao_multipla" && (
          <div className="space-y-1.5">
            {pergunta.opcoes.map((op) => {
              const marcada = valor.selecionadas.includes(op);
              return (
                <label
                  key={op}
                  className={`flex cursor-pointer items-start gap-2 rounded-lg border px-3 py-2 text-sm ${
                    marcada ? "border-brand-400 bg-brand-50" : "border-slate-200"
                  } ${na ? "opacity-50" : ""}`}
                >
                  <input
                    type="checkbox"
                    className="mt-0.5"
                    disabled={na}
                    checked={marcada}
                    onChange={() => alternarOpcao(op)}
                  />
                  <span>{op}</span>
                </label>
              );
            })}
          </div>
        )}
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {pergunta.permite_na && (
          <button
            type="button"
            onClick={alternarNa}
            className={`rounded-lg border px-3 py-1.5 text-xs font-medium ${
              na ? "border-slate-500 bg-slate-500 text-white" : "border-slate-200 text-slate-600 hover:bg-slate-50"
            }`}
          >
            N/A
          </button>
        )}
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
              <input
                className={inputCls}
                list={`responsaveis-${pergunta.id}`}
                value={valor.plano.quem_vai_fazer}
                onChange={(e) => setPlano({ quem_vai_fazer: e.target.value })}
                placeholder="Nome do responsável"
              />
              <datalist id={`responsaveis-${pergunta.id}`}>
                {responsaveis.map((nome) => (
                  <option key={nome} value={nome} />
                ))}
              </datalist>
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
