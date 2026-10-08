type ItemClipboard = {
  kind: string;
  type: string;
  getAsFile: () => File | null;
};

type ClipboardComo = {
  items?: ArrayLike<ItemClipboard> | null;
  files?: ArrayLike<File> | null;
};

function guardarImagem(saida: File[], arquivo: File | null | undefined) {
  if (!arquivo || !arquivo.type.startsWith("image/")) return;
  if (saida.includes(arquivo)) return;
  saida.push(arquivo);
}

/** Prints coladas. Texto puro devolve lista vazia para o campo continuar recebendo. */
export function imagensDoClipboard(
  data: ClipboardComo | null | undefined,
): File[] {
  if (!data) return [];
  const saida: File[] = [];
  if (data.items) {
    for (const item of Array.from(data.items)) {
      if (item.kind !== "file" || !item.type.startsWith("image/")) continue;
      guardarImagem(saida, item.getAsFile());
    }
  }
  if (saida.length === 0 && data.files) {
    for (const arquivo of Array.from(data.files)) {
      guardarImagem(saida, arquivo);
    }
  }
  return saida;
}
