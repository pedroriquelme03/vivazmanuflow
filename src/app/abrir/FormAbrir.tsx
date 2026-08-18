"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { comprimirImagem } from "@/lib/comprimir-imagem";
import type { Enums } from "@/lib/database.types";

type Opcao = { id: string; nome: string };
type OpcaoProp = { id: string; nome: string; propriedade_id: string };
type Predefinida = {
  id: string;
  titulo: string;
  descricao: string | null;
  prioridade: Enums<"demanda_prioridade">;
  propriedade_id: string | null;
};
type EventoOpcao = {
  id: string;
  nome: string;
  propriedade_id: string | null;
  data_inicio: string | null;
  data_fim: string | null;
};
type Prioridade = Enums<"demanda_prioridade">;

export type FormAbrirProps = {
  propriedades: Opcao[];
  solicitantes: OpcaoProp[];
  locais: OpcaoProp[];
  predefinidas: Predefinida[];
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
  locais,
  predefinidas,
  eventos,
  onSucesso,
}: FormAbrirProps) {
  const router = useRouter();
  const supabase = createClient();

  const [propriedadeId, setPropriedadeId] = useState(propriedades[0]?.id ?? "");
  const [solicitanteId, setSolicitanteId] = useState("");
  const [localId, setLocalId] = useState("");
  const [predefinidaId, setPredefinidaId] = useState("");
  const [eventoId, setEventoId] = useState("");
  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [afetaExperiencia, setAfetaExperiencia] = useState(false);
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
  const predefinidasFiltradas = useMemo(
    () =>
      predefinidas.filter(
        (p) => p.propriedade_id === null || p.propriedade_id === propriedadeId,
      ),
    [predefinidas, propriedadeId],
  );
  const eventosFiltrados = useMemo(
    () =>
      eventos.filter(
        (e) => e.propriedade_id === null || e.propriedade_id === propriedadeId,
      ),
    [eventos, propriedadeId],
  );

  const usandoPredefinida = Boolean(predefinidaId);

  function trocarPropriedade(id: string) {
    setPropriedadeId(id);
    setSolicitanteId("");
    setLocalId("");
    setPredefinidaId("");
    setEventoId("");
    setTitulo("");
    setDescricao("");
  }

  function trocarPredefinida(id: string) {
    setPredefinidaId(id);
    if (!id) {
      setTitulo("");
      setDescricao("");
      return;
    }
    const pred = predefinidas.find((p) => p.id === id);
    if (!pred) return;
    setTitulo(pred.titulo);
    setDescricao(pred.descricao ?? "");
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
    if (!titulo.trim())
      return setErro("Selecione uma demanda ou descreva o que precisa.");

    setEnviando(true);
    try {
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

      const { data, error } = await supabase.rpc("abrir_demanda", {
        p_solicitante_id: solicitanteId,
        p_titulo: titulo.trim(),
        p_descricao: descricao || undefined,
        p_local_id: localId || undefined,
        p_prioridade: (afetaExperiencia ? "alta" : "media") as Prioridade,
        p_anexos: anexos,
      });
      if (error) throw new Error(error.message);

      const token = data?.[0]?.token;
      if (!token) throw new Error("Não foi possível gerar o acompanhamento.");

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

      <Campo label="Demanda Frequente">
        <select
          value={predefinidaId}
          onChange={(e) => trocarPredefinida(e.target.value)}
          className={inputCls}
        >
          <option value="">Outra / personalizada…</option>
          {predefinidasFiltradas.map((p) => (
            <option key={p.id} value={p.id}>
              {p.titulo}
            </option>
          ))}
        </select>
        {usandoPredefinida ? (
          <p className="mt-1 text-xs text-brand-700">
            Esta demanda será atribuída automaticamente ao responsável cadastrado.
          </p>
        ) : (
          <p className="mt-1 text-xs text-slate-500">
            Demanda personalizada: fica disponível em Demandas Gerais para um
            colaborador pegar.
          </p>
        )}
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
          readOnly={usandoPredefinida}
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
