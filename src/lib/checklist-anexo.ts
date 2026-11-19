/**
 * Anexo de uma pergunta do checklist: foto, vídeo ou documento (PDF, Word, Excel...).
 * Não é só para a governança, então aceita os documentos de escritório mais comuns.
 */

export type TipoAnexo = "foto" | "video" | "documento";

/** Limite por arquivo (o Storage do Supabase aceita até 50 MB por padrão). */
export const MAX_ANEXO_BYTES = 50 * 1024 * 1024;

const EXT_FOTO = ["jpg", "jpeg", "png", "gif", "webp", "heic", "heif", "bmp"];
const EXT_VIDEO = ["mp4", "mov", "webm", "m4v", "3gp", "avi", "mkv"];
const EXT_DOCUMENTO = ["pdf", "doc", "docx", "xls", "xlsx", "csv", "ppt", "pptx", "txt", "odt", "ods"];

/** Valor do `accept` do campo de arquivo. */
export const ACEITA_ANEXO = ["image/*", "video/*", ...EXT_DOCUMENTO.map((e) => `.${e}`)].join(",");

/** Extensão em minúsculas de um nome de arquivo ou URL (sem a query). */
export function extensao(nomeOuUrl: string) {
  const semQuery = nomeOuUrl.split(/[?#]/)[0];
  const m = /\.([a-z0-9]+)$/i.exec(semQuery);
  return m ? m[1].toLowerCase() : "";
}

/** Foto, vídeo ou documento, pelo tipo MIME (quando tem) ou pela extensão. Desconhecido → null. */
export function tipoAnexo(nomeOuUrl: string, mime?: string | null): TipoAnexo | null {
  if (mime?.startsWith("image/")) return "foto";
  if (mime?.startsWith("video/")) return "video";
  const ext = extensao(nomeOuUrl);
  if (EXT_FOTO.includes(ext)) return "foto";
  if (EXT_VIDEO.includes(ext)) return "video";
  if (EXT_DOCUMENTO.includes(ext)) return "documento";
  // Câmera do Android às vezes manda a foto sem tipo nem extensão.
  if (!mime && !ext) return "foto";
  return null;
}

/** Nome curto para mostrar o documento (ex.: "relatorio.pdf"). */
export function nomeDoAnexo(nomeOuUrl: string) {
  const semQuery = nomeOuUrl.split(/[?#]/)[0];
  return decodeURIComponent(semQuery.split("/").pop() || "arquivo");
}
