"use client";

import type { ChangeEvent } from "react";

type Props = {
  accept?: string;
  multiple?: boolean;
  arquivoNome?: string | null;
  onEscolheu: (files: File[]) => void;
};

const labelCls =
  "flex cursor-pointer items-center justify-center rounded-lg border border-dashed border-slate-300 bg-white px-3 py-3 text-center text-sm font-medium text-slate-600 hover:bg-slate-50";

function tipoDoArquivo(
  f: File,
  origem: "foto" | "video" | "galeria",
): string {
  if (f.type) return f.type;
  const n = (f.name || "").toLowerCase();
  if (origem === "video" || /\.(mp4|mov|webm|m4v|3gp)$/.test(n)) {
    return "video/mp4";
  }
  return "image/jpeg";
}

export function EscolherMidia({
  accept = "image/*",
  multiple = false,
  arquivoNome,
  onEscolheu,
}: Props) {
  async function aoMudar(
    e: ChangeEvent<HTMLInputElement>,
    origem: "foto" | "video" | "galeria",
  ) {
    const lista = e.target.files ? Array.from(e.target.files) : [];
    const copias: File[] = [];
    for (const f of lista) {
      const buf = await f.arrayBuffer();
      const tipo = tipoDoArquivo(f, origem);
      const nome =
        f.name?.trim() ||
        (tipo.startsWith("video/") ? "video.mp4" : "foto.jpg");
      copias.push(new File([buf], nome, { type: tipo }));
    }
    e.target.value = "";
    if (copias.length === 0) return;
    onEscolheu(copias);
  }

  const incluiVideo = accept.includes("video");

  return (
    <div className="grid gap-2">
      <div className="grid grid-cols-2 gap-2">
        <label className={labelCls}>
          📷 Tirar foto
          <input
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => aoMudar(e, "foto")}
          />
        </label>
        <label className={labelCls}>
          🖼️ Galeria
          <input
            type="file"
            accept={accept}
            multiple={multiple}
            className="hidden"
            onChange={(e) => aoMudar(e, "galeria")}
          />
        </label>
        {incluiVideo ? (
          <label className={`${labelCls} col-span-2`}>
            🎥 Gravar vídeo
            <input
              type="file"
              accept="video/*"
              capture="environment"
              className="hidden"
              onChange={(e) => aoMudar(e, "video")}
            />
          </label>
        ) : null}
      </div>
      {arquivoNome ? (
        <p className="truncate text-center text-xs text-slate-500">
          📸 {arquivoNome}
        </p>
      ) : null}
    </div>
  );
}
