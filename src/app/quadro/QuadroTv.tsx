"use client";

import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  type DemandaKanban,
  ordenarFilaPorPeso,
} from "@/lib/demanda-select";
import {
  PRAZO_COR,
  calcularUrgencia,
  formatarData,
  nomeSublocal,
  urlFotoNaoPerturbe,
  urlFotoColaboradorMaisRecente,
} from "@/lib/demanda-ui";
import type { Enums } from "@/lib/database.types";
import { PrioridadeTag } from "@/components/PrioridadeTag";
import { BrandMark } from "@/components/BrandMark";

type Status = Enums<"demanda_status">;

const COLUNAS: { status: Status; titulo: string; selo?: string }[] = [
  { status: "aberta", titulo: "Abertas" },
  { status: "atribuida", titulo: "Atribuídas" },
  { status: "em_andamento", titulo: "Em andamento" },
  { status: "aguardando_validacao", titulo: "Validação" },
  { status: "concluida", titulo: "Concluídas", selo: "hoje" },
];

const TZ_DIA = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/Sao_Paulo",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const TZ_DATA = new Intl.DateTimeFormat("pt-BR", {
  timeZone: "America/Sao_Paulo",
  weekday: "short",
  day: "2-digit",
  month: "short",
});

type Clima = {
  temp: number;
  max: number;
  min: number;
  texto: string;
  emoji: string;
};

function climaDeCodigo(code: number): { texto: string; emoji: string } {
  if (code === 0) return { texto: "Céu limpo", emoji: "☀️" };
  if (code <= 3) return { texto: "Parcialmente nublado", emoji: "⛅" };
  if (code <= 48) return { texto: "Neblina", emoji: "🌫️" };
  if (code <= 67) return { texto: "Chuva", emoji: "🌧️" };
  if (code <= 77) return { texto: "Garoa fria", emoji: "🌨️" };
  if (code <= 82) return { texto: "Pancadas de chuva", emoji: "🌦️" };
  return { texto: "Trovoada", emoji: "⛈️" };
}

function ehHoje(iso: string | null) {
  if (!iso) return false;
  return TZ_DIA.format(new Date(iso)) === TZ_DIA.format(new Date());
}

function comoDemandas(data: unknown): DemandaKanban[] {
  if (!Array.isArray(data)) return [];
  return data as DemandaKanban[];
}

function assinatura(itens: DemandaKanban[]) {
  return JSON.stringify(
    itens.map((d) => ({
      id: d.id,
      status: d.status,
      peso: d.peso,
      colaborador: d.colaborador?.nome,
      motivo: d.motivo_nao_conclusao,
      concluido: d.concluido_em,
    })),
  );
}

export function QuadroTv() {
  const supabase = createClient();
  const [demandas, setDemandas] = useState<DemandaKanban[]>([]);
  const [agora, setAgora] = useState(() => Date.now());
  const [erro, setErro] = useState<string | null>(null);
  const [aoVivo, setAoVivo] = useState(false);
  const [idsNovos, setIdsNovos] = useState<Set<string>>(new Set());
  const [clima, setClima] = useState<Clima | null>(null);
  const conhecidos = useRef<Set<string>>(new Set());
  const primeiraCarga = useRef(true);

  const recarregar = useCallback(async () => {
    const { data, error } = await supabase.rpc("demandas_quadro_tv");
    if (error) {
      setAoVivo(false);
      setErro(
        error.message.includes("Could not find") ||
          error.message.includes("schema cache")
          ? "Rode o SQL supabase/migrations/20260901140000_quadro_tv.sql no Supabase."
          : "Sem conexão com o quadro.",
      );
      return;
    }
    const next = comoDemandas(data);
    setErro(null);
    setAoVivo(true);

    if (primeiraCarga.current) {
      conhecidos.current = new Set(next.map((d) => d.id));
      primeiraCarga.current = false;
      setDemandas(next);
      return;
    }

    const chegando = next
      .filter((d) => !conhecidos.current.has(d.id))
      .map((d) => d.id);
    if (chegando.length > 0) {
      conhecidos.current = new Set(next.map((d) => d.id));
      setIdsNovos((atual) => {
        const n = new Set(atual);
        chegando.forEach((id) => n.add(id));
        return n;
      });
      window.setTimeout(() => {
        setIdsNovos((atual) => {
          const n = new Set(atual);
          chegando.forEach((id) => n.delete(id));
          return n;
        });
      }, 8000);
    } else {
      conhecidos.current = new Set(next.map((d) => d.id));
    }

    setDemandas((prev) => (assinatura(prev) === assinatura(next) ? prev : next));
  }, [supabase]);

  useEffect(() => {
    recarregar();
    const t = setInterval(recarregar, 8000);
    return () => clearInterval(t);
  }, [recarregar]);

  useEffect(() => {
    const canal = supabase
      .channel("quadro-tv")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "demandas" },
        () => recarregar(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(canal);
    };
  }, [supabase, recarregar]);

  useEffect(() => {
    const t = setInterval(() => setAgora(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    async function buscarClima() {
      try {
        const url =
          "https://api.open-meteo.com/v1/forecast?latitude=-25.5478&longitude=-54.5882&current=temperature_2m,weather_code&daily=temperature_2m_max,temperature_2m_min&timezone=America%2FSao_Paulo&forecast_days=1";
        const res = await fetch(url);
        if (!res.ok) return;
        const json = await res.json();
        const code = Number(json.current?.weather_code ?? 0);
        const rotulo = climaDeCodigo(code);
        setClima({
          temp: Math.round(json.current?.temperature_2m),
          max: Math.round(json.daily?.temperature_2m_max?.[0]),
          min: Math.round(json.daily?.temperature_2m_min?.[0]),
          texto: rotulo.texto,
          emoji: rotulo.emoji,
        });
      } catch {
        /* TV segue mesmo sem clima */
      }
    }
    buscarClima();
    const t = setInterval(buscarClima, 15 * 60 * 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const nav = navigator as Navigator & {
      wakeLock?: { request: (type: "screen") => Promise<{ release: () => void }> };
    };
    let lock: { release: () => void } | undefined;
    nav.wakeLock
      ?.request("screen")
      .then((l) => {
        lock = l;
      })
      .catch(() => {});
    return () => {
      lock?.release();
    };
  }, []);

  const porStatus = (s: Status) => {
    let itens = demandas.filter((d) => d.status === s && !d.arquivado);
    if (s === "concluida") {
      itens = itens.filter((d) => ehHoje(d.concluido_em));
    }
    return ordenarFilaPorPeso(itens);
  };

  return (
    <div className="flex h-dvh w-dvw max-w-full flex-col overflow-hidden bg-slate-100">
      <header className="shrink-0 bg-[#063b45] text-white">
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4 px-5 py-4">
          <div className="min-w-0">
            <BlocoHoraClima agora={agora} clima={clima} />
          </div>
          <div className="flex items-center justify-center gap-3">
            <BrandMark className="h-14 w-14 rounded-xl bg-white/10 shadow-none" />
            <div className="text-center leading-tight">
              <p className="text-xl font-bold tracking-tight">Vivaz Cataratas</p>
              <p className="text-sm font-medium text-white/65">Manutenção</p>
            </div>
          </div>
          <div className="flex items-center justify-end">
            {aoVivo ? (
              <span className="inline-flex items-center gap-2 rounded-full bg-emerald-500/20 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-emerald-200">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="quadro-live-dot absolute inline-flex h-full w-2.5 rounded-full bg-emerald-300" />
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-400" />
                </span>
                Ao vivo
              </span>
            ) : (
              <span className="inline-flex items-center gap-2 rounded-full bg-red-500/20 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-red-200">
                <span className="h-2.5 w-2.5 rounded-full bg-red-400" />
                Offline
              </span>
            )}
          </div>
        </div>
      </header>

      {erro && (
        <p className="shrink-0 bg-amber-50 px-4 py-2 text-center text-sm text-amber-800">
          {erro}
        </p>
      )}

      <div className="flex min-h-0 min-w-0 flex-1 gap-3 overflow-x-auto p-4 xl:grid xl:grid-cols-5 xl:overflow-hidden">
        {COLUNAS.map((col) => (
          <ColunaTv
            key={col.status}
            titulo={col.titulo}
            selo={col.selo}
            itens={porStatus(col.status)}
            agora={agora}
            idsNovos={idsNovos}
          />
        ))}
      </div>
    </div>
  );
}

function partesHora(agora: number) {
  const partes = Object.fromEntries(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: "America/Sao_Paulo",
      hour: "numeric",
      minute: "numeric",
      second: "numeric",
      hourCycle: "h23",
    })
      .formatToParts(new Date(agora))
      .map((p) => [p.type, p.value]),
  );
  return {
    hh: String(partes.hour).padStart(2, "0"),
    mm: String(partes.minute).padStart(2, "0"),
    ss: String(partes.second).padStart(2, "0"),
  };
}

function BlocoHoraClima({
  agora,
  clima,
}: {
  agora: number;
  clima: Clima | null;
}) {
  const { hh, mm, ss } = partesHora(agora);
  const data = TZ_DATA.format(agora);

  return (
    <div className="flex min-w-0 items-center gap-4">
      <div>
        <div className="flex items-center gap-1.5">
          <CaixaTempo valor={hh} />
          <span className="pb-0.5 text-xl font-semibold text-white/40">:</span>
          <CaixaTempo valor={mm} />
          <span className="pb-0.5 text-xl font-semibold text-white/40">:</span>
          <CaixaTempo valor={ss} claro />
        </div>
        <p className="mt-1.5 text-xs capitalize text-white/50">{data}</p>
      </div>
      {clima && (
        <div className="hidden min-w-0 border-l border-white/15 pl-4 sm:block">
          <p className="text-lg font-semibold leading-tight">
            {clima.emoji} {clima.temp}°
          </p>
          <p className="truncate text-xs text-white/55">
            Foz do Iguaçu · {clima.texto}
          </p>
          <p className="text-[11px] text-white/40">
            máx {clima.max}° · mín {clima.min}°
          </p>
        </div>
      )}
    </div>
  );
}

function CaixaTempo({ valor, claro }: { valor: string; claro?: boolean }) {
  return (
    <span
      className={`rounded-lg px-2 py-1 text-2xl font-semibold tabular-nums tracking-wide ${
        claro ? "bg-white/5 text-white/70" : "bg-white/10 text-white"
      }`}
    >
      {valor}
    </span>
  );
}

function ColunaTv({
  titulo,
  selo,
  itens,
  agora,
  idsNovos,
}: {
  titulo: string;
  selo?: string;
  itens: DemandaKanban[];
  agora: number;
  idsNovos: Set<string>;
}) {
  const listaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = listaRef.current;
    if (!el) return;

    const PX_POR_SEGUNDO = 12;
    const PAUSA_MS = 900;
    let dir = 1;
    let pausaAte = 0;
    let ultimo = performance.now();
    let raf = 0;

    const tick = (agora: number) => {
      const dt = Math.min(0.05, (agora - ultimo) / 1000);
      ultimo = agora;

      if (el.scrollHeight <= el.clientHeight + 8) {
        el.scrollTop = 0;
        dir = 1;
        raf = requestAnimationFrame(tick);
        return;
      }

      if (agora < pausaAte) {
        raf = requestAnimationFrame(tick);
        return;
      }

      el.scrollTop += dir * PX_POR_SEGUNDO * dt;
      const noFim = el.scrollTop + el.clientHeight >= el.scrollHeight - 1;
      const noTopo = el.scrollTop <= 0;

      if (dir > 0 && noFim) {
        el.scrollTop = el.scrollHeight - el.clientHeight;
        dir = -1;
        pausaAte = agora + PAUSA_MS;
      } else if (dir < 0 && noTopo) {
        el.scrollTop = 0;
        dir = 1;
        pausaAte = agora + PAUSA_MS;
      }

      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <section className="flex h-full min-h-0 w-[min(20rem,88vw)] shrink-0 flex-col overflow-hidden rounded-xl bg-slate-200/80 p-2 xl:w-auto xl:min-w-0">
      <header className="relative z-[1] shrink-0 px-2 py-1.5">
        <div className="flex items-center justify-between gap-2">
          <h2 className="flex items-baseline gap-1.5 text-sm font-semibold text-slate-700">
            {titulo}
            {selo && (
              <span className="text-[11px] font-medium text-slate-400">
                {selo}
              </span>
            )}
          </h2>
          <span className="rounded-full bg-white px-2 py-0.5 text-xs font-medium text-slate-500">
            {itens.length}
          </span>
        </div>
      </header>
      <div
        ref={listaRef}
        className="relative z-[1] flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto overscroll-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {itens.map((d, i) => (
          <CardTv
            key={d.id}
            demanda={d}
            agora={agora}
            novo={idsNovos.has(d.id)}
            delay={Math.min(i, 8) * 0.06}
          />
        ))}
        {itens.length === 0 && (
          <p className="px-2 py-6 text-center text-xs text-slate-400">
            Nada aqui.
          </p>
        )}
      </div>
    </section>
  );
}

function CardTv({
  demanda,
  agora,
  novo,
  delay,
}: {
  demanda: DemandaKanban;
  agora: number;
  novo: boolean;
  delay: number;
}) {
  const urgencia =
    demanda.status === "concluida" || demanda.status === "cancelada"
      ? null
      : calcularUrgencia(demanda.prazo_confirmado, demanda.atribuido_em, agora);

  const pesoMax = demanda.afeta_experiencia || (demanda.peso ?? 0) >= 10;
  const fotoNaoPerturbe = urlFotoNaoPerturbe(
    demanda.motivo_nao_conclusao,
    demanda.anexos,
  );
  const fotoConclusao =
    demanda.status === "aguardando_validacao"
      ? urlFotoColaboradorMaisRecente(demanda.anexos)
      : null;

  return (
    <article
      className={`quadro-card-in quadro-card-brilho min-w-0 shrink-0 rounded-lg border bg-white p-3 shadow-sm ${
        pesoMax ? "card-peso-max" : "border-slate-200"
      } ${novo ? "quadro-card-novo" : ""}`}
      style={
        {
          animationDelay: `${delay}s`,
          "--brilho-delay": `${delay * 2.2}s`,
        } as CSSProperties
      }
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-semibold leading-tight text-slate-800">
          {demanda.titulo}
        </p>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <PrioridadeTag prioridade={demanda.prioridade} />
          <span
            className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
              pesoMax ? "bg-red-100 text-red-700" : "bg-slate-100 text-slate-600"
            }`}
          >
            Peso {demanda.peso ?? "—"}
          </span>
        </div>
      </div>

      {pesoMax && (
        <p className="mt-1 text-[11px] font-semibold text-red-600">
          Afeta experiência do hóspede
        </p>
      )}

      {demanda.evento?.nome && (
        <p className="mt-1 text-[11px] font-semibold text-violet-700">
          🎉 Evento: {demanda.evento.nome}
        </p>
      )}

      <p className="mt-1 text-xs text-slate-500">
        {demanda.propriedade?.nome ? `${demanda.propriedade.nome}` : ""}
        {nomeSublocal(demanda.sublocal, demanda.local?.nome)
          ? ` · ${nomeSublocal(demanda.sublocal, demanda.local?.nome)}`
          : ""}
        {demanda.solicitante?.nome
          ? `${demanda.propriedade?.nome || nomeSublocal(demanda.sublocal, demanda.local?.nome) ? " · " : ""}${demanda.solicitante.nome}`
          : ""}
      </p>

      {demanda.colaborador?.nome ? (
        <p className="mt-1.5 text-xs font-medium text-slate-600">
          👤 {demanda.colaborador.nome}
        </p>
      ) : (
        <p className="mt-1.5 text-xs font-medium text-amber-600">
          👤 Sem responsável
        </p>
      )}

      {urgencia && (
        <span
          className={`mt-2 inline-block rounded-full px-2 py-0.5 text-xs font-medium ${PRAZO_COR[urgencia.nivel]}`}
        >
          {urgencia.label}
        </span>
      )}

      {demanda.motivo_nao_conclusao && (
        <div className="mt-2 rounded-md bg-amber-50 px-2 py-1.5">
          <p className="text-xs font-semibold text-amber-900">
            Motivo: {demanda.motivo_nao_conclusao}
          </p>
          {fotoNaoPerturbe && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={fotoNaoPerturbe}
              alt=""
              className="mt-1.5 h-24 w-full rounded object-cover"
            />
          )}
        </div>
      )}

      {demanda.status === "aguardando_validacao" && (
        <div className="mt-2 rounded-md bg-sky-50 px-2 py-1.5">
          <p className="text-xs font-semibold text-sky-800">
            Aguardando conferência
          </p>
          {fotoConclusao && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={fotoConclusao}
              alt=""
              className="mt-1.5 h-24 w-full rounded object-cover"
            />
          )}
        </div>
      )}

      {demanda.status === "concluida" && (
        <p className="mt-3 leading-snug text-sm font-medium text-emerald-700">
          Concluída {formatarData(demanda.concluido_em)}
        </p>
      )}
    </article>
  );
}
