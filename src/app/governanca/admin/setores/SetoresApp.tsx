"use client";

import { useMemo, useState } from "react";
import {
  limparNome,
  nomeRepetido,
  setoresPorPropriedade,
  type PropriedadeRef,
  type SetorChecklist,
} from "@/lib/checklist-setores";
import { idPrimeiraPropriedadeAtiva } from "@/lib/propriedade-opcoes";
import { SelectPropriedade } from "../../Seletores";
import { BotaoAtivo, Erro, Titulo, btnPrimario, btnSecundario, cardCls, inputCls, labelCls } from "../../ui";
import { useGravar } from "../../useGravar";

type SetorComUso = SetorChecklist & { checklists: number; colaboradores: number };
type MembroEquipe = { id: string; nome: string; papel: string };
type Acesso = { usuario_id: string; setor_id: string };

const NINGUEM = new Set<string>();
const jaExiste = (nome: string) => `Já existe o setor "${nome}" nessa propriedade.`;

export function SetoresApp({
  setores,
  propriedades,
  equipe,
  acessos: acessosIniciais,
}: {
  setores: SetorComUso[];
  propriedades: PropriedadeRef[];
  equipe: MembroEquipe[];
  acessos: Acesso[];
}) {
  const { supabase, erro, setErro, gravar } = useGravar();
  const [propriedadeId, setPropriedadeId] = useState(idPrimeiraPropriedadeAtiva(propriedades));
  const [nome, setNome] = useState("");
  const [salvando, setSalvando] = useState(false);
  // Marcar quem acessa é um clique por pessoa: atualiza aqui, sem recarregar a página.
  // Quando a página recarrega por outro motivo, volta a valer o que veio do banco.
  const [acessos, setAcessos] = useState(acessosIniciais);
  const [acessosDoBanco, setAcessosDoBanco] = useState(acessosIniciais);
  if (acessosDoBanco !== acessosIniciais) {
    setAcessosDoBanco(acessosIniciais);
    setAcessos(acessosIniciais);
  }

  const acessoPorSetor = useMemo(() => {
    const mapa = new Map<string, Set<string>>();
    for (const a of acessos) mapa.set(a.setor_id, (mapa.get(a.setor_id) ?? new Set()).add(a.usuario_id));
    return mapa;
  }, [acessos]);
  // Propriedade desativada só aparece se ainda tiver setores.
  const grupos = useMemo(
    () => setoresPorPropriedade(setores, propriedades, true).filter((g) => g.propriedade.ativo || g.setores.length),
    [setores, propriedades],
  );

  const doMesmoLocal = (propId: string) => setores.filter((s) => s.propriedade_id === propId);

  async function adicionar(e: React.FormEvent) {
    e.preventDefault();
    const limpo = limparNome(nome);
    if (!limpo || !propriedadeId) return;
    if (nomeRepetido(limpo, doMesmoLocal(propriedadeId))) return setErro(jaExiste(limpo));
    setSalvando(true);
    const ok = await gravar(supabase.from("gov_setores").insert({ propriedade_id: propriedadeId, nome: limpo }), {
      "23505": jaExiste(limpo),
    });
    setSalvando(false);
    if (ok) setNome("");
  }

  async function renomear(setor: SetorChecklist, novo: string) {
    const limpo = limparNome(novo);
    if (!limpo || limpo === setor.nome) return true;
    if (nomeRepetido(limpo, doMesmoLocal(setor.propriedade_id), setor.id)) {
      setErro(jaExiste(limpo));
      return false;
    }
    return gravar(supabase.from("gov_setores").update({ nome: limpo }).eq("id", setor.id), { "23505": jaExiste(limpo) });
  }

  function remover(setor: SetorChecklist) {
    if (!confirm(`Remover o setor "${setor.nome}"?`)) return;
    gravar(supabase.from("gov_setores").delete().eq("id", setor.id), {
      "23503": `"${setor.nome}" tem checklists ou colaboradores. Marque como inativo em vez de remover.`,
    });
  }

  async function alternarAcesso(usuarioId: string, setorId: string, temAcesso: boolean) {
    const ok = await gravar(
      temAcesso
        ? supabase.from("gov_usuario_setores").delete().eq("usuario_id", usuarioId).eq("setor_id", setorId)
        : supabase.from("gov_usuario_setores").insert({ usuario_id: usuarioId, setor_id: setorId }),
      {},
      { recarregar: false },
    );
    if (!ok) return;
    setAcessos((atual) =>
      temAcesso
        ? atual.filter((a) => !(a.usuario_id === usuarioId && a.setor_id === setorId))
        : [...atual, { usuario_id: usuarioId, setor_id: setorId }],
    );
  }

  return (
    <>
      <Titulo
        titulo="Setores"
        subtitulo="Cada propriedade tem seus setores. Checklists e colaboradores ficam dentro deles, e cada líder ou aplicador vê só os setores marcados para ele."
      />

      <form onSubmit={adicionar} className={`${cardCls} mb-6 grid gap-3 sm:grid-cols-[14rem_1fr_auto] sm:items-end`}>
        <label className="block">
          <span className={labelCls}>Propriedade</span>
          <SelectPropriedade value={propriedadeId} onChange={setPropriedadeId} propriedades={propriedades} />
        </label>
        <label className="block">
          <span className={labelCls}>Nome do setor</span>
          <input className={inputCls} value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex.: Governança" />
        </label>
        <button type="submit" className={btnPrimario} disabled={salvando || !nome.trim()}>
          + Adicionar
        </button>
      </form>

      <Erro texto={erro} />

      {grupos.map((g) => (
        <section key={g.propriedade.id} className="mb-8">
          <h2 className="mb-3 text-sm font-bold text-slate-700">
            {g.propriedade.nome} · {g.setores.length} {g.setores.length === 1 ? "setor" : "setores"}
          </h2>
          {g.setores.length === 0 && <p className="text-sm text-slate-500">Nenhum setor cadastrado.</p>}
          <div className="space-y-3">
            {g.setores.map((s) => (
              <CartaoSetor
                key={s.id}
                setor={s}
                equipe={equipe}
                comAcesso={acessoPorSetor.get(s.id) ?? NINGUEM}
                onRenomear={(novo) => renomear(s, novo)}
                onAtivo={() => gravar(supabase.from("gov_setores").update({ ativo: !s.ativo }).eq("id", s.id))}
                onRemover={() => remover(s)}
                onAcesso={(usuarioId, tem) => alternarAcesso(usuarioId, s.id, tem)}
              />
            ))}
          </div>
        </section>
      ))}
    </>
  );
}

function CartaoSetor({
  setor,
  equipe,
  comAcesso,
  onRenomear,
  onAtivo,
  onRemover,
  onAcesso,
}: {
  setor: SetorComUso;
  equipe: MembroEquipe[];
  comAcesso: Set<string>;
  onRenomear: (nome: string) => Promise<boolean>;
  onAtivo: () => void;
  onRemover: () => void;
  onAcesso: (usuarioId: string, temAcesso: boolean) => void;
}) {
  const [editando, setEditando] = useState(false);
  const [nome, setNome] = useState(setor.nome);
  const emUso = setor.checklists + setor.colaboradores > 0;

  async function salvarNome(e: React.FormEvent) {
    e.preventDefault();
    if (await onRenomear(nome)) setEditando(false);
  }

  return (
    <div className={`${cardCls} ${setor.ativo ? "" : "opacity-60"}`}>
      {editando ? (
        <form onSubmit={salvarNome} className="flex gap-2">
          <input className={inputCls} value={nome} onChange={(e) => setNome(e.target.value)} autoFocus aria-label="Nome do setor" />
          <button type="submit" className={`${btnPrimario} py-2`}>
            Salvar
          </button>
          <button
            type="button"
            className={`${btnSecundario} py-2`}
            onClick={() => {
              setNome(setor.nome);
              setEditando(false);
            }}
          >
            Cancelar
          </button>
        </form>
      ) : (
        <div className="flex flex-wrap items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="font-semibold">{setor.nome}</p>
            <p className="text-xs text-slate-500">
              {setor.checklists} {setor.checklists === 1 ? "checklist" : "checklists"} · {setor.colaboradores}{" "}
              {setor.colaboradores === 1 ? "colaborador" : "colaboradores"}
            </p>
          </div>
          <BotaoAtivo ativo={setor.ativo} onClick={onAtivo} />
          <button type="button" onClick={() => setEditando(true)} className="text-xs text-slate-400 hover:text-brand-600">
            Renomear
          </button>
          <button
            type="button"
            onClick={onRemover}
            disabled={emUso}
            title={emUso ? "Tem checklists ou colaboradores: marque como inativo." : undefined}
            className="text-xs text-slate-400 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Remover
          </button>
        </div>
      )}

      <div className="mt-3 border-t border-slate-100 pt-3">
        <p className="mb-2 text-xs font-medium text-slate-500">Quem acessa este setor</p>
        {equipe.length === 0 ? (
          <p className="text-xs text-slate-400">
            Ninguém com Checklist marcado em Cadastros &gt; Equipe (o administrador já vê todos os setores).
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {equipe.map((u) => {
              const tem = comAcesso.has(u.id);
              return (
                <button
                  key={u.id}
                  type="button"
                  aria-pressed={tem}
                  onClick={() => onAcesso(u.id, tem)}
                  className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                    tem
                      ? "border-brand-400 bg-brand-50 text-brand-700"
                      : "border-slate-200 bg-white text-slate-500 hover:border-brand-300"
                  }`}
                >
                  {tem ? "✓ " : ""}
                  {u.nome} · {u.papel}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
