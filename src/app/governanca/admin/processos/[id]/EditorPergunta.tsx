"use client";

import { useState, type ReactNode } from "react";
import type { TablesUpdate } from "@/lib/database.types";
import { TIPOS_ITEM, TIPO_ITEM_LABEL, tipoItem, tipoTemOpcoes, type Pergunta, type TipoItem } from "@/lib/governanca";
import {
  COMPLEMENTOS,
  lerExige,
  respostasPossiveis,
  rotuloResposta,
  type Complemento,
  type Dependencia,
  type Exige,
} from "@/lib/checklist-regras";
import { GRUPOS_PADRAO, grupoDoTipo, tiposDoGrupo, type GrupoItem, type TipoItemPatrimonio } from "@/lib/checklist-patrimonio";
import {
  CAMPOS_PLANO,
  MODOS_CAMPO_PLANO,
  camposDoPlano,
  lerCamposPlano,
  modoCampoPlano,
  mudarCampoPlano,
  type ConfigPlano,
} from "@/lib/checklist-plano";
import { Chave, btnPequeno, btnPequenoPerigo, inputCls } from "../../../ui";

/** Alvo de uma condicional: outra pergunta ou uma seção inteira do mesmo checklist. */
export type AlvoCondicional = { tipo: "pergunta" | "secao"; id: string; rotulo: string };

const ICONE: Record<Complemento, string> = { foto: "📷", comentario: "💬" };

/**
 * Uma pergunta no editor do checklist. Fechada mostra o texto e um resumo das
 * regras; aberta, a configuração em blocos: resposta, regras, obrigatórios por
 * resposta, condicionais, organização e item do local.
 */
export function EditorPergunta({
  numero,
  pergunta: p,
  dependencias,
  alvos,
  tiposItem,
  gruposItem = GRUPOS_PADRAO,
  usaLocal,
  onAtualizar,
  onRemover,
  onRenomearOpcao,
  onRemoverOpcao,
  onAdicionarCondicional,
  onRemoverCondicional,
}: {
  numero: number;
  pergunta: Pergunta;
  /** Condicionais em que esta pergunta é a que dispara. */
  dependencias: Dependencia[];
  /** Outras perguntas e seções do checklist que podem ser mostradas. */
  alvos: AlvoCondicional[];
  tiposItem: TipoItemPatrimonio[];
  gruposItem?: GrupoItem[];
  /** O checklist pede o local (UH/área): dá para ligar a pergunta a um item dele. */
  usaLocal: boolean;
  onAtualizar: (patch: TablesUpdate<"gov_perguntas">) => void;
  onRemover: () => void;
  onRenomearOpcao: (antiga: string, nova: string) => void;
  onRemoverOpcao: (opcao: string) => void;
  onAdicionarCondicional: (gatilho: string, alvo: AlvoCondicional) => void;
  onRemoverCondicional: (dependencia: Dependencia) => void;
}) {
  const [aberto, setAberto] = useState(false);
  const tipo = tipoItem(p.tipo);
  const exige = lerExige(p.exige);
  const tipoDoItem = tiposItem.find((t) => t.id === p.tipo_item_id);

  const resumo = [
    p.obrigatoria ? "Obrigatória" : "Opcional",
    p.permite_na && "Aceita N/A",
    p.permite_comentario === false && "Sem comentário",
    p.permite_foto === false && "Sem foto",
    tipo === "sim_nao" && p.plano_acao && "Chamado p/ manutenção no “Não”",
    tipo === "sim_nao" &&
      p.plano_acao &&
      camposDoPlano(lerCamposPlano(p.plano_campos)).length > 0 &&
      `Chamado pede ${camposDoPlano(lerCamposPlano(p.plano_campos))
        .map((c) => c.rotulo.toLowerCase())
        .join(", ")}`,
    tipo === "sim_nao" && Number(p.peso) !== 1 && `Peso ${p.peso}`,
    Object.keys(exige).length > 0 && "Exige foto/comentário",
    dependencias.length > 0 && `${dependencias.length} ${dependencias.length === 1 ? "condicional" : "condicionais"}`,
    tipoDoItem && `Confere ${tipoDoItem.nome}`,
    p.grupo && `Subárea: ${p.grupo}`,
  ].filter(Boolean) as string[];

  return (
    <li className="py-3">
      <div className="flex items-start gap-2">
        <span className="mt-2.5 w-6 shrink-0 text-right text-xs text-slate-400">{numero}.</span>
        <div className="min-w-0 flex-1">
          <input
            key={`${p.id}-${p.texto}`}
            defaultValue={p.texto}
            onBlur={(e) => e.target.value.trim() && e.target.value.trim() !== p.texto && onAtualizar({ texto: e.target.value.trim() })}
            aria-label={`Pergunta ${numero}`}
            className={inputCls}
          />
          {!aberto && (
            <p className="mt-1 flex flex-wrap gap-1">
              {resumo.map((r) => (
                <span key={r} className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-600">
                  {r}
                </span>
              ))}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={() => setAberto((v) => !v)}
          className={`${btnPequeno} mt-1 shrink-0`}
          aria-expanded={aberto}
        >
          {TIPO_ITEM_LABEL[tipo].split(" (")[0]} {aberto ? "▴" : "▾"}
        </button>
      </div>

      {aberto && (
        <div className="mt-3 space-y-5 rounded-xl border border-slate-200 bg-slate-50 p-4 sm:ml-8">
          <Bloco titulo="Resposta" ajuda="Como a pergunta é respondida.">
            <select
              className={`${inputCls} sm:max-w-xs`}
              value={tipo}
              onChange={(e) => onAtualizar({ tipo: e.target.value as TipoItem })}
              aria-label="Tipo de resposta"
            >
              {TIPOS_ITEM.map((t) => (
                <option key={t} value={t}>
                  {TIPO_ITEM_LABEL[t]}
                </option>
              ))}
            </select>
            {tipoTemOpcoes(tipo) && (
              <ListaOpcoes
                opcoes={p.opcoes}
                onMudarOrdem={(opcoes) => onAtualizar({ opcoes })}
                onAdicionar={(opcao) => onAtualizar({ opcoes: [...p.opcoes, opcao] })}
                onRenomear={onRenomearOpcao}
                onRemover={onRemoverOpcao}
              />
            )}
          </Bloco>

          <Bloco titulo="Regras">
            <div className="grid gap-3 sm:grid-cols-2">
              <Chave ligado={p.obrigatoria} onChange={(v) => onAtualizar({ obrigatoria: v })} ajuda="Precisa responder para seguir.">
                Obrigatória
              </Chave>
              <Chave ligado={p.permite_na} onChange={(v) => onAtualizar({ permite_na: v })} ajuda="Mostra o botão “Não se aplica”.">
                Aceita N/A
              </Chave>
              <Chave
                ligado={p.permite_comentario !== false}
                onChange={(v) => onAtualizar({ permite_comentario: v })}
                ajuda="Mostra o botão Comentar. Se uma resposta exige comentário, aparece mesmo assim."
              >
                Aceita comentário
              </Chave>
              <Chave
                ligado={p.permite_foto !== false}
                onChange={(v) => onAtualizar({ permite_foto: v })}
                ajuda="Mostra o botão Anexar (foto, vídeo ou documento). Se uma resposta exige anexo, aparece mesmo assim."
              >
                Aceita anexo
              </Chave>
              {tipo === "sim_nao" && (
                <Chave
                  ligado={p.plano_acao}
                  onChange={(v) => onAtualizar({ plano_acao: v })}
                  ajuda="Ao responder Não, pergunta se quer abrir chamado na Manutenção (quem aplica decide)."
                >
                  “Não” oferece chamado p/ manutenção
                </Chave>
              )}
              {tipo === "sim_nao" && (
                <label className="flex items-start gap-2 text-sm">
                  <input
                    key={`${p.id}-peso-${p.peso}`}
                    type="number"
                    min={0}
                    step={0.5}
                    defaultValue={p.peso}
                    className="w-20 rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm"
                    onBlur={(e) => {
                      const peso = Number(e.target.value);
                      if (Number.isFinite(peso) && peso >= 0 && peso !== Number(p.peso)) onAtualizar({ peso });
                    }}
                  />
                  <span>
                    <span className="block font-medium text-slate-700">Peso na nota</span>
                    <span className="block text-xs text-slate-500">1 é o normal; 0 não conta na nota.</span>
                  </span>
                </label>
              )}
            </div>
          </Bloco>

          {tipo === "sim_nao" && p.plano_acao && (
            <Bloco
              titulo="Campos do chamado para manutenção"
              ajuda="Prioridade, o que fazer e o local sempre aparecem. Escolha o que mais pedir quando abrir o chamado."
            >
              <CamposDoPlano config={lerCamposPlano(p.plano_campos)} onSalvar={(c) => onAtualizar({ plano_campos: c })} />
            </Bloco>
          )}

          {respostasPossiveis(tipo, p.opcoes).length > 0 && (
            <Bloco titulo="Obrigatório conforme a resposta" ajuda="Ex.: se a resposta for Não, exigir foto.">
              <ExigenciasPorResposta respostas={respostasPossiveis(tipo, p.opcoes)} exige={exige} onSalvar={(e) => onAtualizar({ exige: e })} />
            </Bloco>
          )}

          {respostasPossiveis(tipo, p.opcoes).length > 0 && (
            <Bloco
              titulo="Condicionais"
              ajuda="Uma resposta mostra outra pergunta ou uma seção inteira. Sem essa resposta, o alvo fica escondido e não conta."
            >
              <Condicionais
                respostas={respostasPossiveis(tipo, p.opcoes)}
                dependencias={dependencias}
                alvos={alvos}
                onAdicionar={onAdicionarCondicional}
                onRemover={onRemoverCondicional}
              />
            </Bloco>
          )}

          {usaLocal && (
            <Bloco
              titulo="Conferir item do local"
              ajuda="Na hora de responder aparece o que está cadastrado na UH (ex.: TV SAMSUNG 50'), e quem aplica avisa se encontrou outro modelo."
            >
              <select
                className={`${inputCls} sm:max-w-xs`}
                value={p.tipo_item_id ?? ""}
                onChange={(e) => onAtualizar({ tipo_item_id: e.target.value || null })}
                aria-label="Item do local"
              >
                <option value="">Não confere item</option>
                {gruposItem.map((g) => (
                  <optgroup key={g.codigo} label={g.nome}>
                    {tiposDoGrupo(tiposItem, g.codigo, p.tipo_item_id ?? undefined, gruposItem)
                      .filter((t) => grupoDoTipo(t, gruposItem) === g.codigo)
                      .map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.nome}
                        </option>
                      ))}
                  </optgroup>
                ))}
              </select>
            </Bloco>
          )}

          <Bloco titulo="Organização">
            <div className="grid gap-3 sm:grid-cols-2">
              <Campo rotulo="Subárea" ajuda="Agrupa perguntas dentro da seção (ex.: Banheiro).">
                <input
                  key={`${p.id}-g-${p.grupo ?? ""}`}
                  className={inputCls}
                  defaultValue={p.grupo ?? ""}
                  placeholder="Ex.: Bombas › Bomba 1"
                  onBlur={(e) => (e.target.value.trim() || null) !== p.grupo && onAtualizar({ grupo: e.target.value.trim() || null })}
                />
              </Campo>
              <Campo rotulo="Dica" ajuda="Texto de ajuda que aparece embaixo da pergunta.">
                <input
                  key={`${p.id}-d-${p.dica ?? ""}`}
                  className={inputCls}
                  defaultValue={p.dica ?? ""}
                  onBlur={(e) => (e.target.value.trim() || null) !== p.dica && onAtualizar({ dica: e.target.value.trim() || null })}
                />
              </Campo>
            </div>
          </Bloco>

          <div className="flex justify-end border-t border-slate-200 pt-3">
            <button type="button" onClick={onRemover} className={btnPequenoPerigo}>
              Excluir pergunta
            </button>
          </div>
        </div>
      )}
    </li>
  );
}

/** Cada campo extra do plano: não pede, opcional ou obrigatório. */
function CamposDoPlano({ config, onSalvar }: { config: ConfigPlano; onSalvar: (config: ConfigPlano) => void }) {
  return (
    <div className="divide-y divide-slate-100 rounded-xl border border-slate-200">
      {CAMPOS_PLANO.map((c) => {
        const atual = modoCampoPlano(config, c.campo);
        return (
          <div key={c.campo} className="flex flex-col gap-2 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between">
            <span className="min-w-0 text-sm">
              <b className="font-medium text-slate-700">{c.rotulo}</b>
              <span className="ml-1 text-xs text-slate-400">{c.dica}</span>
            </span>
            <div className="inline-flex shrink-0 overflow-hidden rounded-lg border border-slate-300 text-xs font-semibold">
              {MODOS_CAMPO_PLANO.map((m) => (
                <button
                  key={m.valor}
                  type="button"
                  aria-pressed={atual === m.valor}
                  onClick={() => atual !== m.valor && onSalvar(mudarCampoPlano(config, c.campo, m.valor))}
                  className={`px-2.5 py-1.5 ${
                    atual === m.valor
                      ? m.valor === "obrigatorio"
                        ? "bg-red-600 text-white"
                        : m.valor === "opcional"
                          ? "bg-brand-600 text-white"
                          : "bg-slate-600 text-white"
                      : "bg-white text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {m.rotulo}
                </button>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function Bloco({ titulo, ajuda, children }: { titulo: string; ajuda?: string; children: ReactNode }) {
  return (
    <section className="space-y-2">
      <div>
        <h4 className="text-xs font-bold uppercase tracking-wide text-slate-500">{titulo}</h4>
        {ajuda && <p className="text-xs text-slate-500">{ajuda}</p>}
      </div>
      {children}
    </section>
  );
}

function Campo({ rotulo, ajuda, children }: { rotulo: string; ajuda?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-slate-700">{rotulo}</span>
      {children}
      {ajuda && <span className="mt-1 block text-xs text-slate-500">{ajuda}</span>}
    </label>
  );
}

/** Opções da lista, uma por linha: renomear, mudar a ordem, remover e adicionar. */
function ListaOpcoes({
  opcoes,
  onMudarOrdem,
  onAdicionar,
  onRenomear,
  onRemover,
}: {
  opcoes: string[];
  onMudarOrdem: (opcoes: string[]) => void;
  onAdicionar: (opcao: string) => void;
  onRenomear: (antiga: string, nova: string) => void;
  onRemover: (opcao: string) => void;
}) {
  const [nova, setNova] = useState("");

  function mover(i: number, delta: -1 | 1) {
    const lista = [...opcoes];
    [lista[i], lista[i + delta]] = [lista[i + delta], lista[i]];
    onMudarOrdem(lista);
  }

  function adicionar(e: React.FormEvent) {
    e.preventDefault();
    const texto = nova.trim();
    if (!texto || opcoes.includes(texto)) return;
    onAdicionar(texto);
    setNova("");
  }

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-slate-700">Opções da lista</p>
      <ul className="space-y-1.5">
        {opcoes.map((o, i) => (
          <li key={`${i}-${o}`} className="flex items-center gap-1.5">
            <input
              defaultValue={o}
              className={inputCls}
              aria-label={`Opção ${i + 1}`}
              onBlur={(e) => {
                const texto = e.target.value.trim();
                if (texto && texto !== o && !opcoes.includes(texto)) onRenomear(o, texto);
                else e.target.value = o;
              }}
            />
            <button type="button" className={btnPequeno} onClick={() => mover(i, -1)} disabled={i === 0} aria-label="Subir opção">
              ↑
            </button>
            <button
              type="button"
              className={btnPequeno}
              onClick={() => mover(i, 1)}
              disabled={i === opcoes.length - 1}
              aria-label="Descer opção"
            >
              ↓
            </button>
            <button type="button" className={btnPequenoPerigo} onClick={() => onRemover(o)} aria-label={`Remover ${o}`}>
              ✕
            </button>
          </li>
        ))}
        {opcoes.length === 0 && <li className="text-sm text-slate-500">Nenhuma opção ainda.</li>}
      </ul>
      <form onSubmit={adicionar} className="flex gap-2">
        <input className={inputCls} value={nova} onChange={(e) => setNova(e.target.value)} placeholder="Nova opção (ex.: Outro)" />
        <button type="submit" className={btnPequeno} disabled={!nova.trim()}>
          + Adicionar
        </button>
      </form>
    </div>
  );
}

/** Por resposta, o que vira obrigatório: foto e/ou comentário. */
function ExigenciasPorResposta({
  respostas,
  exige,
  onSalvar,
}: {
  respostas: string[];
  exige: Exige;
  onSalvar: (exige: Exige) => void;
}) {
  function alternar(resposta: string, c: Complemento) {
    const lista = exige[resposta] ?? [];
    const proxima = lista.includes(c) ? lista.filter((x) => x !== c) : [...lista, c];
    const resto: Exige = Object.fromEntries(Object.entries(exige).filter(([chave]) => chave !== resposta));
    onSalvar(proxima.length ? { ...resto, [resposta]: proxima } : resto);
  }

  return (
    <ul className="space-y-1.5">
      {respostas.map((r) => (
        <li
          key={r}
          className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2"
        >
          <span className="text-sm text-slate-700">
            Se for <b>{rotuloResposta(r)}</b>, exigir:
          </span>
          <span className="flex gap-1.5">
            {COMPLEMENTOS.map((c) => {
              const marcado = (exige[r] ?? []).includes(c.valor);
              return (
                <button
                  key={c.valor}
                  type="button"
                  aria-pressed={marcado}
                  onClick={() => alternar(r, c.valor)}
                  className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                    marcado
                      ? "border-brand-500 bg-brand-600 text-white"
                      : "border-slate-300 bg-white text-slate-600 hover:border-brand-300"
                  }`}
                >
                  {ICONE[c.valor]} {c.rotulo}
                </button>
              );
            })}
          </span>
        </li>
      ))}
    </ul>
  );
}

/** Condicionais da pergunta: "se responder X, mostrar Y". */
function Condicionais({
  respostas,
  dependencias,
  alvos,
  onAdicionar,
  onRemover,
}: {
  respostas: string[];
  dependencias: Dependencia[];
  alvos: AlvoCondicional[];
  onAdicionar: (gatilho: string, alvo: AlvoCondicional) => void;
  onRemover: (dependencia: Dependencia) => void;
}) {
  const [gatilho, setGatilho] = useState("");
  const [alvoChave, setAlvoChave] = useState("");
  const chave = (a: { tipo: string; id: string }) => `${a.tipo}:${a.id}`;
  const nomeDoAlvo = (d: Dependencia) =>
    alvos.find((a) => a.id === (d.filho_pergunta_id ?? d.filho_secao_id))?.rotulo ?? "(removido)";

  return (
    <div className="space-y-2">
      {dependencias.length > 0 && (
        <ul className="space-y-1.5">
          {dependencias.map((d) => (
            <li
              key={d.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
            >
              <span className="min-w-0">
                Se for <b>{rotuloResposta(d.gatilho)}</b> → mostra {d.filho_secao_id ? "a seção " : ""}
                <b>{nomeDoAlvo(d)}</b>
              </span>
              <button type="button" className={btnPequenoPerigo} onClick={() => onRemover(d)}>
                Remover
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="grid gap-2 sm:grid-cols-[11rem_1fr_auto]">
        <select className={inputCls} value={gatilho} onChange={(e) => setGatilho(e.target.value)} aria-label="Se a resposta for">
          <option value="">Se a resposta for…</option>
          {respostas.map((r) => (
            <option key={r} value={r}>
              {rotuloResposta(r)}
            </option>
          ))}
        </select>
        <select className={inputCls} value={alvoChave} onChange={(e) => setAlvoChave(e.target.value)} aria-label="Mostrar">
          <option value="">…mostrar</option>
          {alvos.map((a) => (
            <option key={chave(a)} value={chave(a)}>
              {a.tipo === "secao" ? "Seção: " : "Pergunta: "}
              {a.rotulo}
            </option>
          ))}
        </select>
        <button
          type="button"
          className={btnPequeno}
          disabled={!gatilho || !alvoChave}
          onClick={() => {
            const alvo = alvos.find((a) => chave(a) === alvoChave);
            if (!alvo) return;
            onAdicionar(gatilho, alvo);
            setGatilho("");
            setAlvoChave("");
          }}
        >
          + Adicionar
        </button>
      </div>
    </div>
  );
}
