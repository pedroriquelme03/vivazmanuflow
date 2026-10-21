"use client";

import { useEffect } from "react";
import { chavePublicaEmBytes, inscreverNoPush } from "@/lib/aviso-push";
import { createClient } from "@/lib/supabase/client";

async function gravarInscricao() {
  const publica = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const chave = publica ? chavePublicaEmBytes(publica) : null;
  if (!chave || !("serviceWorker" in navigator) || !("PushManager" in window)) {
    if (publica && !chave) console.error("aviso push", "chave pública inválida");
    return;
  }
  const registro = await navigator.serviceWorker.ready;
  const inscricao = await inscreverNoPush(registro.pushManager, chave);
  if (!inscricao) return;
  const json = inscricao.toJSON();
  if (!json.endpoint || !json.keys?.p256dh || !json.keys.auth) return;
  const supabase = createClient();
  const { error } = await supabase.rpc("salvar_push_inscricao", {
    p_endpoint: json.endpoint,
    p_p256dh: json.keys.p256dh,
    p_auth: json.keys.auth,
  });
  if (error) console.error("aviso push", error.message);
}

async function usuarioLogado() {
  const supabase = createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return false;
  const perfil = await supabase
    .from("usuarios")
    .select("role")
    .eq("id", data.user.id)
    .maybeSingle();
  return Boolean(perfil.data?.role);
}

/** Inscreve quem já liberou o aviso no celular. Sem botão na tela. */
export function AvisoPush() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY) return;
    if (!("Notification" in window) || !("serviceWorker" in navigator)) return;
    if (Notification.permission === "denied") return;

    let ativo = true;
    let pedindo = false;

    const inscrever = (pedir: boolean) => {
      if (!ativo || pedindo) return;
      if (Notification.permission === "denied") return;
      if (Notification.permission !== "granted" && !pedir) return;
      pedindo = true;
      void (async () => {
        if (!(await usuarioLogado()) || !ativo) return;
        if (Notification.permission === "default") {
          const permissao = await Notification.requestPermission();
          if (permissao !== "granted" || !ativo) return;
        }
        await gravarInscricao();
      })().finally(() => {
        pedindo = false;
      });
    };

    inscrever(false);
    const noToque = () => {
      inscrever(true);
      if (Notification.permission === "granted") {
        document.removeEventListener("pointerdown", noToque);
      }
    };
    if (Notification.permission !== "granted") {
      document.addEventListener("pointerdown", noToque);
    }
    return () => {
      ativo = false;
      document.removeEventListener("pointerdown", noToque);
    };
  }, []);

  return null;
}
