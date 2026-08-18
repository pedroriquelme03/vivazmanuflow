"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { comprimirImagem } from "@/lib/comprimir-imagem";
import { COLAB_SELECT, GERAIS_SELECT, type DemandaColab, type DemandaGeral, ordenarFilaPorPeso } from "@/lib/demanda-select";
import type { TablesUpdate, Enums } from "@/lib/database.types";
import {
  calcularUrgencia,
  PRIORIDADE_BADGE,
  formatarData,
} from "@/lib/demanda-ui";
import { PrioridadeTag } from "@/components/PrioridadeTag";
import { logout } from "@/lib/logout";
import type { Perfil } from "@/lib/auth";

type Aba = "demandas" | "gerais" | "historico" | "perfil";

const ABAS: { id: Aba; rotulo: string; icone: string }[] = [
  { id: "demandas", rotulo: "Minhas", icone: "🛠️" },
  { id: "gerais", rotulo: "Gerais", icone: "📥" },
  { id: "historico", rotulo: "Histórico", icone: "📋" },
  { id: "perfil", rotulo: "Perfil", icone: "👤" },
];

export function ColaboradorPainel({
  demandasIniciais,
  geraisIniciais,
  perfil,
}: {
  demandasIniciais: DemandaColab[];
  geraisIniciais: DemandaGeral[];
  perfil: Perfil;
}) {
  const colaboradorId = perfil.id;
  const primeiroNome = perfil.nome.split(" ")[0];
  const supabase = useMemo(() => createClient(), []);
  const [demandas, setDemandas] = useState<DemandaColab[]>(() =>
    ordenarFilaPorPeso(demandasIniciais),
  );
  const [gerais, setGerais] = useState<DemandaGeral[]>(() =>
    ordenarFilaPorPeso(geraisIniciais),
  );
  const [agora, setAgora] = useState(() => Date.now());
  const [aba, setAba] = useState<Aba>("demandas");

  const recarregar = useCallback(async () => {
    const { data } = await supabase
      .from("demandas")
      .select(COLAB_SELECT)
      .eq("colaborador_id", colaboradorId)
      .in("status", ["atribuida", "em_andamento"])
      .eq("arquivado", false)
      .order("peso", { ascending: false })
      .order("criado_em", { ascending: true });
    if (data) {
      setDemandas(ordenarFilaPorPeso(data as unknown as DemandaColab[]));
    }
  }, [supabase, colaboradorId]);

  const recarregarGerais = useCallback(async () => {
    // Pool visível para todos os colaboradores, sem filtro por local.
    const { data } = await supabase
      .from("demandas")
      .select(GERAIS_SELECT)
      .eq("status", "aberta")
      .eq("arquivado", false)
      .is("colaborador_id", null)
      .order("peso", { ascending: false })
      .order("criado_em", { ascending: true });
    if (data) {
      setGerais(ordenarFilaPorPeso(data as unknown as DemandaGeral[]));
    }
  }, [supabase]);

  useEffect(() => {
    const canal = supabase
      .channel("painel-colaborador")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "demandas",
        },
        () => {
          recarregar();
          recarregarGerais();
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(canal);
    };
  }, [supabase, recarregar, recarregarGerais]);

  useEffect(() => {
    const t = setInterval(() => setAgora(Date.now()), 30000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <main className="mx-auto w-full max-w-md flex-1 px-4 pb-28 pt-6">
        {aba === "demandas" && (
          <ListaDemandas
            primeiroNome={primeiroNome}
            demandas={demandas}
            agora={agora}
            colaboradorId={colaboradorId}
            onMudou={recarregar}
          />
        )}
        {aba === "gerais" && (
          <DemandasGerais
            itens={gerais}
            onPegou={() => {
              recarregarGerais();
              recarregar();
              setAba("demandas");
            }}
            onAtualizar={recarregarGerais}
          />
        )}
        {aba === "historico" && (
          <HistoricoColab colaboradorId={colaboradorId} />
        )}
        {aba === "perfil" && <PerfilColab perfil={perfil} />}
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur">
        <div className="mx-auto flex max-w-md">
          {ABAS.map((a) => {
            const ativa = aba === a.id;
            const badge =
              a.id === "demandas" && demandas.length > 0
                ? demandas.length
                : a.id === "gerais" && gerais.length > 0
                  ? gerais.length
                  : null;
            return (
              <button
                key={a.id}
                type="button"
                onClick={() => setAba(a.id)}
                className={`relative flex flex-1 flex-col items-center gap-0.5 py-2.5 text-xs font-medium transition ${
                  ativa
                    ? "text-brand-700"
                    : "text-slate-400 hover:text-slate-600"
                }`}
              >
                <span className="text-lg leading-none" aria-hidden>
                  {a.icone}
                </span>
                {a.rotulo}
                {badge != null && (
                  <span className="absolute right-[calc(50%-1.75rem)] top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand-600 px-1 text-[10px] font-bold text-white">
                    {badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

function ListaDemandas({
  primeiroNome,
  demandas,
  agora,
  colaboradorId,
  onMudou,
}: {
  primeiroNome: string;
  demandas: DemandaColab[];
  agora: number;
  colaboradorId: string;
  onMudou: () => void;
}) {
  return (
    <>
      <h1 className="text-xl font-bold">Olá, {primeiroNome} 👋</h1>
      <p className="mt-0.5 text-sm text-slate-500">
        {demandas.length === 0
          ? "Você não tem demandas no momento."
          : `Você tem ${demandas.length} demanda(s) para atender.`}
      </p>

      {demandas.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-400">
          Tudo em dia! 🎉
        </div>
      ) : (
        <div className="mt-5 grid gap-4">
          {demandas.map((d) => (
            <CardColab
              key={d.id}
              demanda={d}
              agora={agora}
              colaboradorId={colaboradorId}
              onMudou={onMudou}
            />
          ))}
        </div>
      )}
    </>
  );
}

function DemandasGerais({
  itens,
  onPegou,
  onAtualizar,
}: {
  itens: DemandaGeral[];
  onPegou: () => void;
  onAtualizar: () => void;
}) {
  const supabase = useMemo(() => createClient(), []);
  const [pegandoId, setPegandoId] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  async function pegar(id: string) {
    setErro(null);
    setPegandoId(id);
    const { error } = await supabase.rpc("pegar_demanda", {
      p_demanda_id: id,
    });
    setPegandoId(null);
    if (error) {
      setErro(
        error.message.includes("já foi atribuída")
          ? "Outro colaborador pegou esta demanda primeiro."
          : error.message,
      );
      onAtualizar();
      return;
    }
    onPegou();
  }

  return (
    <>
      <h1 className="text-xl font-bold">Demandas Gerais</h1>
      <p className="mt-0.5 text-sm text-slate-500">
        Demandas ainda sem responsável. Qualquer colaborador pode pegar.
      </p>

      {erro && (
        <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {erro}
        </p>
      )}

      {itens.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-400">
          Nenhuma demanda disponível no momento.
        </div>
      ) : (
        <div className="mt-5 grid gap-4">
          {itens.map((d) => {
            const pesoMax = d.afeta_experiencia || (d.peso ?? 0) >= 10;
            return (
              <article
                key={d.id}
                className={`overflow-hidden rounded-2xl border bg-white shadow-sm ${
                  pesoMax ? "card-peso-max" : "border-slate-200"
                }`}
              >
                <div
                  className={`px-4 py-2 text-center text-sm font-bold ${PRIORIDADE_BADGE[d.prioridade]}`}
                >
                  {pesoMax
                    ? "Experiência do hóspede"
                    : `Peso ${d.peso ?? "—"}`}
                  {" · "}
                  Aberta {formatarData(d.criado_em)}
                </div>
                <div className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <h2 className="text-lg font-bold leading-tight">
                      {d.titulo}
                    </h2>
                    <PrioridadeTag prioridade={d.prioridade} />
                  </div>
                  <p className="mt-1 text-sm text-slate-500">
                    {d.local?.nome ? `📍 ${d.local.nome} · ` : ""}
                    {d.solicitante?.nome}
                  </p>
                  {d.evento?.nome && (
                    <p className="mt-1 text-xs font-semibold text-violet-700">
                      🎉 Evento: {d.evento.nome}
                    </p>
                  )}
                  {d.descricao && (
                    <p className="mt-2 text-sm text-slate-600">{d.descricao}</p>
                  )}
                  <button
                    type="button"
                    onClick={() => pegar(d.id)}
                    disabled={pegandoId === d.id}
                    className="mt-4 w-full rounded-xl bg-brand-600 px-4 py-3.5 text-base font-bold text-white transition hover:bg-brand-700 disabled:opacity-60"
                  >
                    {pegandoId === d.id ? "Pegando…" : "Pegar esta demanda"}
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </>
  );
}

const PERIODOS = [
  { dias: 1, rotulo: "Hoje" },
  { dias: 7, rotulo: "7 dias" },
  { dias: 30, rotulo: "30 dias" },
  { dias: 90, rotulo: "90 dias" },
] as const;

type ItemHistorico = {
  id: string;
  titulo: string;
  prioridade: Enums<"demanda_prioridade">;
  concluido_em: string | null;
  local: { nome: string } | null;
};

function inicioPeriodo(dias: number): Date {
  const fim = new Date();
  if (dias === 1) {
    const hoje = new Date(fim);
    hoje.setHours(0, 0, 0, 0);
    return hoje;
  }
  return new Date(fim.getTime() - dias * 86400_000);
}

function HistoricoColab({ colaboradorId }: { colaboradorId: string }) {
  const supabase = useMemo(() => createClient(), []);
  const [dias, setDias] = useState(7);
  const [itens, setItens] = useState<ItemHistorico[]>([]);
  const [carregando, setCarregando] = useState(true);

  const carregar = useCallback(
    async (nDias: number) => {
      setCarregando(true);
      const inicio = inicioPeriodo(nDias).toISOString();
      const { data } = await supabase
        .from("demandas")
        .select("id, titulo, prioridade, concluido_em, local:locais(nome)")
        .eq("colaborador_id", colaboradorId)
        .eq("status", "concluida")
        .gte("concluido_em", inicio)
        .order("concluido_em", { ascending: false });
      setItens((data as unknown as ItemHistorico[]) ?? []);
      setCarregando(false);
    },
    [supabase, colaboradorId],
  );

  useEffect(() => {
    carregar(dias);
  }, [dias, carregar]);

  const porPrioridade = useMemo(() => {
    const c = { alta: 0, media: 0, baixa: 0 };
    for (const i of itens) c[i.prioridade]++;
    return c;
  }, [itens]);

  return (
    <>
      <h1 className="text-xl font-bold">Histórico</h1>
      <p className="mt-0.5 text-sm text-slate-500">
        Demandas que você concluiu no período.
      </p>

      <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
        {PERIODOS.map((p) => (
          <button
            key={p.dias}
            type="button"
            onClick={() => setDias(p.dias)}
            className={`shrink-0 rounded-full px-3.5 py-1.5 text-sm font-semibold transition ${
              dias === p.dias
                ? "bg-brand-600 text-white"
                : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"
            }`}
          >
            {p.rotulo}
          </button>
        ))}
      </div>

      <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
          Total atendidas
        </p>
        <p className="mt-1 text-3xl font-bold text-slate-900">
          {carregando ? "…" : itens.length}
        </p>
        {!carregando && itens.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {(
              [
                ["alta", porPrioridade.alta],
                ["media", porPrioridade.media],
                ["baixa", porPrioridade.baixa],
              ] as const
            )
              .filter(([, n]) => n > 0)
              .map(([prio, n]) => (
                <span key={prio} className="inline-flex items-center gap-1.5">
                  <PrioridadeTag prioridade={prio} />
                  <span className="text-xs font-semibold text-slate-500">
                    {n}
                  </span>
                </span>
              ))}
          </div>
        )}
      </div>

      {carregando ? (
        <p className="mt-6 text-center text-sm text-slate-400">Carregando…</p>
      ) : itens.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-400">
          Nenhuma demanda concluída neste período.
        </div>
      ) : (
        <ul className="mt-4 grid gap-2">
          {itens.map((i) => (
            <li
              key={i.id}
              className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm"
            >
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-semibold text-slate-800">
                  {i.titulo}
                </p>
                <PrioridadeTag prioridade={i.prioridade} />
              </div>
              <p className="mt-1 text-xs text-slate-400">
                {i.local?.nome ? `${i.local.nome} · ` : ""}
                {formatarData(i.concluido_em)}
              </p>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

function PerfilColab({ perfil }: { perfil: Perfil }) {
  const iniciais = perfil.nome
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");

  return (
    <>
      <h1 className="text-xl font-bold">Perfil</h1>
      <p className="mt-0.5 text-sm text-slate-500">Seus dados de acesso.</p>

      <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-600 text-lg font-bold text-white">
            {iniciais || "V"}
          </div>
          <div className="min-w-0">
            <p className="truncate text-base font-bold text-slate-900">
              {perfil.nome}
            </p>
            <p className="text-sm text-slate-500">Colaborador</p>
          </div>
        </div>

        <dl className="mt-5 grid gap-3 border-t border-slate-100 pt-4 text-sm">
          <div>
            <dt className="text-xs text-slate-400">E-mail</dt>
            <dd className="font-medium text-slate-700">
              {perfil.email ?? "—"}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-slate-400">Local principal</dt>
            <dd className="font-medium text-slate-700">
              {perfil.propriedade_nome ?? "Todos"}
            </dd>
          </div>
        </dl>
      </div>

      <form action={logout} className="mt-4">
        <button
          type="submit"
          className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3.5 text-base font-semibold text-slate-700 transition hover:bg-slate-50"
        >
          Sair da conta
        </button>
      </form>
    </>
  );
}

type Passo = "inicio" | "foto" | "motivo";

const MOTIVOS = ["Falta material", "Preciso de ajuda", "Vou continuar depois"];

function CardColab({
  demanda,
  agora,
  colaboradorId,
  onMudou,
}: {
  demanda: DemandaColab;
  agora: number;
  colaboradorId: string;
  onMudou: () => void;
}) {
  const supabase = createClient();
  const [passo, setPasso] = useState<Passo>("inicio");
  const [foto, setFoto] = useState<File | null>(null);
  const [descricaoConclusao, setDescricaoConclusao] = useState("");
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [sinalizado, setSinalizado] = useState<string | null>(null);

  const urg = calcularUrgencia(demanda.prazo_confirmado, demanda.atribuido_em, agora);
  const fotoRef = demanda.anexos?.find(
    (a) => a.enviado_por === "solicitante" && a.tipo === "foto",
  );

  async function iniciar() {
    setOcupado(true);
    setErro(null);
    const updates: TablesUpdate<"demandas"> = {
      status: "em_andamento",
      iniciado_em: new Date().toISOString(),
    };
    const { error } = await supabase.from("demandas").update(updates).eq("id", demanda.id);
    if (error) {
      setErro("Não foi possível iniciar. Tente de novo.");
      setOcupado(false);
      return;
    }
    setOcupado(false);
    onMudou();
  }

  async function concluir() {
    if (!foto) {
      setErro("Tire uma foto do serviço concluído.");
      return;
    }
    if (!descricaoConclusao.trim()) {
      setErro("Descreva o que foi feito.");
      return;
    }
    setOcupado(true);
    setErro(null);
    try {
      const arquivo = await comprimirImagem(foto);
      const caminho = `conclusao/${crypto.randomUUID()}.jpg`;
      const { error: upErro } = await supabase.storage
        .from("anexos")
        .upload(caminho, arquivo, { contentType: arquivo.type });
      if (upErro) throw new Error();

      const url = supabase.storage.from("anexos").getPublicUrl(caminho).data.publicUrl;
      const { error: anxErro } = await supabase.from("demanda_anexos").insert({
        demanda_id: demanda.id,
        tipo: "foto",
        url,
        enviado_por: "colaborador",
      });
      if (anxErro) throw new Error();

      // Conclusão automática: ao enviar a foto, a demanda fecha direto
      // (status "concluida"), sem passar por validação do solicitante.
      const updates: TablesUpdate<"demandas"> = {
        status: "concluida",
        concluido_em: new Date().toISOString(),
      };
      const { error: updErro } = await supabase
        .from("demandas")
        .update(updates)
        .eq("id", demanda.id);
      if (updErro) throw new Error();

      await supabase.from("demanda_historico").insert({
        demanda_id: demanda.id,
        status_anterior: "em_andamento",
        status_novo: "concluida",
        observacao: descricaoConclusao.trim(),
        usuario_id: colaboradorId,
      });

      onMudou();
    } catch {
      setErro("Falha ao concluir. Verifique a internet e tente de novo.");
      setOcupado(false);
    }
  }

  async function registrarMotivo(motivo: string) {
    setOcupado(true);
    const { error } = await supabase
      .from("demandas")
      .update({ motivo_nao_conclusao: motivo })
      .eq("id", demanda.id);
    setOcupado(false);
    if (error) {
      setErro("Não foi possível registrar.");
      return;
    }
    setSinalizado(motivo);
    setPasso("inicio");
  }

  function voltar() {
    setPasso("inicio");
    setFoto(null);
    setDescricaoConclusao("");
    setErro(null);
  }

  const pesoMax =
    demanda.afeta_experiencia || (demanda.peso ?? 0) >= 10;

  return (
    <article
      className={`overflow-hidden rounded-2xl border bg-white shadow-sm ${
        pesoMax ? "card-peso-max" : "border-slate-200"
      }`}
    >
      {/* Prazo — cor pela prioridade (alta vermelha, média laranja, baixa verde) */}
      <div
        className={`px-4 py-2 text-center text-sm font-bold ${PRIORIDADE_BADGE[demanda.prioridade]}`}
      >
        ⏱ {urg.label}
        {pesoMax ? " · Experiência do hóspede" : ` · Peso ${demanda.peso ?? "—"}`}
      </div>

      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <h2 className="text-lg font-bold leading-tight">{demanda.titulo}</h2>
          <PrioridadeTag prioridade={demanda.prioridade} />
        </div>
        <p className="mt-1 text-sm text-slate-500">
          {demanda.local?.nome ? `📍 ${demanda.local.nome} · ` : ""}
          {demanda.solicitante?.nome}
        </p>
        {demanda.evento?.nome && (
          <p className="mt-1 text-xs font-semibold text-violet-700">
            🎉 Evento: {demanda.evento.nome}
          </p>
        )}
        {demanda.descricao && (
          <p className="mt-2 text-sm text-slate-600">{demanda.descricao}</p>
        )}

        {fotoRef && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={fotoRef.url}
            alt="Foto enviada pelo solicitante"
            className="mt-3 max-h-48 w-full rounded-lg object-cover"
          />
        )}

        {sinalizado && passo === "inicio" && (
          <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
            Sinalizado: {sinalizado}
          </p>
        )}

        {erro && (
          <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {erro}
          </p>
        )}

        {/* Ações */}
        <div className="mt-4">
          {demanda.status === "atribuida" && (
            <BotaoGrande cor="brand" onClick={iniciar} disabled={ocupado}>
              {ocupado ? "Iniciando…" : "▶ Iniciar atendimento"}
            </BotaoGrande>
          )}

          {demanda.status === "em_andamento" && passo === "inicio" && (
            <>
              <p className="mb-3 text-center text-base font-semibold text-slate-700">
                A demanda foi atendida?
              </p>
              <div className="grid grid-cols-2 gap-3">
                <BotaoGrande cor="verde" onClick={() => setPasso("foto")}>
                  ✅ Sim
                </BotaoGrande>
                <BotaoGrande cor="cinza" onClick={() => setPasso("motivo")}>
                  ❌ Não
                </BotaoGrande>
              </div>
            </>
          )}

          {demanda.status === "em_andamento" && passo === "foto" && (
            <div className="grid gap-3">
              <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 px-3 py-5 text-base font-medium text-slate-600">
                {foto ? `📸 ${foto.name}` : "📷 Tirar foto do serviço concluído *"}
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={(e) => {
                    setFoto(e.target.files?.[0] ?? null);
                    setErro(null);
                  }}
                />
              </label>
              <div className="grid gap-1.5">
                <label className="text-sm font-medium text-slate-700">
                  O que foi feito? <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={descricaoConclusao}
                  onChange={(e) => {
                    setDescricaoConclusao(e.target.value);
                    setErro(null);
                  }}
                  rows={3}
                  placeholder="Descreva o serviço realizado…"
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-base outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30"
                  maxLength={500}
                />
              </div>
              <BotaoGrande cor="verde" onClick={concluir} disabled={ocupado}>
                {ocupado ? "Concluindo…" : "Concluir demanda"}
              </BotaoGrande>
              <button
                onClick={voltar}
                className="text-center text-sm text-slate-400"
              >
                Voltar
              </button>
            </div>
          )}

          {demanda.status === "em_andamento" && passo === "motivo" && (
            <div className="grid gap-2">
              <p className="mb-1 text-center text-sm font-medium text-slate-600">
                O que aconteceu?
              </p>
              {MOTIVOS.map((m) => (
                <BotaoGrande
                  key={m}
                  cor="cinza"
                  onClick={() => registrarMotivo(m)}
                  disabled={ocupado}
                >
                  {m}
                </BotaoGrande>
              ))}
              <button
                onClick={() => setPasso("inicio")}
                className="text-center text-sm text-slate-400"
              >
                Voltar
              </button>
            </div>
          )}
        </div>
      </div>
    </article>
  );
}

function BotaoGrande({
  cor,
  children,
  onClick,
  disabled,
}: {
  cor: "brand" | "verde" | "cinza";
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
}) {
  const cores = {
    brand: "bg-brand-600 hover:bg-brand-700 text-white",
    verde: "bg-emerald-600 hover:bg-emerald-700 text-white",
    cinza: "bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300",
  }[cor];
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`w-full rounded-xl px-4 py-4 text-base font-bold transition disabled:opacity-60 ${cores}`}
    >
      {children}
    </button>
  );
}
