"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Tables } from "@/lib/database.types";
import { rotuloAmbientes } from "@/lib/equipe-edicao";
import { propriedadesAtivas } from "@/lib/propriedade-opcoes";
import type { CadastroLider, SistemaEquipe } from "@/lib/equipe-lider";
import { ListaCadastroControles, useListaCadastro } from "@/components/ListaCadastroControles";
import { BtnAdd, CampoModal, CardCadastro, ErroMsg, JanelaCadastro, LinhaCadastro, OkMsg } from "@/components/CadastroUi";
import { criarPessoaLider, salvarPessoaLider, type ResultadoLider } from "./equipe-lider-actions";

type Usuario = Tables<"usuarios">;
type Prop = Tables<"propriedades">;

const inputCls =
  "w-full min-w-0 rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30";

const NOME_SISTEMA: Record<SistemaEquipe, string> = { manutencao: "Manutenção", ti: "TI" };
const PAPEL: Record<string, string> = { colaborador: "Colaborador", solicitante: "Solicitante" };

/**
 * Equipe vista pelo líder da Manutenção ou da TI: mesmo formato do admin, mas
 * só com gente do sistema dele, e só colaborador ou solicitante.
 */
export function EquipeLider({
  itens,
  propriedades,
  sistemas,
  preencher,
  onPreencherConsumido,
}: {
  itens: Usuario[];
  propriedades: Prop[];
  sistemas: SistemaEquipe[];
  preencher?: { nome: string; email: string } | null;
  onPreencherConsumido?: () => void;
}) {
  const router = useRouter();
  const vazio = (): CadastroLider => ({ nome: "", email: "", senha: "", role: "colaborador", ambientes: [...sistemas], propriedadeId: "" });
  const [novo, setNovo] = useState<CadastroLider>(vazio);
  const [erro, setErro] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [enviando, iniciar] = useTransition();
  const [editando, setEditando] = useState<Usuario | null>(null);
  const [filtroPapel, setFiltroPapel] = useState("");
  const locais = propriedadesAtivas(propriedades);
  const nomeLocal = (id: string | null) => (id ? (propriedades.find((p) => p.id === id)?.nome ?? "?") : "Todos os locais");

  useEffect(() => {
    if (!preencher) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- preenche uma vez ao vir de Solicitações
    setNovo((d) => ({ ...d, nome: preencher.nome, email: preencher.email, role: "solicitante" }));
    onPreencherConsumido?.();
  }, [preencher, onPreencherConsumido]);

  const getTexto = useCallback((u: Usuario) => `${u.nome} ${u.email ?? ""} ${PAPEL[u.role] ?? u.role}`, []);
  const getAtivo = useCallback((u: Usuario) => u.ativo, []);
  const filtro = useCallback((u: Usuario) => !filtroPapel || u.role === filtroPapel, [filtroPapel]);
  const lista = useListaCadastro(itens, getTexto, { getAtivo, filtro, pageSizeInicial: 50 });

  function depois(resultado: ResultadoLider) {
    if ("erro" in resultado) {
      setErro(resultado.erro);
      return false;
    }
    setErro(null);
    setOk(resultado.ok);
    router.refresh();
    return true;
  }

  const mudar = <K extends keyof CadastroLider>(campo: K, valor: CadastroLider[K]) => setNovo((d) => ({ ...d, [campo]: valor }));

  return (
    <CardCadastro>
      <p className="mb-2 text-sm font-semibold text-slate-600">Novo membro da equipe</p>
      <p className="mb-3 text-xs text-slate-500">
        Você cadastra colaborador ou solicitante de {sistemas.map((s) => NOME_SISTEMA[s]).join(" e ")}. Líder e
        administrador quem cria é o administrador.
      </p>
      <div className="grid gap-2 sm:grid-cols-2">
        <input className={inputCls} placeholder="Nome" value={novo.nome} onChange={(e) => mudar("nome", e.target.value)} />
        <input className={inputCls} placeholder="E-mail" type="email" value={novo.email} onChange={(e) => mudar("email", e.target.value)} />
        <input
          className={inputCls}
          placeholder="Senha (mín. 6)"
          autoComplete="new-password"
          value={novo.senha}
          onChange={(e) => mudar("senha", e.target.value)}
        />
        <select className={inputCls} value={novo.role} onChange={(e) => mudar("role", e.target.value)}>
          <option value="colaborador">Colaborador</option>
          <option value="solicitante">Solicitante</option>
        </select>
        {novo.role === "colaborador" && sistemas.length > 1 && (
          <EscolhaSistemas sistemas={sistemas} marcados={novo.ambientes} onChange={(a) => mudar("ambientes", a)} />
        )}
        {novo.role === "solicitante" && (
          <p className="rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-500 sm:col-span-2">
            Solicitante abre chamado de TI e de Manutenção e recebe atualização dos chamados que abriu.
          </p>
        )}
        <select className={inputCls} value={novo.propriedadeId} onChange={(e) => mudar("propriedadeId", e.target.value)}>
          <option value="">Todos os locais principais</option>
          {locais.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nome}
            </option>
          ))}
        </select>
        <BtnAdd
          rotulo={enviando ? "Criando…" : "Criar"}
          disabled={enviando}
          onClick={() => {
            setOk(null);
            iniciar(async () => {
              if (depois(await criarPessoaLider(novo))) setNovo(vazio());
            });
          }}
        />
      </div>
      <ErroMsg erro={editando ? null : erro} />
      <OkMsg texto={ok} />

      <ListaCadastroControles
        {...lista}
        placeholder="Pesquisar por nome ou e-mail…"
        marcado={Boolean(filtroPapel)}
        filtrosExtras={
          <select className={inputCls} value={filtroPapel} onChange={(e) => setFiltroPapel(e.target.value)}>
            <option value="">Todos os papéis</option>
            <option value="colaborador">Colaborador</option>
            <option value="solicitante">Solicitante</option>
          </select>
        }
      />
      <div className="mt-1">
        {lista.itens.map((u) => (
          <LinhaCadastro
            key={u.id}
            nome={u.nome}
            ativo={u.ativo}
            extra={[u.email || "Sem e-mail", PAPEL[u.role] ?? u.role, rotuloAmbientes(u.ambientes), nomeLocal(u.propriedade_id)]
              .filter(Boolean)
              .join(" · ")}
            onEditar={() => {
              setErro(null);
              setEditando(u);
            }}
          />
        ))}
      </div>

      {editando && (
        <ModalEditar
          usuario={editando}
          sistemas={sistemas}
          propriedades={propriedades}
          erro={erro}
          salvando={enviando}
          onFechar={() => setEditando(null)}
          onSalvar={(dados) =>
            iniciar(async () => {
              if (depois(await salvarPessoaLider(editando.id, dados))) setEditando(null);
            })
          }
        />
      )}
    </CardCadastro>
  );
}

function ModalEditar({
  usuario,
  sistemas,
  propriedades,
  erro,
  salvando,
  onFechar,
  onSalvar,
}: {
  usuario: Usuario;
  sistemas: SistemaEquipe[];
  propriedades: Prop[];
  erro: string | null;
  salvando: boolean;
  onFechar: () => void;
  onSalvar: (dados: CadastroLider & { ativo: boolean }) => void;
}) {
  const [dados, setDados] = useState<CadastroLider & { ativo: boolean }>({
    nome: usuario.nome,
    email: usuario.email ?? "",
    senha: "",
    role: usuario.role,
    ambientes: usuario.ambientes ?? [],
    propriedadeId: usuario.propriedade_id ?? "",
    ativo: usuario.ativo,
  });
  const mudar = <K extends keyof typeof dados>(campo: K, valor: (typeof dados)[K]) => setDados((d) => ({ ...d, [campo]: valor }));

  return (
    <JanelaCadastro titulo="Editar membro" onFechar={onFechar}>
      <div className="mt-4 grid gap-3">
        <CampoModal rotulo="Nome">
          <input className={inputCls} value={dados.nome} onChange={(e) => mudar("nome", e.target.value)} />
        </CampoModal>
        <CampoModal rotulo="E-mail">
          <input className={inputCls} type="email" value={dados.email} onChange={(e) => mudar("email", e.target.value)} />
        </CampoModal>
        <CampoModal rotulo="Papel">
          <p className="text-sm text-slate-700">{PAPEL[usuario.role] ?? usuario.role}</p>
        </CampoModal>
        {usuario.role === "colaborador" && sistemas.length > 1 && (
          <div className="grid gap-1">
            <span className="text-xs font-medium text-slate-500">Sistema</span>
            <EscolhaSistemas sistemas={sistemas} marcados={dados.ambientes} onChange={(a) => mudar("ambientes", a)} />
          </div>
        )}
        <CampoModal rotulo="Local">
          <select className={inputCls} value={dados.propriedadeId} onChange={(e) => mudar("propriedadeId", e.target.value)}>
            <option value="">Todos os locais principais</option>
            {propriedadesAtivas(propriedades, usuario.propriedade_id).map((p) => (
              <option key={p.id} value={p.id}>
                {p.nome}
              </option>
            ))}
          </select>
        </CampoModal>
        <CampoModal rotulo="Situação">
          <select className={inputCls} value={dados.ativo ? "ativo" : "inativo"} onChange={(e) => mudar("ativo", e.target.value === "ativo")}>
            <option value="ativo">Ativo</option>
            <option value="inativo">Inativo</option>
          </select>
        </CampoModal>
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
          <p className="text-xs font-semibold text-slate-600">Redefinir senha</p>
          <p className="mt-0.5 text-[11px] text-slate-400">Deixe em branco para manter a senha atual.</p>
          <input
            className={`${inputCls} mt-2 bg-white`}
            type="password"
            placeholder="Nova senha (mín. 6)"
            autoComplete="new-password"
            value={dados.senha}
            onChange={(e) => mudar("senha", e.target.value)}
          />
        </div>
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
          onClick={() => onSalvar(dados)}
          disabled={salvando}
          className="flex-1 rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:opacity-60"
        >
          {salvando ? "Salvando…" : "Salvar"}
        </button>
      </div>
    </JanelaCadastro>
  );
}

function EscolhaSistemas({
  sistemas,
  marcados,
  onChange,
}: {
  sistemas: SistemaEquipe[];
  marcados: string[];
  onChange: (ambientes: string[]) => void;
}) {
  return (
    <div className="flex flex-wrap gap-3 rounded-lg border border-slate-200 px-3 py-2 text-sm sm:col-span-2">
      {sistemas.map((s) => (
        <label key={s} className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={marcados.includes(s)}
            onChange={(e) => onChange(e.target.checked ? [...marcados, s] : marcados.filter((a) => a !== s))}
          />
          {NOME_SISTEMA[s]}
        </label>
      ))}
    </div>
  );
}
