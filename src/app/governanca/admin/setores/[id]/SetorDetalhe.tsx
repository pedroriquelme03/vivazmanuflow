"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Processo } from "@/lib/governanca";
import {
  jaExisteSetor,
  limparNome,
  nomeRepetido,
  type PropriedadeRef,
  type SetorChecklist,
} from "@/lib/checklist-setores";
import { normalizarBusca } from "@/lib/governanca";
import { useConfirmacao } from "@/components/Confirmacao";
import { LinhaChecklist } from "../../processos/LinhaChecklist";
import {
  ChaveAtivo,
  Erro,
  btnPequeno,
  btnPequenoPerigo,
  btnPrimario,
  btnSecundario,
  cardCls,
  inputCls,
} from "../../../ui";
import { useGravar } from "../../../useGravar";

type MembroEquipe = { id: string; nome: string; papel: string };

/** Página do setor: checklists dele, quem acessa e os dados do setor. */
export function SetorDetalhe({
  setor,
  setores,
  propriedades,
  checklists,
  colaboradores,
  equipe,
  comAcesso: acessoInicial,
}: {
  setor: SetorChecklist;
  setores: SetorChecklist[];
  propriedades: PropriedadeRef[];
  checklists: (Processo & { perguntas: number })[];
  colaboradores: number;
  equipe: MembroEquipe[];
  comAcesso: string[];
}) {
  const router = useRouter();
  const escrita = useGravar();
  const { supabase, erro, setErro, gravar } = escrita;
  const [confirmar, janela] = useConfirmacao();
  const [editandoNome, setEditandoNome] = useState(false);
  const [nome, setNome] = useState(setor.nome);
  const emUso = checklists.length + colaboradores > 0;

  async function mudarAtivo(ativo: boolean) {
    if (
      !ativo &&
      !(await confirmar({
        titulo: `Desativar o setor ${setor.nome}?`,
        texto: "Os checklists dele somem da tela de preencher. Nada é apagado.",
        confirmar: "Desativar",
      }))
    ) {
      return;
    }
    gravar(supabase.from("gov_setores").update({ ativo }).eq("id", setor.id));
  }

  async function salvarNome(e: React.FormEvent) {
    e.preventDefault();
    const limpo = limparNome(nome);
    if (!limpo || limpo === setor.nome) return setEditandoNome(false);
    if (nomeRepetido(limpo, setores.filter((s) => s.propriedade_id === setor.propriedade_id), setor.id)) {
      return setErro(jaExisteSetor(limpo));
    }
    if (await gravar(supabase.from("gov_setores").update({ nome: limpo }).eq("id", setor.id), { "23505": jaExisteSetor(limpo) })) {
      setEditandoNome(false);
    }
  }

  async function excluir() {
    const ok = await confirmar({
      titulo: `Excluir o setor ${setor.nome}?`,
      texto: "Só dá para excluir setor sem checklists e sem colaboradores.",
      confirmar: "Excluir",
      perigo: true,
    });
    if (!ok) return;
    const apagou = await gravar(
      supabase.from("gov_setores").delete().eq("id", setor.id),
      { "23503": `${setor.nome} tem checklists ou colaboradores. Desative em vez de excluir.` },
      { recarregar: false },
    );
    if (apagou) router.replace("/governanca/admin/setores");
  }

  return (
    <>
      {janela}
      <Link href="/governanca/admin/setores" className="mb-3 inline-block text-sm text-slate-500 hover:text-slate-800">
        ← Setores
      </Link>

      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            {propriedades.find((p) => p.id === setor.propriedade_id)?.nome}
          </p>
          {editandoNome ? (
            <form onSubmit={salvarNome} className="mt-1 flex flex-wrap gap-2">
              <input className={inputCls} value={nome} onChange={(e) => setNome(e.target.value)} autoFocus aria-label="Nome do setor" />
              <button type="submit" className={`${btnPrimario} py-2`}>
                Salvar
              </button>
              <button
                type="button"
                className={`${btnSecundario} py-2`}
                onClick={() => {
                  setNome(setor.nome);
                  setEditandoNome(false);
                }}
              >
                Cancelar
              </button>
            </form>
          ) : (
            <h1 className="text-2xl font-bold text-slate-800">{setor.nome}</h1>
          )}
        </div>
        <div className="flex items-center gap-2">
          <ChaveAtivo ativo={setor.ativo} onChange={mudarAtivo} rotulo={setor.nome} />
          {!editandoNome && (
            <button type="button" className={btnPequeno} onClick={() => setEditandoNome(true)}>
              Renomear
            </button>
          )}
        </div>
      </div>

      <Erro texto={erro} />

      <section className="mb-8">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-base font-semibold text-slate-800">
            Checklists · {checklists.length}
          </h2>
          <Link href={`/governanca/admin/processos?novo=1&setor=${setor.id}`} className={btnPequeno}>
            + Criar checklist neste setor
          </Link>
        </div>
        <div className="space-y-2">
          {checklists.map((p) => (
            <LinhaChecklist
              key={p.id}
              processo={p}
              setoresParaMover={setores}
              propriedades={propriedades}
              escrita={escrita}
              confirmar={confirmar}
            />
          ))}
          {checklists.length === 0 && <p className="text-sm text-slate-500">Nenhum checklist neste setor.</p>}
        </div>
      </section>

      <QuemAcessa setorId={setor.id} equipe={equipe} acessoInicial={acessoInicial} escrita={escrita} />

      <section className={`${cardCls} mb-8`}>
        <h2 className="text-base font-semibold text-slate-800">Colaboradores · {colaboradores}</h2>
        <p className="mt-0.5 text-sm text-slate-500">Quem é avaliado nos checklists deste setor.</p>
        <Link href={`/governanca/admin/colaboradores?setor=${setor.id}`} className={`${btnPequeno} mt-3`}>
          Ver colaboradores do setor
        </Link>
      </section>

      <section className={`${cardCls} border-red-100`}>
        <h2 className="text-sm font-semibold text-slate-800">Excluir setor</h2>
        <p className="mt-1 text-sm text-slate-500">
          {emUso
            ? "Este setor tem checklists ou colaboradores: mova-os ou desative o setor."
            : "O setor está vazio e pode ser excluído."}
        </p>
        <button type="button" className={`${btnPequenoPerigo} mt-3`} onClick={excluir} disabled={emUso}>
          Excluir {setor.nome}
        </button>
      </section>
    </>
  );
}

/**
 * Quem acessa o setor, com busca: aguenta muitos líderes. Cada clique grava na
 * hora e atualiza só esta lista.
 */
function QuemAcessa({
  setorId,
  equipe,
  acessoInicial,
  escrita: { supabase, gravar },
}: {
  setorId: string;
  equipe: MembroEquipe[];
  acessoInicial: string[];
  escrita: ReturnType<typeof useGravar>;
}) {
  const [comAcesso, setComAcesso] = useState(() => new Set(acessoInicial));
  const [busca, setBusca] = useState("");
  const [mostrar, setMostrar] = useState<"todos" | "com" | "sem">("todos");

  const lista = useMemo(() => {
    const q = normalizarBusca(busca);
    return equipe
      .filter((u) => !q || normalizarBusca(`${u.nome} ${u.papel}`).includes(q))
      .filter((u) => mostrar === "todos" || (mostrar === "com") === comAcesso.has(u.id))
      .sort((a, b) => Number(comAcesso.has(b.id)) - Number(comAcesso.has(a.id)) || a.nome.localeCompare(b.nome, "pt-BR"));
  }, [equipe, busca, mostrar, comAcesso]);

  async function alternar(usuarioId: string) {
    const tem = comAcesso.has(usuarioId);
    const ok = await gravar(
      tem
        ? supabase.from("gov_usuario_setores").delete().eq("usuario_id", usuarioId).eq("setor_id", setorId)
        : supabase.from("gov_usuario_setores").insert({ usuario_id: usuarioId, setor_id: setorId }),
      { "23505": "Essa pessoa já tem acesso." },
      { recarregar: false },
    );
    if (!ok) return;
    setComAcesso((atual) => {
      const novo = new Set(atual);
      if (tem) novo.delete(usuarioId);
      else novo.add(usuarioId);
      return novo;
    });
  }

  return (
    <section className={`${cardCls} mb-8`}>
      <h2 className="text-base font-semibold text-slate-800">
        Quem acessa · {comAcesso.size} de {equipe.length}
      </h2>
      <p className="mt-0.5 text-sm text-slate-500">
        Líderes e aplicadores marcados aqui veem e usam este setor. O administrador já vê todos.
      </p>

      {equipe.length === 0 ? (
        <p className="mt-3 text-sm text-slate-500">Ninguém com Checklist marcado em Cadastros &gt; Equipe.</p>
      ) : (
        <>
          <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_auto]">
            <input
              className={inputCls}
              type="search"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar pessoa…"
            />
            <div className="inline-flex overflow-hidden rounded-lg border border-slate-300 text-xs font-semibold">
              {(
                [
                  ["todos", "Todos"],
                  ["com", "Com acesso"],
                  ["sem", "Sem acesso"],
                ] as const
              ).map(([valor, rotulo]) => (
                <button
                  key={valor}
                  type="button"
                  aria-pressed={mostrar === valor}
                  onClick={() => setMostrar(valor)}
                  className={`px-3 py-2 ${mostrar === valor ? "bg-brand-600 text-white" : "bg-white text-slate-600 hover:bg-slate-50"}`}
                >
                  {rotulo}
                </button>
              ))}
            </div>
          </div>
          <ul className="mt-3 max-h-96 divide-y divide-slate-100 overflow-y-auto rounded-xl border border-slate-200">
            {lista.map((u) => (
              <li key={u.id}>
                <label className="flex items-center gap-3 px-3 py-2.5 hover:bg-slate-50">
                  <input type="checkbox" checked={comAcesso.has(u.id)} onChange={() => alternar(u.id)} />
                  <span className="min-w-0 flex-1 truncate text-sm font-medium text-slate-800">{u.nome}</span>
                  <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
                    {u.papel}
                  </span>
                </label>
              </li>
            ))}
            {lista.length === 0 && <li className="px-3 py-3 text-sm text-slate-500">Ninguém encontrado.</li>}
          </ul>
        </>
      )}
    </section>
  );
}
