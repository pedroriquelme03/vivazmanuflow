import type { TextoPdf } from "@/lib/mapa-uhs";

/** Extrai os textos do PDF com a posição de cada um (no navegador). */
export async function textosDoPdf(arquivo: File): Promise<TextoPdf[]> {
  const pdfjs = await import("pdfjs-dist");
  if (!pdfjs.GlobalWorkerOptions.workerSrc) {
    pdfjs.GlobalWorkerOptions.workerSrc = new URL(
      "pdfjs-dist/build/pdf.worker.min.mjs",
      import.meta.url,
    ).toString();
  }
  const doc = await pdfjs.getDocument({ data: new Uint8Array(await arquivo.arrayBuffer()) }).promise;
  const textos: TextoPdf[] = [];
  try {
    for (let pagina = 1; pagina <= doc.numPages; pagina++) {
      const page = await doc.getPage(pagina);
      const altura = page.getViewport({ scale: 1 }).height;
      const conteudo = await page.getTextContent();
      for (const item of conteudo.items) {
        if (!("str" in item) || !item.str.trim()) continue;
        textos.push({ pagina, x: item.transform[4], y: altura - item.transform[5], texto: item.str });
      }
    }
  } finally {
    await doc.destroy();
  }
  return textos;
}
