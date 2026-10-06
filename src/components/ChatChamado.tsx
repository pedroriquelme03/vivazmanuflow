"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatarData } from "@/lib/demanda-ui";
import {
  juntarMensagens,
  mensagemDe,
  parseChatChamado,
  recursoChatAusente,
  textoMensagemValido,
  type MensagemChamado,
} from "@/lib/chamado-chat";

export function ChatChamado({
  token,
  demandaId,
  lado,
  mensagensIniciais = [],
  podeEnviar = true,
}: {
  token?: string;
  demandaId?: string;
  lado: "solicitante" | "equipe";
  mensagensIniciais?: MensagemChamado[];
  podeEnviar?: boolean;
}) {
  const supabase = useMemo(() => createClient(), []);
  const [mensagens, setMensagens] = useState(mensagensIniciais);
  const [texto, setTexto] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [indisponivel, setIndisponivel] = useState(false);
  const fimRef = useRef<HTMLDivElement>(null);

  const aplicar = useCallback((novas: MensagemChamado[]) => {
    setMensagens((atual) => juntarMensagens(atual, novas));
  }, []);

  const carregar = useCallback(async () => {
    if (token) {
      const { data, error } = await supabase.rpc("listar_mensagens_chamado", {
        p_token: token,
      });
      if (error) {
        if (recursoChatAusente(error.message)) setIndisponivel(true);
        return;
      }
      aplicar(parseChatChamado(data).mensagens);
      return;
    }
    if (!demandaId) return;
    const { data, error } = await supabase
      .from("demanda_mensagens")
      .select("id, autor, autor_nome, texto, criado_em")
      .eq("demanda_id", demandaId)
      .order("criado_em", { ascending: true });
    if (error) {
      if (recursoChatAusente(error.message)) setIndisponivel(true);
      return;
    }
    aplicar(parseChatChamado({ mensagens: data ?? [] }).mensagens);
  }, [aplicar, demandaId, supabase, token]);

  useEffect(() => {
    void carregar();
    const id = window.setInterval(() => void carregar(), 3000);
    return () => window.clearInterval(id);
  }, [carregar]);

  useEffect(() => {
    if (!demandaId) return;
    const canal = supabase
      .channel(`chat-${demandaId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "demanda_mensagens",
          filter: `demanda_id=eq.${demandaId}`,
        },
        (payload) => {
          const msg = mensagemDe(payload.new);
          if (msg) aplicar([msg]);
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(canal);
    };
  }, [aplicar, demandaId, supabase]);

  useEffect(() => {
    fimRef.current?.scrollIntoView({ block: "nearest" });
  }, [mensagens.length]);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    if (!podeEnviar) return;
    const falha = textoMensagemValido(texto);
    if (falha) {
      setErro(falha);
      return;
    }
    setErro(null);
    setEnviando(true);
    const { error } =
      lado === "solicitante" && token
        ? await supabase.rpc("enviar_mensagem_chamado", {
            p_token: token,
            p_texto: texto.trim(),
          })
        : demandaId
          ? await supabase.rpc("equipe_enviar_mensagem", {
              p_demanda_id: demandaId,
              p_texto: texto.trim(),
            })
          : { error: { message: "Não foi possível enviar." } };
    setEnviando(false);
    if (error) {
      setErro(
        recursoChatAusente(error.message)
          ? "Rode o SQL do chat de TI no Supabase e tente de novo."
          : error.message,
      );
      return;
    }
    setTexto("");
    void carregar();
  }

  if (indisponivel) return null;

  return (
    <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <h2 className="text-sm font-semibold text-slate-700">Mensagens</h2>
      <p className="mt-0.5 text-xs text-slate-400">
        As mensagens entram aqui na hora, sem fechar o chamado.
      </p>

      <div className="mt-3 max-h-72 space-y-2 overflow-y-auto rounded-xl bg-slate-50 p-3">
        {mensagens.length === 0 ? (
          <p className="py-4 text-center text-xs text-slate-400">
            Nenhuma mensagem ainda.
          </p>
        ) : (
          mensagens.map((m) => {
            const minha =
              (lado === "solicitante" && m.autor === "solicitante") ||
              (lado === "equipe" && m.autor === "equipe");
            return (
              <div
                key={m.id}
                className={`flex ${minha ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${
                    minha
                      ? "bg-brand-600 text-white"
                      : "border border-slate-200 bg-white text-slate-800"
                  }`}
                >
                  <p
                    className={`text-[11px] font-semibold ${
                      minha ? "text-white/80" : "text-slate-500"
                    }`}
                  >
                    {m.autor_nome}
                  </p>
                  <p className="whitespace-pre-wrap">{m.texto}</p>
                  <p
                    className={`mt-1 text-[10px] ${
                      minha ? "text-white/70" : "text-slate-400"
                    }`}
                  >
                    {formatarData(m.criado_em)}
                  </p>
                </div>
              </div>
            );
          })
        )}
        <div ref={fimRef} />
      </div>

      {podeEnviar ? (
        <form onSubmit={enviar} className="mt-3 grid gap-2">
          <textarea
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            rows={2}
            maxLength={2000}
            placeholder="Escreva uma mensagem…"
            className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30"
          />
          <button
            type="submit"
            disabled={enviando}
            className="cursor-pointer rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:opacity-60"
          >
            {enviando ? "Enviando…" : "Enviar mensagem"}
          </button>
        </form>
      ) : lado === "equipe" ? (
        <p className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-800">
          Pegue ou atribua o chamado para conversar com o solicitante.
        </p>
      ) : null}

      {erro && (
        <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {erro}
        </p>
      )}
    </div>
  );
}
