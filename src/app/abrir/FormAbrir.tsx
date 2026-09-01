"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { comprimirImagem } from "@/lib/comprimir-imagem";
import { idUnico } from "@/lib/id-unico";
import { uploadAnexo } from "@/lib/upload-anexo";
import { EscolherMidia } from "@/components/EscolherMidia";
import { solicitantesUnicos } from "@/lib/solicitante-gestor";
import type { Enums } from "@/lib/database.types";

type Opcao = { id: string; nome: string };
type OpcaoProp = { id: string; nome: string; propriedade_id: string };
type EventoOpcao = {
  id: string;
  nome: string;
  propriedade_id: string | null;
  data_inicio: string | null;
  data_fim: string | null;
};
type Prioridade = Enums<"demanda_prioridade">;

function semAquamania(lista: Opcao[]) {
  return lista.filter((p) => !p.nome.toLowerCase().includes("aquamania"));
}

export type FormAbrirProps = {
  propriedades: Opcao[];
  solicitantes: OpcaoProp[];
  eventos: EventoOpcao[];
  /**
   * Se informado, é chamado após criar a demanda (com o token) em vez de
   * redirecionar para o acompanhamento. Usado no modal "Nova demanda" do quadro.
   */
  onSucesso?: (token: string) => void;
};

export function FormAbrir({
  propriedades,
  solicitantes,
  eventos,
  onSucesso,
}: FormAbrirProps) {
  const router = useRouter();
  const supabase = createClient();

  const propriedadesVisiveis = useMemo(
    () => semAquamania(propriedades),
    [propriedades],
  );

  const [propriedadeId, setPropriedadeId] = useState(
    () => semAquamania(propriedades)[0]?.id ?? "",
  );
  const [solicitanteId, setSolicitanteId] = useState("");
  const [sublocal, setSublocal] = useState("");
  const [eventoId, setEventoId] = useState("");
  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [afetaExperiencia, setAfetaExperiencia] = useState(false);
  const [arquivos, setArquivos] = useState<File[]>([]);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const solicitantesFiltrados = useMemo(
    () =>
      solicitantesUnicos(
        solicitantes.filter((s) => s.propriedade_id === propriedadeId),
      ),
    [solicitantes, propriedadeId],
  );
  const eventosFiltrados = useMemo(
    () =>
      eventos.filter(
        (e) => e.propriedade_id === null || e.propriedade_id === propriedadeId,
      ),
    [eventos, propriedadeId],
  );

  const mostrarLocalPrincipal = propriedadesVisiveis.length > 1;

  function trocarPropriedade(id: string) {
    setPropriedadeId(id);
    setSolicitanteId("");
    setSublocal("");
    setEventoId("");
  }

  function adicionarArquivos(lista: File[]) {
    if (lista.length === 0) return;
    setArquivos((atual) => [...atual, ...lista].slice(0, 5));
  }

  function nomeVisivel(arquivo: File, indice: number) {
    const n = arquivo.name?.trim();
    if (n && n !== "image.jpg" && n !== "image.jpeg" && n !== "blob") {
      return n;
    }
    return arquivo.type.startsWith("video/")
      ? `Vídeo ${indice + 1}`
      : `Foto ${indice + 1}`;
  }

  function removerArquivo(indice: number) {
    setArquivos((atual) => atual.filter((_, i) => i !== indice));
  }

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);

    if (!sublocal.trim()) return setErro("Informe o local.");
    if (!solicitanteId) return setErro("Selecione quem está solicitando.");
    if (!titulo.trim()) return setErro("Descreva o que precisa ser feito.");

    setEnviando(true);
    try {
      const anexos: { url: string; tipo: "foto" | "video" }[] = [];
      for (const original of arquivos) {
        const arquivo = await comprimirImagem(original);
        const ehVideo = arquivo.type.startsWith("video/");
        const tipo = ehVideo
          ? arquivo.type || "video/mp4"
          : "image/jpeg";
        const caminho = `abertura/${idUnico()}.${ehVideo ? "mp4" : "jpg"}`;
        const { error: upErro } = await uploadAnexo(
          supabase,
          caminho,
          arquivo,
          tipo,
        );
        if (upErro) {
          throw new Error(`Falha ao enviar o anexo: ${upErro.message}`);
        }

        const { data: pub } = supabase.storage.from("anexos").getPublicUrl(caminho);
        anexos.push({ url: pub.publicUrl, tipo: ehVideo ? "video" : "foto" });
      }

      const { data, error } = await supabase.rpc("abrir_demanda", {
        p_solicitante_id: solicitanteId,
        p_titulo: titulo.trim(),
        p_descricao: descricao || undefined,
        p_prioridade: (afetaExperiencia ? "alta" : "media") as Prioridade,
        p_anexos: anexos,
      });
      if (error) throw new Error(error.message);

      const token = data?.[0]?.token;
      if (!token) throw new Error("Não foi possível gerar o acompanhamento.");

      {
        const { error: subErro } = await supabase.rpc("definir_sublocal", {
          p_token: String(token),
          p_sublocal: sublocal.trim(),
        });
        if (subErro) {
          throw new Error(
            "Demanda criada, mas o local não gravou. Rode o SQL do sublocal no Supabase (definir_sublocal) e tente de novo.",
          );
        }
      }

      if (afetaExperiencia) {
        const { error: pesoErro } = await supabase.rpc(
          "aplicar_experiencia_hospede",
          { p_token: token, p_afeta: true },
        );
        if (pesoErro) {
          console.warn("Falha ao aplicar peso de experiência:", pesoErro.message);
        }
      }

      if (eventoId) {
        const { error: evErro } = await supabase.rpc("vincular_evento_demanda", {
          p_token: token,
          p_evento_id: eventoId,
        });
        if (evErro) {
          console.warn("Falha ao vincular evento:", evErro.message);
        }
      }

      if (onSucesso) {
        onSucesso(token);
        return;
      }

      const q = new URLSearchParams({ nova: "1" });
      if (sublocal.trim()) q.set("sublocal", sublocal.trim());
      router.push(`/acompanhar/${token}?${q.toString()}`);
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro inesperado.");
      setEnviando(false);
    }
  }

  const inputCls =
    "w-full rounded-lg border border-slate-300 px-3 py-2.5 text-base outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30";

  return (
    <form onSubmit={enviar} className="grid gap-4">
      <Campo label="Afeta a experiência do hóspede?">
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setAfetaExperiencia(true)}
            className={`rounded-lg border px-3 py-2.5 text-sm font-semibold transition ${
              afetaExperiencia
                ? "border-red-500 bg-red-500 text-white"
                : "border-slate-300 bg-white text-slate-600 hover:bg-slate-50"
            }`}
          >
            Sim
          </button>
          <button
            type="button"
            onClick={() => setAfetaExperiencia(false)}
            className={`rounded-lg border px-3 py-2.5 text-sm font-semibold transition ${
              !afetaExperiencia
                ? "border-slate-600 bg-slate-700 text-white"
                : "border-slate-300 bg-white text-slate-600 hover:bg-slate-50"
            }`}
          >
            Não
          </button>
        </div>
        <p
          className={`mt-1.5 text-xs font-medium ${
            afetaExperiencia ? "text-red-600" : "text-slate-500"
          }`}
        >
          {afetaExperiencia
            ? "Prioridade alta e peso 10 — vai para o topo da fila."
            : "Prioridade média — fila normal."}
        </p>
      </Campo>

      {mostrarLocalPrincipal && (
        <Campo label="Local principal">
          <select
            value={propriedadeId}
            onChange={(e) => trocarPropriedade(e.target.value)}
            className={inputCls}
            required
          >
            {propriedadesVisiveis.length === 0 && (
              <option value="">Nenhum local cadastrado</option>
            )}
            {propriedadesVisiveis.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nome}
              </option>
            ))}
          </select>
        </Campo>
      )}

      <Campo label="Local">
        <input
          value={sublocal}
          onChange={(e) => setSublocal(e.target.value)}
          placeholder="Ex.: Quarto 204, piscina, recepção…"
          className={inputCls}
          maxLength={120}
          required
        />
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

      <Campo label="É demanda de evento?" opcional>
        <select
          value={eventoId}
          onChange={(e) => setEventoId(e.target.value)}
          className={inputCls}
        >
          <option value="">Não — manutenção de rotina</option>
          {eventosFiltrados.map((ev) => (
            <option key={ev.id} value={ev.id}>
              {ev.nome}
              {ev.data_inicio ? ` (${ev.data_inicio})` : ""}
            </option>
          ))}
        </select>
        {eventoId && (
          <p className="mt-1 text-xs text-brand-700">
            Esta demanda entra na fila normal e fica marcada para métricas de
            evento.
          </p>
        )}
        {eventosFiltrados.length === 0 && (
          <p className="mt-1 text-xs text-slate-400">
            Nenhum evento ativo cadastrado para este local.
          </p>
        )}
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
          <EscolherMidia
            accept="image/*,video/*"
            multiple
            onEscolheu={adicionarArquivos}
          />
          <p className="text-xs text-slate-400">Até 5 arquivos. Pode misturar câmera e galeria.</p>

          {arquivos.length > 0 && (
            <ul className="grid gap-1.5">
              {arquivos.map((a, i) => (
                <li
                  key={`${nomeVisivel(a, i)}-${i}-${a.size}-${a.lastModified}`}
                  className="flex items-center justify-between rounded-lg bg-slate-100 px-3 py-2 text-sm"
                >
                  <span className="truncate">{nomeVisivel(a, i)}</span>
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
