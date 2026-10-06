"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { comprimirImagem } from "@/lib/comprimir-imagem";
import { idUnico } from "@/lib/id-unico";
import { uploadAnexo } from "@/lib/upload-anexo";
import { EscolherMidia } from "@/components/EscolherMidia";
import {
  garantirSolicitantesGestor,
  idSolicitantePorNome,
  solicitantesUnicos,
} from "@/lib/solicitante-gestor";
import { recursoAmbienteAusente } from "@/lib/ambiente-equipe";
import type { Enums } from "@/lib/database.types";
import type { ModoCampoProjeto } from "@/lib/projeto-regras";
import {
  idProjetoParaVincular,
  validarCampoProjeto,
} from "@/lib/projeto-regras";

type Opcao = { id: string; nome: string };
type OpcaoProp = { id: string; nome: string; propriedade_id: string };
type EventoOpcao = {
  id: string;
  nome: string;
  propriedade_id: string | null;
  data_inicio: string | null;
  data_fim: string | null;
};
type ProjetoOpcao = {
  id: string;
  nome: string;
  propriedade_id: string | null;
};
type Prioridade = Enums<"demanda_prioridade">;

function semAquamania(lista: Opcao[]) {
  return lista.filter((p) => !p.nome.toLowerCase().includes("aquamania"));
}

function idLocalPadrao(lista: Opcao[], preferido?: string | null) {
  const visiveis = semAquamania(lista);
  const vivaz = visiveis.find((p) => {
    const n = p.nome.toLowerCase();
    return n.includes("vivaz") && n.includes("cataratas");
  });
  if (vivaz) return vivaz.id;
  if (preferido && visiveis.some((p) => p.id === preferido)) return preferido;
  return visiveis[0]?.id ?? "";
}

export type FormAbrirProps = {
  propriedades: Opcao[];
  solicitantes: OpcaoProp[];
  eventos: EventoOpcao[];
  projetos?: ProjetoOpcao[];
  /** Público: opcional. Kanban Chamados: oculto. Kanban Projetos: obrigatorio. */
  modoProjeto?: ModoCampoProjeto;
  projetoIdPadrao?: string | null;
  /** Nome do usuário logado (Nova demanda no quadro). */
  nomeSolicitantePadrao?: string | null;
  propriedadePadrao?: string | null;
  /** Quadro em que o chamado nasce. Sem isso, fica em Manutenção. */
  ambiente?: "manutencao" | "ti";
  /**
   * Se informado, é chamado após criar a demanda (com o token) em vez de
   * redirecionar para o acompanhamento. Usado no modal "Nova demanda" do quadro.
   */
  onSucesso?: (token: string) => void;
  /** Kanban: grava já em Concluídas, sem entrar na fila. */
  destinarConcluido?: boolean;
};

export function FormAbrir({
  propriedades,
  solicitantes,
  eventos,
  projetos = [],
  modoProjeto = "opcional",
  projetoIdPadrao = "",
  nomeSolicitantePadrao,
  propriedadePadrao,
  ambiente = "manutencao",
  onSucesso,
  destinarConcluido = false,
}: FormAbrirProps) {
  const router = useRouter();
  const supabase = createClient();

  const propriedadesVisiveis = useMemo(
    () => semAquamania(propriedades),
    [propriedades],
  );

  const [propriedadeId, setPropriedadeId] = useState(() =>
    idLocalPadrao(propriedades, propriedadePadrao),
  );
  const [solicitanteId, setSolicitanteId] = useState(() =>
    idSolicitantePorNome(
      solicitantes,
      nomeSolicitantePadrao,
      idLocalPadrao(propriedades, propriedadePadrao),
    ),
  );
  const [sublocal, setSublocal] = useState("");
  const [eventoId, setEventoId] = useState("");
  const [projetoId, setProjetoId] = useState(
    () => (modoProjeto === "oculto" ? "" : projetoIdPadrao ?? ""),
  );
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
  const projetosFiltrados = projetos;
  const eventosFiltrados = useMemo(
    () =>
      eventos.filter(
        (e) => e.propriedade_id === null || e.propriedade_id === propriedadeId,
      ),
    [eventos, propriedadeId],
  );

  const mostrarLocalPrincipal = propriedadesVisiveis.length > 1;
  const ehTi = ambiente === "ti";
  const solicitanteTravado =
    Boolean(nomeSolicitantePadrao?.trim()) && !destinarConcluido;
  const solicitanteIdLogado = idSolicitantePorNome(
    solicitantes,
    nomeSolicitantePadrao,
    propriedadeId,
  );

  function trocarPropriedade(id: string) {
    setPropriedadeId(id);
    setSolicitanteId(
      idSolicitantePorNome(solicitantes, nomeSolicitantePadrao, id),
    );
    setSublocal("");
    setEventoId("");
    if (modoProjeto === "opcional") setProjetoId("");
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
    let quemSolicita = solicitanteTravado
      ? solicitanteIdLogado
      : solicitanteId;
    if (!quemSolicita && nomeSolicitantePadrao?.trim() && propriedadeId) {
      const nomePedido = nomeSolicitantePadrao.trim();
      await garantirSolicitantesGestor(supabase, {
        nome: nomePedido,
        propriedadeId,
        propriedades: propriedades.map((p) => ({ id: p.id, ativo: true })),
      });
      const { data: lista } = await supabase
        .from("solicitantes")
        .select("id, nome, propriedade_id")
        .eq("propriedade_id", propriedadeId)
        .eq("ativo", true);
      quemSolicita = idSolicitantePorNome(
        lista ?? [],
        nomePedido,
        propriedadeId,
      );
    }
    if (!quemSolicita) {
      return setErro(
        ehTi && !destinarConcluido
          ? "Não foi possível abrir o chamado. Tente de novo."
          : solicitanteTravado
            ? "Seu usuário ainda não está na lista de solicitantes deste local."
            : "Selecione quem está solicitando.",
      );
    }
    if (!destinarConcluido) {
      const erroProjeto = validarCampoProjeto(modoProjeto, projetoId);
      if (erroProjeto) return setErro(erroProjeto);
    }
    if (!titulo.trim()) return setErro("Descreva o que precisa ser feito.");
    if (destinarConcluido && !descricao.trim()) {
      return setErro("Descreva o que foi feito.");
    }

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

      let token: string | undefined;
      let demandaId: string | undefined;

      if (destinarConcluido) {
        const { data, error } = await supabase.rpc(
          "registrar_chamado_concluido",
          {
            p_solicitante_id: quemSolicita,
            p_titulo: titulo.trim(),
            p_sublocal: sublocal.trim(),
            p_descricao: descricao.trim(),
            p_prioridade: (afetaExperiencia ? "alta" : "media") as Prioridade,
            p_ambiente: ambiente,
            p_anexos: anexos,
            p_observacao: descricao.trim(),
          },
        );
        if (error) {
          if (
            error.message.includes("schema cache") ||
            error.message.includes("Could not find")
          ) {
            throw new Error(
              "Rode o SQL registrar_chamado_concluido no Supabase e tente de novo.",
            );
          }
          throw new Error(error.message);
        }
        token = data?.[0]?.token;
        demandaId = data?.[0]?.demanda_id;
      } else {
        const { data, error } = await supabase.rpc("abrir_demanda", {
          p_solicitante_id: quemSolicita,
          p_titulo: titulo.trim(),
          p_descricao: descricao || undefined,
          p_prioridade: (afetaExperiencia ? "alta" : "media") as Prioridade,
          p_anexos: anexos,
        });
        if (error) throw new Error(error.message);
        token = data?.[0]?.token;
        demandaId = data?.[0]?.demanda_id;
      }
      if (!token) throw new Error("Não foi possível gerar o acompanhamento.");

      if (!destinarConcluido) {
        if (demandaId && ambiente === "ti") {
          const { error: ambErro } = await supabase.rpc(
            "marcar_ambiente_demanda",
            { p_demanda_id: demandaId, p_ambiente: "ti" },
          );
          if (ambErro && !recursoAmbienteAusente(ambErro.message)) {
            throw new Error(ambErro.message);
          }
          if (ambErro) {
            const { error: updErro } = await supabase
              .from("demandas")
              .update({
                ambiente: "ti",
                colaborador_id: null,
                status: "aberta",
                atribuido_em: null,
              })
              .eq("id", demandaId);
            if (updErro) {
              throw new Error(
                "Chamado criado, mas não foi para o quadro de TI. Rode o SQL marcar_ambiente_demanda no Supabase e tente de novo.",
              );
            }
          }
        }

        {
          const { error: subErro } = await supabase.rpc("definir_sublocal", {
            p_token: String(token),
            p_sublocal: sublocal.trim(),
          });
          if (subErro) {
            throw new Error(
              "Chamado criado, mas o local não gravou. Rode o SQL do sublocal no Supabase (definir_sublocal) e tente de novo.",
            );
          }
        }

        if (afetaExperiencia) {
          const { error: pesoErro } = await supabase.rpc(
            "aplicar_experiencia_hospede",
            { p_token: token, p_afeta: true },
          );
          if (pesoErro) {
            console.warn(
              "Falha ao aplicar peso de experiência:",
              pesoErro.message,
            );
          }
        }

        if (eventoId) {
          const { error: evErro } = await supabase.rpc(
            "vincular_evento_demanda",
            {
              p_token: token,
              p_evento_id: eventoId,
            },
          );
          if (evErro) {
            console.warn("Falha ao vincular evento:", evErro.message);
          }
        }

        const projetoVincular = idProjetoParaVincular(modoProjeto, projetoId);
        if (projetoVincular) {
          const { error: prErro } = await supabase.rpc(
            "vincular_projeto_demanda",
            {
              p_token: token,
              p_projeto_id: projetoVincular,
            },
          );
          if (prErro) {
            throw new Error(
              `Demanda criada, mas o projeto não gravou: ${prErro.message}`,
            );
          }
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
      <Campo
        label={
          ehTi ? "Prioridade da demanda" : "Afeta a experiência do hóspede?"
        }
      >
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
            {ehTi ? "Alta" : "Sim"}
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
            {ehTi ? "Normal" : "Não"}
          </button>
        </div>
        <p
          className={`mt-1.5 text-xs font-medium ${
            afetaExperiencia ? "text-red-600" : "text-slate-500"
          }`}
        >
          {destinarConcluido
            ? "Não vai para a fila. Só fica no registro."
            : afetaExperiencia
              ? ehTi
                ? "Alta — vai para o topo da fila."
                : "Prioridade alta e peso 10 — vai para o topo da fila."
              : ehTi
                ? "Normal — fila comum."
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
          placeholder={
            ehTi
              ? "Ex.: Recepção, escritório, computador da governança…"
              : "Ex.: Quarto 204, piscina, recepção…"
          }
          className={inputCls}
          maxLength={120}
          required
        />
      </Campo>

      {(!ehTi || destinarConcluido) && (
      <Campo label="Quem está solicitando?">
        {solicitanteTravado ? (
          <>
            <p className={`${inputCls} bg-slate-50 text-slate-800`}>
              {nomeSolicitantePadrao}
            </p>
            <p className="mt-1 text-xs text-slate-400">
              Logado: a demanda fica no seu nome e não pode ser trocada.
            </p>
            {!solicitanteIdLogado && (
              <p className="mt-1 text-xs text-red-600">
                Seu usuário ainda não está na lista de solicitantes deste local.
              </p>
            )}
          </>
        ) : (
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
        )}
      </Campo>
      )}

      {modoProjeto !== "oculto" && !ehTi && !destinarConcluido && (
        <Campo label="Projeto" opcional={modoProjeto !== "obrigatorio"}>
          <select
            value={projetoId}
            onChange={(e) => setProjetoId(e.target.value)}
            className={inputCls}
            required={modoProjeto === "obrigatorio"}
          >
            {modoProjeto === "opcional" ? (
              <option value="">Nenhum — fila normal</option>
            ) : (
              <option value="">Selecione o projeto…</option>
            )}
            {projetosFiltrados.map((pr) => (
              <option key={pr.id} value={pr.id}>
                {pr.nome}
              </option>
            ))}
          </select>
          {projetosFiltrados.length === 0 && (
            <p className="mt-1 text-xs text-slate-400">
              Nenhum projeto ativo. Cadastre em Projetos no menu do admin.
            </p>
          )}
          {projetoId ? (
            <p className="mt-1 text-xs text-brand-700">
              Só quem está neste projeto (e o administrador) vai ver esta
              demanda.
            </p>
          ) : modoProjeto === "opcional" ? (
            <p className="mt-1 text-xs text-slate-400">
              Sem projeto, entra na fila de todo mundo.
            </p>
          ) : null}
        </Campo>
      )}

      {!ehTi && !destinarConcluido && (
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
      )}

      <Campo label="O que precisa ser feito?">
        <input
          value={titulo}
          onChange={(e) => setTitulo(e.target.value)}
          placeholder={
            ehTi
              ? "Ex.: Impressora sem rede, e-mail não abre"
              : "Ex.: Ar-condicionado não gela"
          }
          className={inputCls}
          maxLength={120}
          required
        />
      </Campo>

      <Campo label={destinarConcluido ? "O que foi feito" : "Detalhes"} opcional={!destinarConcluido}>
        <textarea
          value={descricao}
          onChange={(e) => setDescricao(e.target.value)}
          rows={3}
          placeholder={
            destinarConcluido
              ? "Descreva o que já foi resolvido."
              : "Qualquer informação que ajude a equipe."
          }
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
        {enviando
          ? "Enviando…"
          : destinarConcluido
            ? "Registrar como concluído"
            : ehTi
              ? "Enviar chamado"
              : "Enviar demanda"}
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
