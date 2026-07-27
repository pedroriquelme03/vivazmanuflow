"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { comprimirImagem } from "@/lib/comprimir-imagem";
import type { Enums } from "@/lib/database.types";

type Opcao = { id: string; nome: string };
type OpcaoProp = { id: string; nome: string; propriedade_id: string };
type Prioridade = Enums<"demanda_prioridade">;

const PRIORIDADES: { valor: Prioridade; rotulo: string; cor: string }[] = [
  { valor: "alta", rotulo: "Alta", cor: "bg-red-500" },
  { valor: "media", rotulo: "Média", cor: "bg-orange-500" },
  { valor: "baixa", rotulo: "Baixa", cor: "bg-emerald-500" },
];

export function FormAbrir({
  propriedades,
  solicitantes,
  locais,
}: {
  propriedades: Opcao[];
  solicitantes: OpcaoProp[];
  locais: OpcaoProp[];
}) {
  const router = useRouter();
  const supabase = createClient();

  const [propriedadeId, setPropriedadeId] = useState(propriedades[0]?.id ?? "");
  const [solicitanteId, setSolicitanteId] = useState("");
  const [localId, setLocalId] = useState("");
  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [prioridade, setPrioridade] = useState<Prioridade>("media");
  const [arquivos, setArquivos] = useState<File[]>([]);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const solicitantesFiltrados = useMemo(
    () => solicitantes.filter((s) => s.propriedade_id === propriedadeId),
    [solicitantes, propriedadeId],
  );
  const locaisFiltrados = useMemo(
    () => locais.filter((l) => l.propriedade_id === propriedadeId),
    [locais, propriedadeId],
  );

  function trocarPropriedade(id: string) {
    setPropriedadeId(id);
    setSolicitanteId("");
    setLocalId("");
  }

  function adicionarArquivos(lista: FileList | null) {
    if (!lista) return;
    setArquivos((atual) => [...atual, ...Array.from(lista)].slice(0, 5));
  }

  function removerArquivo(indice: number) {
    setArquivos((atual) => atual.filter((_, i) => i !== indice));
  }

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);

    if (!solicitanteId) return setErro("Selecione quem está solicitando.");
    if (!titulo.trim()) return setErro("Descreva em poucas palavras o que precisa.");

    setEnviando(true);
    try {
      // 1) upload dos anexos (com compressão de imagem)
      const anexos: { url: string; tipo: "foto" | "video" }[] = [];
      for (const original of arquivos) {
        const arquivo = await comprimirImagem(original);
        const ehVideo = arquivo.type.startsWith("video/");
        const ext = arquivo.name.split(".").pop() || (ehVideo ? "mp4" : "jpg");
        const caminho = `abertura/${crypto.randomUUID()}.${ext}`;

        const { error: upErro } = await supabase.storage
          .from("anexos")
          .upload(caminho, arquivo, { contentType: arquivo.type });
        if (upErro) throw new Error("Falha ao enviar o anexo. Tente novamente.");

        const { data: pub } = supabase.storage.from("anexos").getPublicUrl(caminho);
        anexos.push({ url: pub.publicUrl, tipo: ehVideo ? "video" : "foto" });
      }

      // 2) cria a demanda via RPC pública
      const { data, error } = await supabase.rpc("abrir_demanda", {
        p_solicitante_id: solicitanteId,
        p_titulo: titulo,
        p_descricao: descricao || undefined,
        p_local_id: localId || undefined,
        p_prioridade: prioridade,
        p_anexos: anexos,
      });
      if (error) throw new Error(error.message);

      const token = data?.[0]?.token;
      if (!token) throw new Error("Não foi possível gerar o acompanhamento.");

      router.push(`/acompanhar/${token}?nova=1`);
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro inesperado.");
      setEnviando(false);
    }
  }

  const inputCls =
    "w-full rounded-lg border border-slate-300 px-3 py-2.5 text-base outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30";

  return (
    <form onSubmit={enviar} className="grid gap-4">
      <Campo label="Prioridade">
        <div className="grid grid-cols-3 gap-2">
          {PRIORIDADES.map((p) => (
            <button
              key={p.valor}
              type="button"
              onClick={() => setPrioridade(p.valor)}
              className={`rounded-lg border px-3 py-2.5 text-sm font-semibold uppercase tracking-wide transition ${
                prioridade === p.valor
                  ? "border-transparent text-white " + p.cor
                  : "border-slate-300 bg-white text-slate-600 hover:bg-slate-50"
              }`}
            >
              {p.rotulo}
            </button>
          ))}
        </div>
      </Campo>

      <Campo label="Local principal">
        <select
          value={propriedadeId}
          onChange={(e) => trocarPropriedade(e.target.value)}
          className={inputCls}
          required
        >
          {propriedades.length === 0 && (
            <option value="">Nenhum local cadastrado</option>
          )}
          {propriedades.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nome}
            </option>
          ))}
        </select>
      </Campo>

      <Campo label="Sublocal">
        <select
          value={localId}
          onChange={(e) => setLocalId(e.target.value)}
          className={inputCls}
          disabled={!propriedadeId || locaisFiltrados.length === 0}
        >
          <option value="">
            {locaisFiltrados.length === 0
              ? "Nenhum sublocal cadastrado"
              : "Selecione o sublocal…"}
          </option>
          {locaisFiltrados.map((l) => (
            <option key={l.id} value={l.id}>
              {l.nome}
            </option>
          ))}
        </select>
      </Campo>

      <Campo label="Quem está solicitando?">
        <select
          value={solicitanteId}
          onChange={(e) => setSolicitanteId(e.target.value)}
          className={inputCls}
          required
        >
          <option value="">Selecione seu nome…</option>
          {solicitantesFiltrados.map((s) => (
            <option key={s.id} value={s.id}>
              {s.nome}
            </option>
          ))}
        </select>
      </Campo>

      <Campo label="O que precisa ser feito?">
        <input
          value={titulo}
          onChange={(e) => setTitulo(e.target.value)}
          placeholder="Ex.: Ar-condicionado não gela"
          className={inputCls}
          maxLength={120}
          required
        />
      </Campo>

      <Campo label="Detalhes" opcional>
        <textarea
          value={descricao}
          onChange={(e) => setDescricao(e.target.value)}
          rows={3}
          placeholder="Qualquer informação que ajude a equipe."
          className={inputCls}
        />
      </Campo>

      <Campo label="Foto ou vídeo" opcional>
        <div className="grid gap-2">
          <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-slate-300 bg-white px-3 py-3 text-sm font-medium text-slate-600 hover:bg-slate-50">
            📷 Tirar foto / escolher arquivo
            <input
              type="file"
              accept="image/*,video/*"
              capture="environment"
              multiple
              className="hidden"
              onChange={(e) => {
                adicionarArquivos(e.target.files);
                e.target.value = "";
              }}
            />
          </label>

          {arquivos.length > 0 && (
            <ul className="grid gap-1.5">
              {arquivos.map((a, i) => (
                <li
                  key={i}
                  className="flex items-center justify-between rounded-lg bg-slate-100 px-3 py-2 text-sm"
                >
                  <span className="truncate">{a.name}</span>
                  <button
                    type="button"
                    onClick={() => removerArquivo(i)}
                    className="ml-2 shrink-0 text-slate-400 hover:text-red-600"
                    aria-label="Remover"
                  >
                    ✕
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Campo>

      {erro && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{erro}</p>
      )}

      <button
        type="submit"
        disabled={enviando}
        className="rounded-xl bg-brand-600 px-4 py-3 text-base font-semibold text-white transition hover:bg-brand-700 disabled:opacity-60"
      >
        {enviando ? "Enviando…" : "Enviar demanda"}
      </button>
    </form>
  );
}

function Campo({
  label,
  opcional,
  children,
}: {
  label: string;
  opcional?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="grid gap-1.5">
      <label className="text-sm font-medium text-slate-700">
        {label}
        {opcional && <span className="ml-1 text-xs text-slate-400">(opcional)</span>}
      </label>
      {children}
    </div>
  );
}
