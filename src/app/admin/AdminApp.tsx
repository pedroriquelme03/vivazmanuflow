"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Tables, Enums } from "@/lib/database.types";

type Prop = Tables<"propriedades">;
type Setor = Tables<"setores">;
type Local = Tables<"locais">;
type Solic = Tables<"solicitantes">;
type Usuario = Tables<"usuarios">;

const ABAS = ["Propriedades", "Setores", "Locais", "Solicitantes", "Equipe"] as const;
type Aba = (typeof ABAS)[number];

const inputCls =
  "rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30";

export function AdminApp(props: {
  propriedades: Prop[];
  setores: Setor[];
  locais: Local[];
  solicitantes: Solic[];
  usuarios: Usuario[];
}) {
  const [aba, setAba] = useState<Aba>("Propriedades");

  return (
    <div className="mx-auto w-full max-w-4xl flex-1 px-4 py-6">
      <h1 className="text-xl font-bold">Cadastros</h1>
      <p className="mt-0.5 text-sm text-slate-500">
        Gerencie propriedades, locais, solicitantes e a equipe.
      </p>

      <div className="mt-4 flex flex-wrap gap-1 border-b border-slate-200">
        {ABAS.map((a) => (
          <button
            key={a}
            onClick={() => setAba(a)}
            className={`px-3 py-2 text-sm font-medium ${
              aba === a
                ? "border-b-2 border-brand-600 text-brand-700"
                : "text-slate-500 hover:text-brand-700"
            }`}
          >
            {a}
          </button>
        ))}
      </div>

      <div className="mt-5">
        {aba === "Propriedades" && <Propriedades itens={props.propriedades} />}
        {aba === "Setores" && (
          <Setores itens={props.setores} propriedades={props.propriedades} />
        )}
        {aba === "Locais" && (
          <Locais
            itens={props.locais}
            propriedades={props.propriedades}
            setores={props.setores}
          />
        )}
        {aba === "Solicitantes" && (
          <Solicitantes
            itens={props.solicitantes}
            propriedades={props.propriedades}
            setores={props.setores}
          />
        )}
        {aba === "Equipe" && (
          <Equipe itens={props.usuarios} propriedades={props.propriedades} />
        )}
      </div>
    </div>
  );
}

// Hook utilitário: supabase + refresh + erro
function useAdmin() {
  const supabase = createClient();
  const router = useRouter();
  const [erro, setErro] = useState<string | null>(null);
  return { supabase, refresh: () => router.refresh(), erro, setErro };
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">{children}</div>
  );
}

function Linha({
  nome,
  ativo,
  extra,
  onRenomear,
  onToggle,
  acoes,
}: {
  nome: string;
  ativo: boolean;
  extra?: string;
  onRenomear?: () => void;
  onToggle: () => void;
  acoes?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-2 border-t border-slate-100 py-2.5 first:border-t-0">
      <div className={ativo ? "" : "opacity-50"}>
        <p className="text-sm font-medium text-slate-800">{nome}</p>
        {extra && <p className="text-xs text-slate-400">{extra}</p>}
      </div>
      <div className="flex shrink-0 items-center gap-1">
        {acoes}
        {onRenomear && (
          <button
            onClick={onRenomear}
            className="rounded-md px-2 py-1 text-xs text-slate-500 hover:bg-slate-100"
          >
            Renomear
          </button>
        )}
        <button
          onClick={onToggle}
          className={`rounded-md px-2 py-1 text-xs font-medium ${
            ativo
              ? "text-slate-500 hover:bg-slate-100"
              : "text-emerald-600 hover:bg-emerald-50"
          }`}
        >
          {ativo ? "Desativar" : "Reativar"}
        </button>
      </div>
    </div>
  );
}

function ErroMsg({ erro }: { erro: string | null }) {
  if (!erro) return null;
  return (
    <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{erro}</p>
  );
}

// ---------- Propriedades ----------
function Propriedades({ itens }: { itens: Prop[] }) {
  const { supabase, refresh, erro, setErro } = useAdmin();
  const [nome, setNome] = useState("");

  async function adicionar() {
    if (!nome.trim()) return;
    const { error } = await supabase.from("propriedades").insert({ nome: nome.trim() });
    if (error) return setErro(error.message);
    setNome("");
    refresh();
  }
  async function toggle(p: Prop) {
    await supabase.from("propriedades").update({ ativo: !p.ativo }).eq("id", p.id);
    refresh();
  }
  async function renomear(p: Prop) {
    const novo = window.prompt("Novo nome:", p.nome);
    if (!novo?.trim()) return;
    await supabase.from("propriedades").update({ nome: novo.trim() }).eq("id", p.id);
    refresh();
  }

  return (
    <Card>
      <div className="flex gap-2">
        <input
          className={`${inputCls} flex-1`}
          placeholder="Nova propriedade"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
        />
        <BtnAdd onClick={adicionar} />
      </div>
      <ErroMsg erro={erro} />
      <div className="mt-3">
        {itens.map((p) => (
          <Linha
            key={p.id}
            nome={p.nome}
            ativo={p.ativo}
            onRenomear={() => renomear(p)}
            onToggle={() => toggle(p)}
          />
        ))}
      </div>
    </Card>
  );
}

// ---------- Setores ----------
function Setores({ itens, propriedades }: { itens: Setor[]; propriedades: Prop[] }) {
  const { supabase, refresh, erro, setErro } = useAdmin();
  const [nome, setNome] = useState("");
  const [propId, setPropId] = useState("");
  const nomeProp = (id: string | null) =>
    id ? propriedades.find((p) => p.id === id)?.nome ?? "?" : "Todas as propriedades";

  async function adicionar() {
    if (!nome.trim()) return;
    const { error } = await supabase
      .from("setores")
      .insert({ nome: nome.trim(), propriedade_id: propId || null });
    if (error) return setErro(error.message);
    setNome("");
    refresh();
  }
  async function toggle(s: Setor) {
    await supabase.from("setores").update({ ativo: !s.ativo }).eq("id", s.id);
    refresh();
  }
  async function renomear(s: Setor) {
    const novo = window.prompt("Novo nome:", s.nome);
    if (!novo?.trim()) return;
    await supabase.from("setores").update({ nome: novo.trim() }).eq("id", s.id);
    refresh();
  }

  return (
    <Card>
      <div className="flex flex-wrap gap-2">
        <input
          className={`${inputCls} flex-1`}
          placeholder="Novo setor"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
        />
        <select className={inputCls} value={propId} onChange={(e) => setPropId(e.target.value)}>
          <option value="">Todas as propriedades</option>
          {propriedades.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nome}
            </option>
          ))}
        </select>
        <BtnAdd onClick={adicionar} />
      </div>
      <ErroMsg erro={erro} />
      <div className="mt-3">
        {itens.map((s) => (
          <Linha
            key={s.id}
            nome={s.nome}
            ativo={s.ativo}
            extra={nomeProp(s.propriedade_id)}
            onRenomear={() => renomear(s)}
            onToggle={() => toggle(s)}
          />
        ))}
      </div>
    </Card>
  );
}

// ---------- Locais ----------
function Locais({
  itens,
  propriedades,
  setores,
}: {
  itens: Local[];
  propriedades: Prop[];
  setores: Setor[];
}) {
  const { supabase, refresh, erro, setErro } = useAdmin();
  const [nome, setNome] = useState("");
  const [propId, setPropId] = useState(propriedades[0]?.id ?? "");
  const [setorId, setSetorId] = useState("");
  const nomeProp = (id: string) => propriedades.find((p) => p.id === id)?.nome ?? "?";
  const nomeSetor = (id: string | null) =>
    id ? setores.find((s) => s.id === id)?.nome ?? "" : "";

  async function adicionar() {
    if (!nome.trim() || !propId) return setErro("Informe nome e propriedade.");
    const { error } = await supabase
      .from("locais")
      .insert({ nome: nome.trim(), propriedade_id: propId, setor_id: setorId || null });
    if (error) return setErro(error.message);
    setNome("");
    refresh();
  }
  async function toggle(l: Local) {
    await supabase.from("locais").update({ ativo: !l.ativo }).eq("id", l.id);
    refresh();
  }
  async function renomear(l: Local) {
    const novo = window.prompt("Novo nome:", l.nome);
    if (!novo?.trim()) return;
    await supabase.from("locais").update({ nome: novo.trim() }).eq("id", l.id);
    refresh();
  }

  return (
    <Card>
      <div className="grid gap-2 sm:grid-cols-2">
        <input
          className={inputCls}
          placeholder="Novo local"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
        />
        <select className={inputCls} value={propId} onChange={(e) => setPropId(e.target.value)}>
          {propriedades.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nome}
            </option>
          ))}
        </select>
        <select className={inputCls} value={setorId} onChange={(e) => setSetorId(e.target.value)}>
          <option value="">Sem setor</option>
          {setores.map((s) => (
            <option key={s.id} value={s.id}>
              {s.nome}
            </option>
          ))}
        </select>
        <BtnAdd onClick={adicionar} />
      </div>
      <ErroMsg erro={erro} />
      <div className="mt-3">
        {itens.map((l) => (
          <Linha
            key={l.id}
            nome={l.nome}
            ativo={l.ativo}
            extra={[nomeProp(l.propriedade_id), nomeSetor(l.setor_id)]
              .filter(Boolean)
              .join(" · ")}
            onRenomear={() => renomear(l)}
            onToggle={() => toggle(l)}
          />
        ))}
      </div>
    </Card>
  );
}

// ---------- Solicitantes ----------
function Solicitantes({
  itens,
  propriedades,
  setores,
}: {
  itens: Solic[];
  propriedades: Prop[];
  setores: Setor[];
}) {
  const { supabase, refresh, erro, setErro } = useAdmin();
  const [nome, setNome] = useState("");
  const [propId, setPropId] = useState(propriedades[0]?.id ?? "");
  const [setorId, setSetorId] = useState("");
  const nomeProp = (id: string) => propriedades.find((p) => p.id === id)?.nome ?? "?";
  const nomeSetor = (id: string | null) =>
    id ? setores.find((s) => s.id === id)?.nome ?? "" : "";

  async function adicionar() {
    if (!nome.trim() || !propId) return setErro("Informe nome e propriedade.");
    const { error } = await supabase
      .from("solicitantes")
      .insert({ nome: nome.trim(), propriedade_id: propId, setor_id: setorId || null });
    if (error) return setErro(error.message);
    setNome("");
    refresh();
  }
  async function toggle(s: Solic) {
    await supabase.from("solicitantes").update({ ativo: !s.ativo }).eq("id", s.id);
    refresh();
  }
  async function renomear(s: Solic) {
    const novo = window.prompt("Novo nome:", s.nome);
    if (!novo?.trim()) return;
    await supabase.from("solicitantes").update({ nome: novo.trim() }).eq("id", s.id);
    refresh();
  }

  return (
    <Card>
      <div className="grid gap-2 sm:grid-cols-2">
        <input
          className={inputCls}
          placeholder="Nome do solicitante"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
        />
        <select className={inputCls} value={propId} onChange={(e) => setPropId(e.target.value)}>
          {propriedades.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nome}
            </option>
          ))}
        </select>
        <select className={inputCls} value={setorId} onChange={(e) => setSetorId(e.target.value)}>
          <option value="">Sem setor</option>
          {setores.map((s) => (
            <option key={s.id} value={s.id}>
              {s.nome}
            </option>
          ))}
        </select>
        <BtnAdd onClick={adicionar} />
      </div>
      <ErroMsg erro={erro} />
      <div className="mt-3">
        {itens.map((s) => (
          <Linha
            key={s.id}
            nome={s.nome}
            ativo={s.ativo}
            extra={[nomeProp(s.propriedade_id), nomeSetor(s.setor_id)]
              .filter(Boolean)
              .join(" · ")}
            onRenomear={() => renomear(s)}
            onToggle={() => toggle(s)}
          />
        ))}
      </div>
    </Card>
  );
}

// ---------- Equipe (usuarios com login) ----------
const ROLE_LABEL: Record<Enums<"user_role">, string> = {
  admin: "Administrador",
  lider: "Líder",
  colaborador: "Colaborador",
};

function Equipe({ itens, propriedades }: { itens: Usuario[]; propriedades: Prop[] }) {
  const { supabase, refresh, erro, setErro } = useAdmin();
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [role, setRole] = useState<Enums<"user_role">>("colaborador");
  const [propId, setPropId] = useState("");
  const [ok, setOk] = useState<string | null>(null);
  const nomeProp = (id: string | null) =>
    id ? propriedades.find((p) => p.id === id)?.nome ?? "?" : "Todas";

  async function criar() {
    setErro(null);
    setOk(null);
    const { error } = await supabase.rpc("admin_criar_usuario", {
      p_nome: nome,
      p_email: email,
      p_senha: senha,
      p_role: role,
      p_propriedade_id: propId || undefined,
    });
    if (error) return setErro(error.message);
    setOk(`Usuário ${email} criado.`);
    setNome("");
    setEmail("");
    setSenha("");
    refresh();
  }
  async function toggle(u: Usuario) {
    await supabase.from("usuarios").update({ ativo: !u.ativo }).eq("id", u.id);
    refresh();
  }
  async function trocarSenha(u: Usuario) {
    const nova = window.prompt(`Nova senha para ${u.nome} (mín. 6 caracteres):`);
    if (!nova) return;
    const { error } = await supabase.rpc("admin_redefinir_senha", {
      p_user_id: u.id,
      p_senha: nova,
    });
    if (error) return setErro(error.message);
    setOk(`Senha de ${u.nome} redefinida.`);
  }

  return (
    <Card>
      <p className="mb-2 text-sm font-semibold text-slate-600">Novo membro da equipe</p>
      <div className="grid gap-2 sm:grid-cols-2">
        <input className={inputCls} placeholder="Nome" value={nome} onChange={(e) => setNome(e.target.value)} />
        <input className={inputCls} placeholder="E-mail" value={email} onChange={(e) => setEmail(e.target.value)} />
        <input
          className={inputCls}
          placeholder="Senha (mín. 6)"
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
        />
        <select className={inputCls} value={role} onChange={(e) => setRole(e.target.value as Enums<"user_role">)}>
          <option value="colaborador">Colaborador</option>
          <option value="lider">Líder</option>
          <option value="admin">Administrador</option>
        </select>
        <select className={inputCls} value={propId} onChange={(e) => setPropId(e.target.value)}>
          <option value="">Todas as propriedades</option>
          {propriedades.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nome}
            </option>
          ))}
        </select>
        <BtnAdd onClick={criar} rotulo="Criar" />
      </div>
      <ErroMsg erro={erro} />
      {ok && (
        <p className="mt-2 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{ok}</p>
      )}

      <div className="mt-4">
        {itens.map((u) => (
          <Linha
            key={u.id}
            nome={u.nome}
            ativo={u.ativo}
            extra={`${ROLE_LABEL[u.role]} · ${nomeProp(u.propriedade_id)}`}
            onToggle={() => toggle(u)}
            acoes={
              <button
                onClick={() => trocarSenha(u)}
                className="rounded-md px-2 py-1 text-xs text-slate-500 hover:bg-slate-100"
              >
                Trocar senha
              </button>
            }
          />
        ))}
      </div>
    </Card>
  );
}

function BtnAdd({ onClick, rotulo = "Adicionar" }: { onClick: () => void; rotulo?: string }) {
  return (
    <button
      onClick={onClick}
      className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700"
    >
      {rotulo}
    </button>
  );
}
