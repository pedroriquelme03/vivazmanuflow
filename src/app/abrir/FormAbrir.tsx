"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { idUnico } from "@/lib/id-unico";
import {
  type ChamadoPendente,
  ehFalhaDeRede,
  enviarChamado,
  prepararArquivos,
  registrarConcluido,
} from "@/lib/envio-chamado";
import { filaDisponivel, guardarNaFila } from "@/lib/fila-offline";
import { EscolherMidia } from "@/components/EscolherMidia";
import {
  decidirSolicitanteRegistro,
  garantirSolicitantesGestor,
  idSolicitantePorNome,
  solicitantesUnicos,
} from "@/lib/solicitante-gestor";
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
  /** Programas cadastrados no TI. Só aparecem nesse ambiente. */
  sistemas?: Opcao[];
  /**
   * Se informado, é chamado após criar a demanda (com o token) em vez de
   * redirecionar para o acompanhamento. Usado no modal "Nova demanda" do quadro.
   * `null` = sem internet: o chamado ficou na fila e sobe quando o sinal voltar.
   */
  onSucesso?: (token: string | null) => void;
  /** Kanban: grava já em Concluídas, sem entrar na fila. */
  destinarConcluido?: boolean;
  /** Campo "É demanda de evento?". Só o quadro (líder/admin) usa. */
  mostrarEvento?: boolean;
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
  sistemas = [],
  onSucesso,
  destinarConcluido = false,
  mostrarEvento = true,
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
    destinarConcluido
      ? ""
      : idSolicitantePorNome(
          solicitantes,
          nomeSolicitantePadrao,
          idLocalPadrao(propriedades, propriedadePadrao),
        ),
  );
  const [nomeDigitado, setNomeDigitado] = useState("");
  const [sublocal, setSublocal] = useState("");
  const [sistemaId, setSistemaId] = useState("");
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
  const [naFila, setNaFila] = useState(false);

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
  const comSistema = ehTi && Boolean(sistemaId);
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
      destinarConcluido
        ? ""
        : idSolicitantePorNome(solicitantes, nomeSolicitantePadrao, id),
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
    setNaFila(false);

    if (!comSistema && !sublocal.trim()) return setErro("Informe o local.");
    let quemSolicita = "";
    if (destinarConcluido) {
      const decisao = decidirSolicitanteRegistro(
        solicitantes,
        propriedadeId,
        solicitanteId,
        nomeDigitado,
      );
      if (decisao.tipo === "erro") return setErro(decisao.mensagem);
      if (decisao.tipo === "existente") {
        quemSolicita = decisao.id;
      } else {
        const criou = await garantirSolicitantesGestor(supabase, {
          nome: decisao.nome,
          propriedadeId,
          propriedades: propriedades.map((p) => ({ id: p.id, ativo: true })),
        });
        const { data: lista, error: listaErro } = await supabase
          .from("solicitantes")
          .select("id, nome, propriedade_id")
          .eq("propriedade_id", propriedadeId)
          .eq("ativo", true);
        if (listaErro) return setErro(listaErro.message);
        quemSolicita = idSolicitantePorNome(
          lista ?? [],
          decisao.nome,
          propriedadeId,
        );
        if (!quemSolicita) {
          return setErro(
            criou
              ? "Nome gravado, mas não deu para vinculá-lo ao chamado. Tente de novo."
              : "Não foi possível gravar esse nome. Tente de novo.",
          );
        }
      }
    } else {
      quemSolicita = solicitanteTravado ? solicitanteIdLogado : solicitanteId;
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

    const item: ChamadoPendente = {
      chave: idUnico(),
      criadoEm: new Date().toISOString(),
      ambiente,
      quemSolicita,
      titulo: titulo.trim(),
      descricao,
      sublocal: comSistema ? "" : sublocal.trim(),
      sistemaId: comSistema ? sistemaId : "",
      eventoId,
      projetoId: destinarConcluido
        ? ""
        : (idProjetoParaVincular(modoProjeto, projetoId) ?? ""),
      afetaExperiencia,
      arquivos: [],
      anexos: [],
      passosFeitos: [],
    };

    setEnviando(true);
    try {
      item.arquivos = await prepararArquivos(arquivos);
      const token = destinarConcluido
        ? await registrarConcluido(supabase, item)
        : await enviarChamado(supabase, item);
      concluir(token);
    } catch (err) {
      if (
        ehFalhaDeRede(err) &&
        !destinarConcluido &&
        (await guardarParaDepois(item))
      ) {
        return;
      }
      setErro(err instanceof Error ? err.message : "Erro inesperado.");
      setEnviando(false);
    }
  }

  /** Sem internet: o chamado vai para a fila e sobe quando o sinal voltar. */
  async function guardarParaDepois(item: ChamadoPendente) {
    if (!filaDisponivel()) return false;
    try {
      await guardarNaFila(item);
    } catch {
      return false;
    }
    setTitulo("");
    setDescricao("");
    setSublocal("");
    setArquivos([]);
    setEventoId("");
    setAfetaExperiencia(false);
    setEnviando(false);
    setNaFila(true);
    onSucesso?.(null);
    return true;
  }

  function concluir(token: string) {
    if (onSucesso) {
      onSucesso(token);
      return;
    }
    const q = new URLSearchParams({ nova: "1" });
    if (sublocal.trim()) q.set("sublocal", sublocal.trim());
    router.push(`/acompanhar/${token}?${q.toString()}`);
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

      {ehTi && (
        <Campo label="Sistema">
          <select
            value={sistemaId}
            onChange={(e) => {
              setSistemaId(e.target.value);
              setSublocal("");
            }}
            className={inputCls}
          >
            <option value="">Não é de um sistema</option>
            {sistemas.map((s) => (
              <option key={s.id} value={s.id}>
                {s.nome}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-slate-400">
            {comSistema
              ? "O chamado fica nesse sistema. Não precisa informar o local."
              : sistemas.length === 0
                ? "Nenhum sistema cadastrado. Sem escolha, informe o local abaixo."
                : "Deixe assim se o problema não for de um programa. Aí o local é obrigatório."}
          </p>
        </Campo>
      )}

      {!comSistema && (
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
      )}

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
          <>
            <select
              value={solicitanteId}
              onChange={(e) => setSolicitanteId(e.target.value)}
              className={inputCls}
              required={!destinarConcluido}
            >
              <option value="">
                {destinarConcluido
                  ? "Selecione quem solicitou…"
                  : "Selecione seu nome…"}
              </option>
              {solicitantesFiltrados.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nome}
                </option>
              ))}
            </select>
            {destinarConcluido && (
              <>
                <input
                  value={nomeDigitado}
                  onChange={(e) => setNomeDigitado(e.target.value)}
                  placeholder="Ou digite o nome, se não estiver na lista"
                  className={`${inputCls} mt-2`}
                  maxLength={120}
                />
                <p className="mt-1 text-xs text-slate-400">
                  Você continua como responsável. Se o nome já existir no
                  cadastro, o setor dessa pessoa segue nas métricas. Nome novo
                  entra sem setor.
                </p>
              </>
            )}
          </>
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

      {mostrarEvento && !ehTi && !destinarConcluido && (
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

      <Campo label={destinarConcluido ? "Foto, vídeo ou PDF" : "Foto ou vídeo"} opcional>
        <div className="grid gap-2">
          <EscolherMidia
            accept="image/*,video/*"
            multiple
            comPdf={destinarConcluido}
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
      {naFila && (
        <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
          Sem conexão. O chamado ficou na fila deste aparelho e será enviado
          sozinho quando a internet voltar.
        </p>
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
