"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { comprimirImagem } from "@/lib/comprimir-imagem";
import {
  COLAB_SELECT,
  GERAIS_SELECT,
  type AnexoDemanda,
  type DemandaColab,
  type DemandaGeral,
  ordenarFilaPorPeso,
} from "@/lib/demanda-select";
import type { TablesUpdate, Enums } from "@/lib/database.types";
import {
  calcularUrgencia,
  PRIORIDADE_BADGE,
  formatarData,
  nomeSublocal,
  MOTIVO_NAO_PERTURBE,
  STATUS_BADGE,
  STATUS_LABEL,
  mensagemDevolucaoGestor,
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
                    {nomeSublocal(d.sublocal, d.local?.nome)
                      ? `📍 ${nomeSublocal(d.sublocal, d.local?.nome)} · `
                      : ""}
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
                  <AnexosDoSolicitante anexos={d.anexos} />
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
  status: Enums<"demanda_status">;
  concluido_em: string | null;
  criado_em: string;
  sublocal: string | null;
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
      const { data } = await supabase
        .from("demandas")
        .select(
          "id, titulo, prioridade, status, concluido_em, criado_em, sublocal, local:locais(nome)",
        )
        .eq("colaborador_id", colaboradorId)
        .in("status", ["concluida", "aguardando_validacao"])
        .eq("arquivado", false)
        .order("criado_em", { ascending: false });
      const todos = (data as unknown as ItemHistorico[]) ?? [];
      const inicio = inicioPeriodo(nDias).getTime();
      setItens(
        todos.filter((i) => {
          if (i.status === "aguardando_validacao") return true;
          const quando = i.concluido_em
            ? new Date(i.concluido_em).getTime()
            : 0;
          return quando >= inicio;
        }),
      );
      setCarregando(false);
    },
    [supabase, colaboradorId],
  );

  useEffect(() => {
    carregar(dias);
  }, [dias, carregar]);

  const aguardando = useMemo(
    () => itens.filter((i) => i.status === "aguardando_validacao"),
    [itens],
  );
  const concluidas = useMemo(
    () => itens.filter((i) => i.status === "concluida"),
    [itens],
  );

  const porPrioridade = useMemo(() => {
    const c = { alta: 0, media: 0, baixa: 0 };
    for (const i of concluidas) c[i.prioridade]++;
    return c;
  }, [concluidas]);

  return (
    <>
      <h1 className="text-xl font-bold">Histórico</h1>
      <p className="mt-0.5 text-sm text-slate-500">
        O que está em validação e o que já foi concluído de fato.
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
          Concluídas de fato
        </p>
        <p className="mt-1 text-3xl font-bold text-slate-900">
          {carregando ? "…" : concluidas.length}
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
      ) : aguardando.length === 0 && concluidas.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-400">
          Nenhuma demanda neste período.
        </div>
      ) : (
        <div className="mt-4 grid gap-5">
          <section>
            <h2 className="text-sm font-bold text-slate-700">
              Aguardando validação
              <span className="ml-2 font-medium text-slate-400">
                {aguardando.length}
              </span>
            </h2>
            {aguardando.length === 0 ? (
              <p className="mt-2 text-sm text-slate-400">
                Nenhuma demanda esperando conferência.
              </p>
            ) : (
              <ul className="mt-2 grid gap-2">
                {aguardando.map((i) => (
                  <li
                    key={i.id}
                    className="rounded-xl border border-sky-200 bg-sky-50 p-3.5 shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-semibold text-slate-800">
                        {i.titulo}
                      </p>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${STATUS_BADGE[i.status]}`}
                      >
                        {STATUS_LABEL[i.status]}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-sky-800">
                      Enviada para o gestor conferir. Ainda não está concluída.
                    </p>
                    <p className="mt-1 text-xs text-slate-400">
                      {nomeSublocal(i.sublocal, i.local?.nome) ?? ""}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section>
            <h2 className="text-sm font-bold text-slate-700">
              Concluídas
              <span className="ml-2 font-medium text-slate-400">
                {concluidas.length}
              </span>
            </h2>
            {concluidas.length === 0 ? (
              <p className="mt-2 text-sm text-slate-400">
                Nenhuma demanda concluída neste período.
              </p>
            ) : (
              <ul className="mt-2 grid gap-2">
                {concluidas.map((i) => (
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
                    <p className="mt-1 text-xs text-emerald-700">
                      Concluída de fato
                    </p>
                    <p className="mt-1 text-xs text-slate-400">
                      {nomeSublocal(i.sublocal, i.local?.nome)
                        ? `${nomeSublocal(i.sublocal, i.local?.nome)} · `
                        : ""}
                      {formatarData(i.concluido_em)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
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

type Passo = "inicio" | "foto" | "motivo" | "foto_nao_perturbe";

const MOTIVOS = [
  "Falta material",
  "Preciso de ajuda",
  "Vou continuar depois",
  MOTIVO_NAO_PERTURBE,
  "Terceirizar tarefa",
];

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
  const msgDevolucao = mensagemDevolucaoGestor(demanda.historico);

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

  async function enviarFotoColaborador(pasta: string, arquivoOrigem: File) {
    const arquivo = await comprimirImagem(arquivoOrigem);
    const caminho = `${pasta}/${crypto.randomUUID()}.jpg`;
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
  }

  async function concluir() {
    if (!foto) {
      setErro("Envie uma foto do serviço concluído.");
      return;
    }
    if (!descricaoConclusao.trim()) {
      setErro("Descreva o que foi feito.");
      return;
    }
    setOcupado(true);
    setErro(null);
    try {
      await enviarFotoColaborador("conclusao", foto);

      const updates: TablesUpdate<"demandas"> = {
        status: "aguardando_validacao",
        motivo_nao_conclusao: null,
      };
      const { error: updErro } = await supabase
        .from("demandas")
        .update(updates)
        .eq("id", demanda.id);
      if (updErro) throw new Error();

      await supabase.from("demanda_historico").insert({
        demanda_id: demanda.id,
        status_anterior: "em_andamento",
        status_novo: "aguardando_validacao",
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
    if (motivo === MOTIVO_NAO_PERTURBE) {
      setFoto(null);
      setErro(null);
      setPasso("foto_nao_perturbe");
      return;
    }

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

  async function confirmarNaoPerturbe() {
    if (!foto) {
      setErro("Envie uma foto do aviso de não perturbe.");
      return;
    }
    setOcupado(true);
    setErro(null);
    try {
      await enviarFotoColaborador("nao-perturbe", foto);
      const { error } = await supabase
        .from("demandas")
        .update({ motivo_nao_conclusao: MOTIVO_NAO_PERTURBE })
        .eq("id", demanda.id);
      if (error) throw new Error();
      setSinalizado(MOTIVO_NAO_PERTURBE);
      setFoto(null);
      setPasso("inicio");
      onMudou();
    } catch {
      setErro("Falha ao enviar a foto. Verifique a internet e tente de novo.");
    } finally {
      setOcupado(false);
    }
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
          {nomeSublocal(demanda.sublocal, demanda.local?.nome)
            ? `📍 ${nomeSublocal(demanda.sublocal, demanda.local?.nome)} · `
            : ""}
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

        <AnexosDoSolicitante anexos={demanda.anexos} />

        {msgDevolucao && demanda.status === "em_andamento" && (
          <div className="mt-3 rounded-xl border border-amber-300 bg-amber-50 px-3 py-3">
            <p className="text-sm font-bold text-amber-900">
              Demanda devolvida pelo gestor
            </p>
            <p className="mt-1 text-sm text-amber-800">
              {msgDevolucao}
            </p>
          </div>
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
                {msgDevolucao
                  ? "A demanda foi devolvida. Já atendeu o que o gestor pediu?"
                  : "A demanda foi atendida?"}
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
                {foto ? `📸 ${foto.name}` : "📷 Tirar foto / escolher da galeria *"}
                <input
                  type="file"
                  accept="image/*"
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
                {ocupado ? "Enviando…" : "Enviar para validação"}
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

          {demanda.status === "em_andamento" && passo === "foto_nao_perturbe" && (
            <div className="grid gap-3">
              <p className="text-center text-sm font-medium text-slate-600">
                Envie uma foto do aviso de não perturbe.
              </p>
              <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 px-3 py-5 text-base font-medium text-slate-600">
                {foto ? `📸 ${foto.name}` : "📷 Tirar foto / escolher da galeria *"}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    setFoto(e.target.files?.[0] ?? null);
                    setErro(null);
                  }}
                />
              </label>
              <BotaoGrande
                cor="cinza"
                onClick={confirmarNaoPerturbe}
                disabled={ocupado}
              >
                {ocupado ? "Enviando…" : "Registrar não perturbe"}
              </BotaoGrande>
              <button
                onClick={() => {
                  setFoto(null);
                  setErro(null);
                  setPasso("motivo");
                }}
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

function AnexosDoSolicitante({ anexos }: { anexos?: AnexoDemanda[] | null }) {
  const itens = (anexos ?? []).filter((a) => a.enviado_por === "solicitante");
  if (itens.length === 0) return null;

  return (
    <div className="mt-3 grid grid-cols-1 gap-2">
      {itens.map((a, i) =>
        a.tipo === "video" ? (
          <video
            key={`${a.url}-${i}`}
            src={a.url}
            controls
            playsInline
            className="max-h-56 w-full rounded-lg bg-black"
          />
        ) : (
          <a
            key={`${a.url}-${i}`}
            href={a.url}
            target="_blank"
            rel="noopener noreferrer"
            className="block"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={a.url}
              alt="Foto enviada na abertura da demanda"
              className="max-h-56 w-full rounded-lg object-cover"
            />
          </a>
        ),
      )}
    </div>
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
