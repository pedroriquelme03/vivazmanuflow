"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { comprimirImagem } from "@/lib/comprimir-imagem";
import { COLAB_SELECT, type DemandaColab } from "@/lib/demanda-select";
import type { TablesUpdate } from "@/lib/database.types";
import { calcularUrgencia, PRAZO_COR } from "@/lib/demanda-ui";

export function ColaboradorPainel({
  demandasIniciais,
  colaboradorId,
  primeiroNome,
}: {
  demandasIniciais: DemandaColab[];
  colaboradorId: string;
  primeiroNome: string;
}) {
  const supabase = useMemo(() => createClient(), []);
  const [demandas, setDemandas] = useState<DemandaColab[]>(demandasIniciais);
  const [agora, setAgora] = useState(() => Date.now());

  const recarregar = useCallback(async () => {
    const { data } = await supabase
      .from("demandas")
      .select(COLAB_SELECT)
      .eq("colaborador_id", colaboradorId)
      .in("status", ["atribuida", "em_andamento"])
      .order("prazo_confirmado", { ascending: true, nullsFirst: false });
    if (data) setDemandas(data as unknown as DemandaColab[]);
  }, [supabase, colaboradorId]);

  useEffect(() => {
    const canal = supabase
      .channel("painel-colaborador")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "demandas",
          filter: `colaborador_id=eq.${colaboradorId}`,
        },
        () => recarregar(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(canal);
    };
  }, [supabase, colaboradorId, recarregar]);

  useEffect(() => {
    const t = setInterval(() => setAgora(Date.now()), 30000);
    return () => clearInterval(t);
  }, []);

  return (
    <main className="mx-auto w-full max-w-md flex-1 px-4 py-6">
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
              onMudou={recarregar}
            />
          ))}
        </div>
      )}
    </main>
  );
}

type Passo = "inicio" | "foto" | "motivo";

const MOTIVOS = ["Falta material", "Preciso de ajuda", "Vou continuar depois"];

function CardColab({
  demanda,
  agora,
  onMudou,
}: {
  demanda: DemandaColab;
  agora: number;
  onMudou: () => void;
}) {
  const supabase = createClient();
  const [passo, setPasso] = useState<Passo>("inicio");
  const [foto, setFoto] = useState<File | null>(null);
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
    onMudou();
  }

  async function concluir() {
    if (!foto) {
      setErro("Tire uma foto do serviço concluído.");
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

      const updates: TablesUpdate<"demandas"> = {
        status: "concluida",
        concluido_em: new Date().toISOString(),
      };
      const { error: updErro } = await supabase
        .from("demandas")
        .update(updates)
        .eq("id", demanda.id);
      if (updErro) throw new Error();

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

  return (
    <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      {/* Cronômetro */}
      <div
        className={`px-4 py-2 text-center text-sm font-bold ${PRAZO_COR[urg.nivel]}`}
      >
        ⏱ {urg.label}
      </div>

      <div className="p-4">
        <h2 className="text-lg font-bold leading-tight">{demanda.titulo}</h2>
        <p className="mt-1 text-sm text-slate-500">
          {demanda.local?.nome ? `📍 ${demanda.local.nome} · ` : ""}
          {demanda.solicitante?.nome}
        </p>
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
                {foto ? `📸 ${foto.name}` : "📷 Tirar foto do serviço concluído"}
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={(e) => setFoto(e.target.files?.[0] ?? null)}
                />
              </label>
              <BotaoGrande cor="verde" onClick={concluir} disabled={ocupado}>
                {ocupado ? "Concluindo…" : "Confirmar conclusão"}
              </BotaoGrande>
              <button
                onClick={() => {
                  setPasso("inicio");
                  setFoto(null);
                  setErro(null);
                }}
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
