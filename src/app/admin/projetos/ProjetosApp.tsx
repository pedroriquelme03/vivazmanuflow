"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { validarCriacaoProjeto } from "@/lib/projeto-regras";
import type { Tables } from "@/lib/database.types";

type Projeto = Tables<"projetos">;
type Prop = Tables<"propriedades">;
type Membro = { projeto_id: string; usuario_id: string };
type Pessoa = { id: string; nome: string; role: string };

const inputCls =
  "rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30";

export function ProjetosApp({
  projetos,
  propriedades,
  membros,
  equipe,
}: {
  projetos: Projeto[];
  propriedades: Prop[];
  membros: Membro[];
  equipe: Pessoa[];
}) {
  const supabase = createClient();
  const router = useRouter();
  const [nome, setNome] = useState("");
  const [descricao, setDescricao] = useState("");
  const [propId, setPropId] = useState("");
  const [novosMembros, setNovosMembros] = useState<string[]>([]);
  const [erroNovo, setErroNovo] = useState<string | null>(null);
  const [erroEdicao, setErroEdicao] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [editMembros, setEditMembros] = useState<string[]>([]);
  const [membrosLocais, setMembrosLocais] = useState<Membro[]>(membros);
  const [salvandoPessoas, setSalvandoPessoas] = useState(false);

  useEffect(() => {
    setMembrosLocais(membros);
  }, [membros]);

  const nomeProp = (id: string | null) =>
    id ? propriedades.find((p) => p.id === id)?.nome ?? "?" : "Todos os locais";

  const membrosPorProjeto = useMemo(() => {
    const mapa: Record<string, string[]> = {};
    for (const m of membrosLocais) {
      mapa[m.projeto_id] = [...(mapa[m.projeto_id] ?? []), m.usuario_id];
    }
    return mapa;
  }, [membrosLocais]);

  const nomesEquipe = useMemo(() => {
    const mapa: Record<string, string> = {};
    for (const p of equipe) mapa[p.id] = p.nome;
    return mapa;
  }, [equipe]);

  function idsAtivos(ids: string[]) {
    const permitidos = new Set(equipe.map((p) => p.id));
    return [...new Set(ids.filter((id) => permitidos.has(id)))];
  }

  function toggleLista(atual: string[], id: string) {
    return atual.includes(id) ? atual.filter((x) => x !== id) : [...atual, id];
  }

  async function adicionar() {
    setErroNovo(null);
    const pessoas = idsAtivos(novosMembros);
    const msg = validarCriacaoProjeto(nome, pessoas);
    if (msg) return setErroNovo(msg);
    setSalvando(true);
    const base = {
      p_nome: nome.trim(),
      p_descricao: descricao.trim() || null,
      p_propriedade_id: propId || null,
    };
    const { data: criado, error } = await supabase.rpc("admin_criar_projeto", {
      ...base,
      p_membros: pessoas,
    });
    if (error) {
      const { data: idUm, error: erroUm } = await supabase.rpc(
        "admin_criar_projeto",
        { ...base, p_membros: [pessoas[0]] },
      );
      if (erroUm || !idUm) {
        setSalvando(false);
        return setErroNovo(error.message);
      }
      const { error: erroMembros } = await supabase.rpc(
        "admin_definir_membros_projeto",
        { p_projeto_id: idUm, p_membros: pessoas },
      );
      if (erroMembros) {
        setSalvando(false);
        return setErroNovo(erroMembros.message);
      }
    } else if (!criado) {
      setSalvando(false);
      return setErroNovo("Não foi possível criar o projeto.");
    }
    setNome("");
    setDescricao("");
    setPropId("");
    setNovosMembros([]);
    setSalvando(false);
    router.refresh();
  }

  async function toggle(p: Projeto) {
    await supabase.from("projetos").update({ ativo: !p.ativo }).eq("id", p.id);
    router.refresh();
  }

  async function renomear(p: Projeto) {
    const novo = window.prompt("Novo nome do projeto:", p.nome);
    if (!novo?.trim()) return;
    await supabase.from("projetos").update({ nome: novo.trim() }).eq("id", p.id);
    router.refresh();
  }

  async function excluir(p: Projeto) {
    if (
      !window.confirm(
        `Excluir o projeto “${p.nome}”? As demandas dele voltam para a fila normal.`,
      )
    ) {
      return;
    }
    const { error } = await supabase.from("projetos").delete().eq("id", p.id);
    if (error) {
      setErroEdicao(error.message);
      return;
    }
    router.refresh();
  }

  async function salvarMembros(projetoId: string) {
    setErroEdicao(null);
    const pessoas = idsAtivos(editMembros);
    const msg = validarCriacaoProjeto("ok", pessoas);
    if (msg) return setErroEdicao(msg);
    setSalvandoPessoas(true);

    const { error: rpcErro } = await supabase.rpc(
      "admin_definir_membros_projeto",
      {
        p_projeto_id: projetoId,
        p_membros: pessoas,
      },
    );

    if (rpcErro) {
      const { error: delErro } = await supabase
        .from("projeto_membros")
        .delete()
        .eq("projeto_id", projetoId);
      if (!delErro) {
        const { error: insErro } = await supabase.from("projeto_membros").insert(
          pessoas.map((usuario_id) => ({
            projeto_id: projetoId,
            usuario_id,
          })),
        );
        if (insErro) {
          setSalvandoPessoas(false);
          return setErroEdicao(
            rpcErro.message.includes("schema cache") || rpcErro.code === "42883"
              ? "Rode o SQL supabase/migrations/20260915120000_colab_minhas_e_membros_projeto.sql no Supabase e tente de novo."
              : insErro.message || rpcErro.message,
          );
        }
      } else {
        setSalvandoPessoas(false);
        return setErroEdicao(
          rpcErro.message.includes("schema cache") || rpcErro.code === "42883"
            ? "Rode o SQL supabase/migrations/20260915120000_colab_minhas_e_membros_projeto.sql no Supabase e tente de novo."
            : rpcErro.message,
        );
      }
    }

    setMembrosLocais((atual) => [
      ...atual.filter((m) => m.projeto_id !== projetoId),
      ...pessoas.map((usuario_id) => ({
        projeto_id: projetoId,
        usuario_id,
      })),
    ]);
    setSalvandoPessoas(false);
    setEditandoId(null);
    router.refresh();
  }

  return (
    <div className="mx-auto w-full max-w-4xl flex-1 px-4 py-6">
      <h1 className="text-xl font-bold">Projetos</h1>
      <p className="mt-0.5 text-sm text-slate-500">
        Demandas de um projeto só aparecem para as pessoas marcadas aqui e para
        o administrador. Sem projeto, a demanda segue na fila normal.
      </p>

      <div className="mt-5 rounded-xl border border-slate-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-slate-800">Novo projeto</h2>
        <div className="mt-3 grid gap-2">
          <input
            className={inputCls}
            placeholder="Nome do projeto"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
          />
          <input
            className={inputCls}
            placeholder="Descrição (opcional)"
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
          />
          <select
            className={inputCls}
            value={propId}
            onChange={(e) => setPropId(e.target.value)}
          >
            <option value="">Todos os locais principais</option>
            {propriedades.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nome}
              </option>
            ))}
          </select>
          <p className="text-xs font-medium text-slate-600">
            Quem faz parte <span className="text-red-500">*</span>
          </p>
          <ul className="max-h-48 overflow-y-auto rounded-lg border border-slate-200 p-2">
            {equipe.length === 0 ? (
              <li className="px-1 py-2 text-xs text-slate-400">
                Nenhum colaborador ou líder ativo.
              </li>
            ) : (
              equipe.map((p) => (
                <li key={p.id}>
                  <label className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-slate-50">
                    <input
                      type="checkbox"
                      checked={novosMembros.includes(p.id)}
                      onChange={() =>
                        setNovosMembros(toggleLista(novosMembros, p.id))
                      }
                    />
                    <span>
                      {p.nome}{" "}
                      <span className="text-xs text-slate-400">{p.role}</span>
                    </span>
                  </label>
                </li>
              ))
            )}
          </ul>
          <button
            type="button"
            onClick={adicionar}
            disabled={salvando || novosMembros.length < 1 || !nome.trim()}
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:opacity-60"
          >
            {salvando ? "Salvando…" : "Cadastrar projeto"}
          </button>
        </div>
        {erroNovo && (
          <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {erroNovo}
          </p>
        )}
      </div>

      <div className="mt-5 rounded-xl border border-slate-200 bg-white p-4">
        <h2 className="mb-2 text-sm font-semibold text-slate-800">
          Projetos cadastrados ({projetos.length})
        </h2>
        {projetos.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-400">
            Nenhum projeto ainda. Cadastre o primeiro acima.
          </p>
        ) : (
          <ul>
            {projetos.map((p) => {
              const ids = membrosPorProjeto[p.id] ?? [];
              return (
                <li
                  key={p.id}
                  className="border-t border-slate-100 py-2.5 first:border-t-0"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className={p.ativo ? "" : "opacity-50"}>
                      <p className="text-sm font-medium text-slate-800">
                        {p.nome}
                      </p>
                      <p className="text-xs text-slate-400">
                        {nomeProp(p.propriedade_id)}
                        {" · "}
                        {ids.length} pessoa(s)
                      </p>
                      <p className="mt-0.5 text-xs text-slate-500">
                        {ids.map((id) => nomesEquipe[id] ?? "?").join(", ") ||
                          "Sem membros"}
                      </p>
                      {p.descricao && (
                        <p className="mt-0.5 text-xs text-slate-500">
                          {p.descricao}
                        </p>
                      )}
                    </div>
                    <div className="flex shrink-0 flex-wrap justify-end gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          setEditandoId(editandoId === p.id ? null : p.id);
                          setEditMembros(idsAtivos(ids));
                          setErroEdicao(null);
                        }}
                        className="rounded-md px-2 py-1 text-xs text-slate-500 hover:bg-slate-100"
                      >
                        Pessoas
                      </button>
                      <button
                        type="button"
                        onClick={() => renomear(p)}
                        className="rounded-md px-2 py-1 text-xs text-slate-500 hover:bg-slate-100"
                      >
                        Renomear
                      </button>
                      <button
                        type="button"
                        onClick={() => toggle(p)}
                        className={`rounded-md px-2 py-1 text-xs font-medium ${
                          p.ativo
                            ? "text-slate-500 hover:bg-slate-100"
                            : "text-emerald-600 hover:bg-emerald-50"
                        }`}
                      >
                        {p.ativo ? "Desativar" : "Reativar"}
                      </button>
                      <button
                        type="button"
                        onClick={() => excluir(p)}
                        className="rounded-md px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50"
                      >
                        Excluir
                      </button>
                    </div>
                  </div>
                  {editandoId === p.id && (
                    <div className="mt-2 rounded-lg border border-slate-200 bg-slate-50 p-2">
                      <ul className="max-h-40 overflow-y-auto">
                        {equipe.map((pessoa) => (
                          <li key={pessoa.id}>
                            <label className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1 text-sm">
                              <input
                                type="checkbox"
                                checked={editMembros.includes(pessoa.id)}
                                onChange={() =>
                                  setEditMembros(
                                    toggleLista(editMembros, pessoa.id),
                                  )
                                }
                              />
                              {pessoa.nome}
                            </label>
                          </li>
                        ))}
                      </ul>
                      <button
                        type="button"
                        onClick={() => salvarMembros(p.id)}
                        disabled={
                          salvandoPessoas || idsAtivos(editMembros).length < 1
                        }
                        className="mt-2 rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
                      >
                        {salvandoPessoas ? "Salvando…" : "Salvar pessoas"}
                      </button>
                      {erroEdicao && (
                        <p className="mt-2 rounded-lg bg-red-50 px-2 py-1.5 text-xs text-red-700">
                          {erroEdicao}
                        </p>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
