"use client";

import { useCallback, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setoresPorPropriedade, type PropriedadeRef, type SetorChecklist } from "@/lib/checklist-setores";
import {
  PERFIS_EQUIPE,
  outrosAmbientes,
  podeMexerNoAcesso,
  podeMudarLogin,
  podeMudarPerfil,
  rotuloPapelEquipe,
  type EdicaoMembro,
  type MembroEquipe,
  type NovoMembro,
  type PerfilEquipeChecklist,
  type QuemEdita,
} from "@/lib/checklist-equipe";
import { ListaCadastroControles, useListaCadastro } from "@/components/ListaCadastroControles";
import { BtnAdd, CampoModal, CardCadastro, ErroMsg, JanelaCadastro, OkMsg } from "@/components/CadastroUi";
import { SelectSetor } from "../../Seletores";
import { Erro, Titulo, Voltar, inputCls } from "../../ui";
import { criarMembroChecklist, salvarMembroChecklist, type ResultadoCadastro } from "./actions";
import { abrirRascunhoEmail, empresaDosAcessos, rascunhoAcessoOutlook } from "@/lib/email-acesso";

const NOVO_VAZIO: NovoMembro = { nome: "", email: "", senha: "", perfil: "camareira", setores: [] };

/**
 * Equipe do checklist, no mesmo formato de Cadastros > Equipe da Manutenção e da
 * TI: cadastro em cima, lista com pesquisa e filtros, e Editar abre a janela.
 */
export function EquipeChecklist({
  euId,
  ehAdmin,
  equipe,
  faltaSql,
  setores,
  meusSetores,
  propriedades,
}: {
  euId: string;
  ehAdmin: boolean;
  equipe: MembroEquipe[];
  faltaSql: boolean;
  setores: SetorChecklist[];
  /** Setores de quem está cadastrando: os únicos que ele pode dar. */
  meusSetores: SetorChecklist[];
  propriedades: PropriedadeRef[];
}) {
  const router = useRouter();
  const setoresAtivos = meusSetores.filter((s) => s.ativo);
  const [novo, setNovo] = useState<NovoMembro>({
    ...NOVO_VAZIO,
    setores: setoresAtivos.length === 1 ? [setoresAtivos[0].id] : [],
  });
  const [erro, setErro] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  // E-mail de acesso pronto para abrir no Outlook, igual ao cadastro da Manutenção e da TI.
  const [conviteHref, setConviteHref] = useState<string | null>(null);
  const [enviando, iniciar] = useTransition();
  const [editando, setEditando] = useState<MembroEquipe | null>(null);
  const [filtroPerfil, setFiltroPerfil] = useState("");
  const [filtroSetor, setFiltroSetor] = useState("");
  const mudar = <K extends keyof NovoMembro>(campo: K, valor: NovoMembro[K]) => setNovo((d) => ({ ...d, [campo]: valor }));

  const getTexto = useCallback((m: MembroEquipe) => `${m.nome} ${m.email ?? ""} ${rotuloPapelEquipe(m.papel)}`, []);
  const getAtivo = useCallback((m: MembroEquipe) => m.ativo, []);
  const filtro = useCallback(
    (m: MembroEquipe) =>
      (!filtroPerfil || m.papel === filtroPerfil) &&
      (!filtroSetor || m.papel === "admin" || m.setores.includes(filtroSetor)),
    [filtroPerfil, filtroSetor],
  );
  const lista = useListaCadastro(equipe, getTexto, { getAtivo, filtro, pageSizeInicial: 50 });

  function depois(resultado: ResultadoCadastro, limpar?: () => void) {
    if ("erro" in resultado) {
      setErro(resultado.erro);
      return false;
    }
    setErro(null);
    setOk(resultado.ok);
    limpar?.();
    router.refresh();
    return true;
  }

  function criar() {
    setOk(null);
    setConviteHref(null);
    const dados = novo;
    iniciar(async () => {
      const criou = depois(await criarMembroChecklist(dados), () => setNovo({ ...NOVO_VAZIO, setores: dados.setores }));
      if (!criou) return;
      // A empresa do e-mail sai das propriedades dos setores marcados (Vivaz, Aquamania...).
      const nomesPropriedades = setores
        .filter((s) => dados.setores.includes(s.id))
        .map((s) => propriedades.find((p) => p.id === s.propriedade_id)?.nome ?? "");
      setConviteHref(
        rascunhoAcessoOutlook({
          nome: dados.nome,
          email: dados.email,
          senha: dados.senha,
          papel: PERFIS_EQUIPE.find((p) => p.valor === dados.perfil)?.rotulo,
          sistema: "checklist",
          empresa: empresaDosAcessos(nomesPropriedades),
        }).href,
      );
    });
  }

  return (
    <>
      <Voltar href="/governanca/admin/cadastros">Cadastros</Voltar>
      <Titulo
        titulo="Equipe"
        subtitulo={
          ehAdmin
            ? "Quem entra no checklist com login. Aqui você cadastra gente só do Checklist; quem também usa a Manutenção ou a TI fica em Cadastros > Equipe de lá."
            : "Quem entra no checklist com login. Você cadastra gente só do Checklist e dá acesso aos seus setores."
        }
      />
      {faltaSql && (
        <Erro texto="Rode no Supabase o SQL supabase/migrations/20261112210000_checklist_equipe.sql para ver a equipe aqui." />
      )}

      <CardCadastro>
        <p className="mb-2 text-sm font-semibold text-slate-600">Novo membro do checklist</p>
        <p className="mb-3 text-xs text-slate-500">
          O login entra só no Checklist, nos setores marcados. Administrador só o administrador cria, em Cadastros &gt;
          Equipe.
        </p>
        <div className="grid gap-2 sm:grid-cols-2">
          <input className={inputCls} placeholder="Nome" value={novo.nome} onChange={(e) => mudar("nome", e.target.value)} />
          <input
            className={inputCls}
            placeholder="E-mail"
            type="email"
            inputMode="email"
            autoComplete="off"
            value={novo.email}
            onChange={(e) => mudar("email", e.target.value)}
          />
          <input
            className={inputCls}
            placeholder="Senha (mín. 6)"
            autoComplete="new-password"
            value={novo.senha}
            onChange={(e) => mudar("senha", e.target.value)}
          />
          <SelectPerfil valor={novo.perfil} onChange={(perfil) => mudar("perfil", perfil)} />
          <div className="grid gap-1 sm:col-span-2">
            <span className="text-xs font-medium text-slate-500">Setores que a pessoa usa</span>
            <EscolhaSetores
              setores={setoresAtivos}
              propriedades={propriedades}
              marcados={novo.setores}
              onChange={(ids) => mudar("setores", ids)}
            />
          </div>
          <div className="sm:col-span-2">
            <BtnAdd onClick={criar} rotulo={enviando ? "Criando…" : "Criar"} disabled={enviando || faltaSql} />
          </div>
        </div>
        <ErroMsg erro={editando ? null : erro} />
        <OkMsg texto={ok} />
        {ok && conviteHref && (
          <button
            type="button"
            onClick={() => abrirRascunhoEmail(conviteHref)}
            className="mt-2 cursor-pointer rounded-lg bg-emerald-700 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-800"
          >
            Abrir e-mail no Outlook
          </button>
        )}

        <ListaCadastroControles
          {...lista}
          placeholder="Pesquisar por nome ou e-mail…"
          marcado={Boolean(filtroPerfil || filtroSetor)}
          filtrosExtras={
            <>
              <select className={inputCls} value={filtroPerfil} onChange={(e) => setFiltroPerfil(e.target.value)}>
                <option value="">Todos os perfis</option>
                <option value="admin">Administrador</option>
                {PERFIS_EQUIPE.map((p) => (
                  <option key={p.valor} value={p.valor}>
                    {p.rotulo}
                  </option>
                ))}
              </select>
              <SelectSetor
                value={filtroSetor}
                onChange={setFiltroSetor}
                setores={meusSetores}
                propriedades={propriedades}
                vazio="Todos os setores"
              />
            </>
          }
        />

        <ul className="mt-2 divide-y divide-slate-100">
          {lista.itens.map((m) => (
            <MembroLinha
              key={m.id}
              membro={m}
              setores={setores}
              propriedades={propriedades}
              onEditar={
                podeMexerNoAcesso(m, euId)
                  ? () => {
                      setErro(null);
                      setEditando(m);
                    }
                  : undefined
              }
            />
          ))}
        </ul>
      </CardCadastro>

      {editando && (
        <ModalEditarMembro
          membro={editando}
          ehAdmin={ehAdmin}
          quem={{ ehAdmin, setores: meusSetores.map((s) => s.id) }}
          meusSetores={setoresAtivos}
          propriedades={propriedades}
          erro={erro}
          onFechar={() => setEditando(null)}
          onSalvar={(dados) =>
            new Promise<void>((pronto) =>
              iniciar(async () => {
                if (depois(await salvarMembroChecklist(dados))) setEditando(null);
                pronto();
              }),
            )
          }
          salvando={enviando}
        />
      )}
    </>
  );
}

const COR_PAPEL: Record<string, string> = {
  admin: "bg-violet-100 text-violet-700",
  lider: "bg-brand-100 text-brand-700",
  camareira: "bg-slate-100 text-slate-600",
};

const MAX_SETORES_VISIVEIS = 4;

/** Uma pessoa da equipe: inicial, nome, perfil, e-mail e os setores em etiquetas. */
function MembroLinha({
  membro: m,
  setores,
  propriedades,
  onEditar,
}: {
  membro: MembroEquipe;
  setores: SetorChecklist[];
  propriedades: PropriedadeRef[];
  onEditar?: () => void;
}) {
  const outros = outrosAmbientes(m.ambientes);
  const cor = COR_PAPEL[m.papel] ?? COR_PAPEL.camareira;
  const etiquetas = setoresPorPropriedade(
    setores.filter((s) => m.setores.includes(s.id)),
    propriedades,
  ).flatMap((g) => g.setores.map((s) => ({ id: s.id, nome: s.nome, propriedade: g.propriedade.nome })));
  const sobra = etiquetas.length - MAX_SETORES_VISIVEIS;

  return (
    <li className={`flex flex-col gap-3 py-3.5 sm:flex-row sm:items-center ${m.ativo ? "" : "opacity-60"}`}>
      <div className="flex min-w-0 flex-1 items-start gap-3">
        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold ${cor}`}>
          {iniciais(m.nome)}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="break-words font-semibold text-slate-800">{m.nome}</span>
            <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${cor}`}>{rotuloPapelEquipe(m.papel)}</span>
            {outros.length > 0 && (
              <span className="rounded-full bg-sky-50 px-2 py-0.5 text-[11px] font-semibold text-sky-700">
                + {outros.join(" e ")}
              </span>
            )}
            {!m.ativo && (
              <span className="rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-semibold text-red-700">Inativo</span>
            )}
          </div>
          {m.email && <p className="break-all text-xs text-slate-500">{m.email}</p>}
          <div className="mt-1.5 flex flex-wrap gap-1">
            {m.papel === "admin" ? (
              <span className="rounded-md bg-violet-50 px-2 py-0.5 text-[11px] font-medium text-violet-700">
                Todos os setores
              </span>
            ) : etiquetas.length === 0 ? (
              <span className="rounded-md bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700">
                Sem setor: não vê nenhum checklist
              </span>
            ) : (
              <>
                {etiquetas.slice(0, MAX_SETORES_VISIVEIS).map((s) => (
                  <span
                    key={s.id}
                    title={`${s.propriedade} · ${s.nome}`}
                    className="rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-medium text-slate-600"
                  >
                    {s.nome}
                  </span>
                ))}
                {sobra > 0 && (
                  <span
                    title={etiquetas.slice(MAX_SETORES_VISIVEIS).map((s) => `${s.propriedade} · ${s.nome}`).join("\n")}
                    className="rounded-md px-1.5 py-0.5 text-[11px] font-semibold text-slate-500"
                  >
                    +{sobra} setores
                  </span>
                )}
              </>
            )}
          </div>
        </div>
      </div>
      {onEditar && (
        <button
          type="button"
          onClick={onEditar}
          className="self-start rounded-lg bg-brand-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-brand-700 sm:self-center"
        >
          Editar
        </button>
      )}
    </li>
  );
}

function iniciais(nome: string) {
  // Só palavras que começam com letra: "Pedro (Admin)" vira "P", não "P(".
  const partes = nome.trim().split(/\s+/).filter((p) => /^\p{L}/u.test(p));
  return ((partes[0]?.[0] ?? "") + (partes.length > 1 ? partes[partes.length - 1][0] : "")).toUpperCase() || "?";
}

function ModalEditarMembro({
  membro,
  ehAdmin,
  quem,
  meusSetores,
  propriedades,
  erro,
  salvando,
  onFechar,
  onSalvar,
}: {
  membro: MembroEquipe;
  ehAdmin: boolean;
  quem: QuemEdita;
  meusSetores: SetorChecklist[];
  propriedades: PropriedadeRef[];
  erro: string | null;
  salvando: boolean;
  onFechar: () => void;
  onSalvar: (dados: EdicaoMembro) => Promise<void>;
}) {
  const mudaLogin = podeMudarLogin(membro, quem);
  const mudaPerfil = podeMudarPerfil(membro, quem);
  const [dados, setDados] = useState<EdicaoMembro>({
    id: membro.id,
    perfil: membro.papel === "lider" ? "lider" : "camareira",
    ativo: membro.ativo,
    senha: "",
    setores: membro.setores,
  });
  const outros = outrosAmbientes(membro.ambientes);

  return (
    <JanelaCadastro titulo="Editar membro" onFechar={onFechar}>
      <div className="mt-4 grid gap-3">
        <CampoModal rotulo="Nome">
          <p className="text-sm text-slate-800">{membro.nome}</p>
        </CampoModal>
        <CampoModal rotulo="E-mail">
          <p className="break-all text-sm text-slate-800">{membro.email ?? "—"}</p>
        </CampoModal>
        {mudaPerfil && (
          <CampoModal rotulo="Perfil no checklist">
            <SelectPerfil valor={dados.perfil} onChange={(perfil) => setDados((d) => ({ ...d, perfil }))} />
          </CampoModal>
        )}
        {mudaLogin ? (
          <CampoModal rotulo="Situação">
            <select
              className={inputCls}
              value={dados.ativo ? "ativo" : "inativo"}
              onChange={(e) => setDados((d) => ({ ...d, ativo: e.target.value === "ativo" }))}
            >
              <option value="ativo">Ativo</option>
              <option value="inativo">Inativo</option>
            </select>
          </CampoModal>
        ) : (
          <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-500">
            {rotuloPapelEquipe(membro.papel)}
            {outros.length ? ` que também usa ${outros.join(" e ")}` : ""}: e-mail, senha e situação mudam em
            {outros.length ? `Cadastros > Equipe da ${outros.join(" e ")}` : "quem cuida de todos os setores dela"}.{" "}
            {mudaPerfil ? "Aqui você muda o perfil no checklist e os setores." : "Aqui você muda só os setores."}
          </p>
        )}
        <div className="grid gap-1">
          <span className="text-xs font-medium text-slate-500">Setores</span>
          <EscolhaSetores
            setores={meusSetores}
            propriedades={propriedades}
            marcados={dados.setores}
            onChange={(setores) => setDados((d) => ({ ...d, setores }))}
          />
          {!ehAdmin && <p className="text-[11px] text-slate-400">Aparecem só os seus setores; os outros da pessoa continuam.</p>}
        </div>
        {mudaLogin && (
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs font-semibold text-slate-600">Redefinir senha</p>
            <p className="mt-0.5 text-[11px] text-slate-400">Deixe em branco para manter a senha atual.</p>
            <input
              className={`${inputCls} mt-2`}
              type="password"
              placeholder="Nova senha (mín. 6)"
              autoComplete="new-password"
              value={dados.senha}
              onChange={(e) => setDados((d) => ({ ...d, senha: e.target.value }))}
            />
          </div>
        )}
      </div>

      <ErroMsg erro={erro} />
      <div className="mt-4 flex gap-2">
        <button
          type="button"
          onClick={onFechar}
          className="flex-1 rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={() => void onSalvar(dados)}
          disabled={salvando}
          className="flex-1 rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:opacity-60"
        >
          {salvando ? "Salvando…" : "Salvar"}
        </button>
      </div>
    </JanelaCadastro>
  );
}

function SelectPerfil({ valor, onChange }: { valor: PerfilEquipeChecklist; onChange: (perfil: PerfilEquipeChecklist) => void }) {
  return (
    <select className={inputCls} value={valor} onChange={(e) => onChange(e.target.value as PerfilEquipeChecklist)} aria-label="Perfil no checklist">
      {PERFIS_EQUIPE.map((p) => (
        <option key={p.valor} value={p.valor}>
          {p.rotulo}: {p.descricao}
        </option>
      ))}
    </select>
  );
}

/** Setores em botões que acendem, agrupados por propriedade; aguenta muitos setores. */
function EscolhaSetores({
  setores,
  propriedades,
  marcados,
  onChange,
}: {
  setores: SetorChecklist[];
  propriedades: PropriedadeRef[];
  marcados: readonly string[];
  onChange: (ids: string[]) => void;
}) {
  if (setores.length === 0) return <p className="text-sm text-slate-500">Você ainda não tem setor liberado.</p>;
  return (
    <div className="space-y-2">
      {setoresPorPropriedade(setores, propriedades).map((g) => (
        <div key={g.propriedade.id}>
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">{g.propriedade.nome}</p>
          <div className="flex flex-wrap gap-1.5">
            {g.setores.map((s) => {
              const ligado = marcados.includes(s.id);
              return (
                <button
                  key={s.id}
                  type="button"
                  aria-pressed={ligado}
                  onClick={() => onChange(ligado ? marcados.filter((id) => id !== s.id) : [...marcados, s.id])}
                  className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                    ligado
                      ? "border-brand-600 bg-brand-600 text-white"
                      : "border-slate-300 bg-white text-slate-600 hover:border-slate-400"
                  }`}
                >
                  {ligado ? "✓ " : ""}
                  {s.nome}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
