/** Normaliza código de equipamento (mesma regra do banco). */
export function normalizarCodigo(raw: string) {
  return raw
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9\-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

/** Gera código a partir do nome + sufixo curto. */
export function gerarCodigoEquipamento(nome: string) {
  const base = normalizarCodigo(
    nome
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/'/g, ""),
  );
  const sufixo = Math.random().toString(36).slice(2, 6).toUpperCase();
  const cortado = (base || "EQ").slice(0, 24);
  return `${cortado}-${sufixo}`;
}

export function urlEquipamento(codigo: string, origin?: string) {
  const base =
    origin ??
    (typeof window !== "undefined" ? window.location.origin : "");
  return `${base}/equipamento/${encodeURIComponent(normalizarCodigo(codigo))}`;
}

export function urlQrCode(data: string, size = 280) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(data)}`;
}

export const TIPOS_MANUTENCAO = [
  { value: "preventiva", label: "Preventiva" },
  { value: "corretiva", label: "Corretiva" },
  { value: "inspecao", label: "Inspeção" },
  { value: "outro", label: "Outro" },
] as const;
