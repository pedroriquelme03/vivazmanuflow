"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

function chavePublica(base64: string) {
  const pad = "=".repeat((4 - (base64.length % 4)) % 4);
  const normal = (base64 + pad).replace(/-/g, "+").replace(/_/g, "/");
  const bruto = atob(normal);
  const bytes = new Uint8Array(bruto.length);
  for (let i = 0; i < bruto.length; i += 1) bytes[i] = bruto.charCodeAt(i);
  return bytes;
}

async function gravarInscricao() {
  const publica = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  if (!publica || !("serviceWorker" in navigator) || !("PushManager" in window)) {
    return;
  }
  const registro = await navigator.serviceWorker.ready;
  let inscricao = await registro.pushManager.getSubscription();
  if (!inscricao) {
    inscricao = await registro.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: chavePublica(publica),
    });
  }
  const json = inscricao.toJSON();
  if (!json.endpoint || !json.keys?.p256dh || !json.keys.auth) return;
  const supabase = createClient();
  await supabase.rpc("salvar_push_inscricao", {
    p_endpoint: json.endpoint,
    p_p256dh: json.keys.p256dh,
    p_auth: json.keys.auth,
  });
}

/** Pede permissão de aviso. Equipe e solicitante podem ativar. */
export function AvisoPush() {
  const [visivel, setVisivel] = useState(false);
  const [texto, setTexto] = useState("Receber no celular quando abrir um chamado novo.");
  const [ocupado, setOcupado] = useState(false);

  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY) return;
    if (!("Notification" in window) || !("serviceWorker" in navigator)) return;
    let ativo = true;
    void (async () => {
      const supabase = createClient();
      const { data } = await supabase.auth.getUser();
      if (!data.user || !ativo) return;
      const perfil = await supabase
        .from("usuarios")
        .select("role")
        .eq("id", data.user.id)
        .maybeSingle();
      const papel = perfil.data?.role;
      if (!papel || !ativo) return;
      if (papel === "solicitante") {
        setTexto("Receber no celular quando responderem seu chamado.");
      }
      if (Notification.permission === "granted") {
        await gravarInscricao();
        return;
      }
      if (Notification.permission === "default") setVisivel(true);
    })();
    return () => {
      ativo = false;
    };
  }, []);

  if (!visivel) return null;

  return (
    <div className="flex items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-2 text-sm text-slate-700">
      <p className="min-w-0 flex-1">{texto}</p>
      <button
        type="button"
        disabled={ocupado}
        onClick={() => {
          setOcupado(true);
          void Notification.requestPermission().then(async (permissao) => {
            if (permissao === "granted") {
              await gravarInscricao();
              setVisivel(false);
            }
            setOcupado(false);
          });
        }}
        className="shrink-0 rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
      >
        {ocupado ? "Ativando…" : "Ativar avisos"}
      </button>
    </div>
  );
}
