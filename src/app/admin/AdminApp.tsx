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

const ABAS = [
  "Locais principais",
  "Setores",
  "Sublocais",
  "Solicitantes",
  "Demandas pré-definidas",
  "Peso",
  "Equipe",
] as const;
type Aba = (typeof ABAS)[number];

const inputCls =
  "rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30";

type Pred = Tables<"demandas_predefinidas">;
type PesoCfg = Tables<"peso_config">;

/** Sublocais padrão por local principal (nome normalizado para matching). */
const SUBLOCAIS_PADRAO: Record<string, string[]> = {
  aquamania: [
    "Adrenalina",
    "Rampa",
    "Lanchonete",
    "Bilheteria",
    "Bar",
    "3 Torres",
  ],
  "vivaz cataratas": [
    "Restaurante Allegro",
    "Bar Gaia",
    "Recepção",
    "Central de Reservas",
    "Marketing",
    "RH",
    "Financeiro",
    "Almoxarifado",
  ],
};

function normalizarNome(nome: string) {
  return nome
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

export function AdminApp(props: {
  propriedades: Prop[];
  setores: Setor[];
  locais: Local[];
  solicitantes: Solic[];
  usuarios: Usuario[];
  predefinidas: Pred[];
  pesoConfig: PesoCfg | null;
}) {
  const [aba, setAba] = useState<Aba>("Locais principais");

  return (
    <div className="mx-auto w-full max-w-4xl flex-1 px-4 py-6">
      <h1 className="text-xl font-bold">Cadastros</h1>
      <p className="mt-0.5 text-sm text-slate-500">
        Cadastre locais, solicitantes, demandas pré-definidas, pesos e a equipe.
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
        {aba === "Locais principais" && (
          <Propriedades itens={props.propriedades} />
        )}
        {aba === "Setores" && (
          <Setores itens={props.setores} propriedades={props.propriedades} />
        )}
        {aba === "Sublocais" && (
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
        {aba === "Demandas pré-definidas" && (
          <Predefinidas
            itens={props.predefinidas}
            propriedades={props.propriedades}
            usuarios={props.usuarios}
          />
        )}
        {aba === "Peso" && <PesoConfiguracao inicial={props.pesoConfig} />}
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

// ---------- Locais principais ----------
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
      <p className="mb-3 text-sm text-slate-500">
        Locais principais abrem a lista de sublocais na abertura de demanda
        (ex.: Aquamania, Vivaz Cataratas).
      </p>
      <div className="flex gap-2">
        <input
          className={`${inputCls} flex-1`}
          placeholder="Novo local principal"
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
    id ? propriedades.find((p) => p.id === id)?.nome ?? "?" : "Todos os locais";

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
          <option value="">Todos os locais principais</option>
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

// ---------- Sublocais ----------
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
  const [filtroProp, setFiltroProp] = useState<string>("todos");
  const [populando, setPopulando] = useState(false);
  const [msgOk, setMsgOk] = useState<string | null>(null);

  const nomeProp = (id: string) => propriedades.find((p) => p.id === id)?.nome ?? "?";
  const nomeSetor = (id: string | null) =>
    id ? setores.find((s) => s.id === id)?.nome ?? "" : "";

  const filtrados =
    filtroProp === "todos"
      ? itens
      : itens.filter((l) => l.propriedade_id === filtroProp);

  async function adicionar() {
    setMsgOk(null);
    if (!nome.trim() || !propId) return setErro("Informe nome e local principal.");
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

  async function popularPadrao() {
    setErro(null);
    setMsgOk(null);
    setPopulando(true);
    try {
      const novos: { nome: string; propriedade_id: string }[] = [];
      for (const prop of propriedades) {
        const chave = normalizarNome(prop.nome);
        const lista =
          SUBLOCAIS_PADRAO[chave] ??
          Object.entries(SUBLOCAIS_PADRAO).find(([k]) => chave.includes(k))?.[1];
        if (!lista) continue;
        const existentes = new Set(
          itens
            .filter((l) => l.propriedade_id === prop.id)
            .map((l) => normalizarNome(l.nome)),
        );
        for (const sub of lista) {
          if (!existentes.has(normalizarNome(sub))) {
            novos.push({ nome: sub, propriedade_id: prop.id });
          }
        }
      }
      if (novos.length === 0) {
        setMsgOk("Todos os sublocais padrão já estão cadastrados.");
        return;
      }
      const { error } = await supabase.from("locais").insert(novos);
      if (error) {
        setErro(error.message);
        return;
      }
      setMsgOk(`${novos.length} sublocal(is) adicionado(s).`);
      refresh();
    } finally {
      setPopulando(false);
    }
  }

  return (
    <Card>
      <p className="mb-3 text-sm text-slate-500">
        Sublocais aparecem depois que o solicitante escolhe o local principal.
      </p>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={popularPadrao}
          disabled={populando || propriedades.length === 0}
          className="rounded-lg border border-brand-300 bg-brand-50 px-3 py-2 text-sm font-semibold text-brand-700 transition hover:bg-brand-100 disabled:opacity-60"
        >
          {populando ? "Populando…" : "Popular sublocais padrão"}
        </button>
        <span className="text-xs text-slate-400">
          Aquamania e Vivaz Cataratas
        </span>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <input
          className={inputCls}
          placeholder="Novo sublocal"
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
      {msgOk && (
        <p className="mt-2 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          {msgOk}
        </p>
      )}

      <div className="mt-4 flex items-center gap-2">
        <label className="text-xs font-medium text-slate-500">Filtrar:</label>
        <select
          className={inputCls}
          value={filtroProp}
          onChange={(e) => setFiltroProp(e.target.value)}
        >
          <option value="todos">Todos os locais</option>
          {propriedades.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nome}
            </option>
          ))}
        </select>
      </div>

      <div className="mt-3">
        {filtrados.length === 0 && (
          <p className="py-6 text-center text-sm text-slate-400">
            Nenhum sublocal cadastrado. Use o botão acima ou adicione manualmente.
          </p>
        )}
        {filtrados.map((l) => (
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
    if (!nome.trim() || !propId) return setErro("Informe nome e local principal.");
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

// ---------- Demandas pré-definidas ----------
function Predefinidas({
  itens,
  propriedades,
  usuarios,
}: {
  itens: Pred[];
  propriedades: Prop[];
  usuarios: Usuario[];
}) {
  const { supabase, refresh, erro, setErro } = useAdmin();
  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [prioridade, setPrioridade] =
    useState<Enums<"demanda_prioridade">>("media");
  const [colaboradorId, setColaboradorId] = useState("");
  const [propId, setPropId] = useState("");

  const colaboradores = usuarios.filter(
    (u) => u.role === "colaborador" && u.ativo,
  );

  const nomeColab = (id: string) =>
    usuarios.find((u) => u.id === id)?.nome ?? "?";
  const nomeProp = (id: string | null) =>
    id ? propriedades.find((p) => p.id === id)?.nome ?? "?" : "Todos os locais";

  async function adicionar() {
    setErro(null);
    if (!titulo.trim()) return setErro("Informe o título da demanda.");
    if (!colaboradorId) return setErro("Selecione o colaborador responsável.");
    const { error } = await supabase.from("demandas_predefinidas").insert({
      titulo: titulo.trim(),
      descricao: descricao.trim() || null,
      prioridade,
      colaborador_id: colaboradorId,
      propriedade_id: propId || null,
    });
    if (error) {
      if (error.message.includes("schema cache") || error.code === "42P01") {
        return setErro(
          "Tabela ainda não existe no banco. Rode o SQL em supabase/migrations/20260728120000_demandas_predefinidas.sql no SQL Editor do Supabase.",
        );
      }
      return setErro(error.message);
    }
    setTitulo("");
    setDescricao("");
    setPrioridade("media");
    setColaboradorId("");
    setPropId("");
    refresh();
  }

  async function toggle(p: Pred) {
    await supabase
      .from("demandas_predefinidas")
      .update({ ativo: !p.ativo })
      .eq("id", p.id);
    refresh();
  }

  async function renomear(p: Pred) {
    const novo = window.prompt("Novo título:", p.titulo);
    if (!novo?.trim()) return;
    await supabase
      .from("demandas_predefinidas")
      .update({ titulo: novo.trim() })
      .eq("id", p.id);
    refresh();
  }

  return (
    <Card>
      <p className="mb-3 text-sm text-slate-500">
        Quando alguém escolher essa demanda na abertura, ela vai direto para o
        colaborador definido (ex.: Trocar lâmpada → João). Demandas{" "}
        <strong>sem</strong> pré-definição ficam em{" "}
        <strong>Demandas Gerais</strong> para qualquer colaborador pegar.
      </p>
      <div className="grid gap-2 sm:grid-cols-2">
        <input
          className={inputCls}
          placeholder="Título (ex.: Trocar lâmpada)"
          value={titulo}
          onChange={(e) => setTitulo(e.target.value)}
        />
        <select
          className={inputCls}
          value={colaboradorId}
          onChange={(e) => setColaboradorId(e.target.value)}
        >
          <option value="">Colaborador responsável…</option>
          {colaboradores.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nome}
            </option>
          ))}
        </select>
        <select
          className={inputCls}
          value={prioridade}
          onChange={(e) =>
            setPrioridade(e.target.value as Enums<"demanda_prioridade">)
          }
        >
          <option value="alta">Prioridade alta</option>
          <option value="media">Prioridade média</option>
          <option value="baixa">Prioridade baixa</option>
        </select>
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
        <input
          className={`${inputCls} sm:col-span-2`}
          placeholder="Descrição padrão (opcional)"
          value={descricao}
          onChange={(e) => setDescricao(e.target.value)}
        />
        <div className="sm:col-span-2">
          <BtnAdd onClick={adicionar} />
        </div>
      </div>
      <ErroMsg erro={erro} />
      {colaboradores.length === 0 && (
        <p className="mt-2 text-xs text-amber-600">
          Cadastre colaboradores na aba Equipe antes de criar demandas
          pré-definidas.
        </p>
      )}
      <div className="mt-3">
        {itens.length === 0 && (
          <p className="py-6 text-center text-sm text-slate-400">
            Nenhuma demanda pré-definida ainda.
          </p>
        )}
        {itens.map((p) => (
          <Linha
            key={p.id}
            nome={p.titulo}
            ativo={p.ativo}
            extra={`${nomeColab(p.colaborador_id)} · ${p.prioridade} · ${nomeProp(p.propriedade_id)}`}
            onRenomear={() => renomear(p)}
            onToggle={() => toggle(p)}
          />
        ))}
      </div>
    </Card>
  );
}

// ---------- Peso (fila) ----------
function PesoConfiguracao({ inicial }: { inicial: PesoCfg | null }) {
  const { supabase, refresh, erro, setErro } = useAdmin();
  const [alta, setAlta] = useState(inicial?.peso_alta ?? 7);
  const [media, setMedia] = useState(inicial?.peso_media ?? 4);
  const [baixa, setBaixa] = useState(inicial?.peso_baixa ?? 2);
  const [experiencia, setExperiencia] = useState(inicial?.peso_experiencia ?? 10);
  const [ok, setOk] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  async function salvar() {
    setErro(null);
    setOk(null);
    if (!inicial) {
      return setErro(
        "Tabela peso_config ainda não existe. Rode o SQL em supabase/migrations/20260728130000_peso_fila.sql no Supabase.",
      );
    }
    const vals = [alta, media, baixa, experiencia];
    if (vals.some((v) => !Number.isFinite(v) || v < 1 || v > 10)) {
      return setErro("Cada peso deve ser um número entre 1 e 10.");
    }
    setSalvando(true);
    const { error } = await supabase
      .from("peso_config")
      .update({
        peso_alta: alta,
        peso_media: media,
        peso_baixa: baixa,
        peso_experiencia: experiencia,
        atualizado_em: new Date().toISOString(),
      })
      .eq("id", 1);
    setSalvando(false);
    if (error) return setErro(error.message);
    setOk("Pesos salvos. Novas demandas usam essa configuração.");
    refresh();
  }

  return (
    <Card>
      <h2 className="text-base font-semibold text-slate-800">Pesos da fila</h2>
      <p className="mt-1 text-sm text-slate-500">
        Quanto maior o peso, mais acima a demanda aparece na fila do colaborador
        e no quadro.
      </p>

      <div className="mt-4 rounded-xl border border-brand-200 bg-brand-50 p-4 text-sm text-brand-900">
        <p className="font-semibold">Como funciona a regra do peso</p>
        <ol className="mt-2 list-decimal space-y-1.5 pl-4 text-brand-800">
          <li>
            Cada demanda recebe um peso de <strong>1 a 10</strong> na abertura.
          </li>
          <li>
            A <strong>prioridade</strong> (alta / média / baixa) define o peso
            base configurado abaixo.
          </li>
          <li>
            Se o solicitante marcar <strong>Afeta a experiência do hóspede?</strong>{" "}
            = Sim, o peso vira <strong>{experiencia}</strong> (topo da fila) e o
            card fica com a borda piscando em vermelho.
          </li>
          <li>
            A fila ordena por <strong>peso decrescente</strong>; empate → demanda
            mais antiga primeiro.
          </li>
          <li>
            Demandas <strong>sem</strong> colaborador fixo (pré-definida) ficam
            em <strong>Demandas Gerais</strong> para qualquer colaborador pegar.
            Pré-definidas continuam indo direto ao responsável cadastrado.
          </li>
        </ol>
        <div className="mt-3 flex flex-wrap gap-2 text-xs">
          <span className="rounded-md bg-white px-2 py-1 font-medium ring-1 ring-brand-200">
            Alta → {alta}
          </span>
          <span className="rounded-md bg-white px-2 py-1 font-medium ring-1 ring-brand-200">
            Média → {media}
          </span>
          <span className="rounded-md bg-white px-2 py-1 font-medium ring-1 ring-brand-200">
            Baixa → {baixa}
          </span>
          <span className="rounded-md bg-red-100 px-2 py-1 font-semibold text-red-700 ring-1 ring-red-200">
            Experiência hóspede → {experiencia}
          </span>
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <CampoPeso
          label="Peso — prioridade alta"
          value={alta}
          onChange={setAlta}
        />
        <CampoPeso
          label="Peso — prioridade média"
          value={media}
          onChange={setMedia}
        />
        <CampoPeso
          label="Peso — prioridade baixa"
          value={baixa}
          onChange={setBaixa}
        />
        <CampoPeso
          label="Peso — afeta experiência do hóspede"
          value={experiencia}
          onChange={setExperiencia}
        />
      </div>

      <ErroMsg erro={erro} />
      {ok && (
        <p className="mt-2 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          {ok}
        </p>
      )}

      <button
        type="button"
        onClick={salvar}
        disabled={salvando}
        className="mt-4 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:opacity-60"
      >
        {salvando ? "Salvando…" : "Salvar pesos"}
      </button>
    </Card>
  );
}

function CampoPeso({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
}) {
  return (
    <label className="grid gap-1 text-sm">
      <span className="font-medium text-slate-700">{label}</span>
      <input
        type="number"
        min={1}
        max={10}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className={inputCls}
      />
    </label>
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
          <option value="">Todos os locais principais</option>
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
