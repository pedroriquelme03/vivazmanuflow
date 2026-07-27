/**
 * Reduz uma imagem no próprio navegador antes do upload (redimensiona e
 * recomprime como JPEG). Vídeos e formatos não suportados voltam sem alteração.
 */
export async function comprimirImagem(
  file: File,
  maxLado = 1600,
  qualidade = 0.7,
): Promise<File> {
  if (!file.type.startsWith("image/")) return file;

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

    const nome = file.name.replace(/\.[^.]+$/, "") + ".jpg";
    return new File([blob], nome, { type: "image/jpeg" });
  } catch {
    // Se o navegador não conseguir decodificar (ex.: HEIC antigo), envia o original.
    return file;
  }
}
