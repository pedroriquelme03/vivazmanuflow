"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { comprimirImagem } from "@/lib/comprimir-imagem";
import { idUnico } from "@/lib/id-unico";
import { uploadAnexo } from "@/lib/upload-anexo";
import { EscolherMidia } from "@/components/EscolherMidia";

export function ValidacaoSolicitante({ token }: { token: string }) {
  const router = useRouter();
  const supabase = createClient();
  const [modo, setModo] = useState<"escolha" | "contestar">("escolha");
  const [descricao, setDescricao] = useState("");
  const [foto, setFoto] = useState<File | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  async function confirmar() {
    setErro(null);
    setOcupado(true);
    const { error } = await supabase.rpc("confirmar_finalizacao", {
      p_token: token,
    });
    setOcupado(false);
    if (error) {
      setErro(error.message);
      return;
    }
    setOk("Finalização confirmada. Obrigado!");
    router.refresh();
  }

  async function contestar() {
    setErro(null);
    if (!descricao.trim()) {
      setErro("Descreva o que falta ou o problema.");
      return;
    }
    if (!foto) {
      setErro("Envie uma foto mostrando o que falta.");
      return;
    }
    setOcupado(true);
    try {
      const arquivo = await comprimirImagem(foto);
      const caminho = `contestacao/${idUnico()}.jpg`;
      const { error: upErro } = await uploadAnexo(
        supabase,
        caminho,
        arquivo,
        arquivo.type || "image/jpeg",
      );
      if (upErro) throw new Error("Falha ao enviar a foto.");

      const url = supabase.storage.from("anexos").getPublicUrl(caminho).data
        .publicUrl;

      const { error } = await supabase.rpc("contestar_finalizacao", {
        p_token: token,
        p_descricao: descricao.trim(),
        p_foto_url: url,
      });
      if (error) throw new Error(error.message);

      setOk("Contestação enviada. A demanda voltou para o colaborador.");
      router.refresh();
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro inesperado.");
      setOcupado(false);
    }
  }

  if (ok) {
    return (
      <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
        <p className="text-sm font-semibold text-emerald-800">{ok}</p>
      </div>
    );
  }

  return (
    <div className="mt-4 rounded-2xl border border-sky-200 bg-sky-50 p-5">
      <h2 className="text-base font-bold text-sky-900">
        O serviço foi concluído?
      </h2>
      <p className="mt-1 text-sm text-sky-800">
        O colaborador enviou a demanda para sua validação. Confirme se está tudo
        certo ou conteste se ainda falta algo.
      </p>

      {modo === "escolha" && (
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={confirmar}
            disabled={ocupado}
            className="rounded-xl bg-emerald-600 px-4 py-3.5 text-sm font-bold text-white transition hover:bg-emerald-700 disabled:opacity-60"
          >
            {ocupado ? "Confirmando…" : "Confirmar finalização"}
          </button>
          <button
            type="button"
            onClick={() => setModo("contestar")}
            disabled={ocupado}
            className="rounded-xl border border-red-300 bg-white px-4 py-3.5 text-sm font-bold text-red-700 transition hover:bg-red-50 disabled:opacity-60"
          >
            Contestar
          </button>
        </div>
      )}

      {modo === "contestar" && (
        <div className="mt-4 grid gap-3">
          <label className="grid gap-1.5 text-sm">
            <span className="font-medium text-sky-900">
              O que falta? <span className="text-red-500">*</span>
            </span>
            <textarea
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              rows={3}
              placeholder="Ex.: A pia ainda está pingando do lado esquerdo."
              className="w-full rounded-xl border border-sky-200 bg-white px-3 py-2.5 text-base outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30"
              maxLength={500}
            />
          </label>

          <EscolherMidia
            arquivoNome={foto?.name}
            onEscolheu={(files) => setFoto(files[0] ?? null)}
          />

          <button
            type="button"
            onClick={contestar}
            disabled={ocupado}
            className="rounded-xl bg-red-600 px-4 py-3.5 text-sm font-bold text-white transition hover:bg-red-700 disabled:opacity-60"
          >
            {ocupado ? "Enviando…" : "Enviar contestação"}
          </button>
          <button
            type="button"
            onClick={() => {
              setModo("escolha");
              setErro(null);
            }}
            className="text-center text-sm text-sky-700"
          >
            Voltar
          </button>
        </div>
      )}

      {erro && (
        <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {erro}
        </p>
      )}
    </div>
  );
}
