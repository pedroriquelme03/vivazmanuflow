/**
 * Reduz uma imagem no próprio navegador antes do upload (redimensiona e
 * recomprime como JPEG). Vídeos voltam sem alteração.
 * No Android a câmera às vezes manda o arquivo sem MIME type — ainda tentamos comprimir.
 */
export async function comprimirImagem(
  file: File,
  maxLado = 1600,
  qualidade = 0.7,
): Promise<File> {
  if (file.type.startsWith("video/")) return file;

  try {
    const bitmap = await createImageBitmap(file);
    let { width, height } = bitmap;
    const escala = Math.min(1, maxLado / Math.max(width, height));
    width = Math.round(width * escala);
    height = Math.round(height * escala);

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close?.();

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", qualidade),
    );
    if (!blob) return file;

    const base = (file.name || "foto").replace(/\.[^.]+$/, "") || "foto";
    return new File([blob], `${base}.jpg`, { type: "image/jpeg" });
  } catch {
    return file;
  }
}
