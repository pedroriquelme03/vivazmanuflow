import { describe, expect, it } from "vitest";
import { imagensDoClipboard } from "@/lib/colar-imagem";

function item(kind: string, type: string, arquivo: File | null) {
  return { kind, type, getAsFile: () => arquivo };
}

describe("imagensDoClipboard", () => {
  it("pega a print e ignora o texto colado junto", () => {
    const print = new File(["png"], "print.png", { type: "image/png" });
    const arquivos = imagensDoClipboard({
      items: [
        item("string", "text/plain", null),
        item("file", "image/png", print),
      ],
    });
    expect(arquivos).toEqual([print]);
  });

  it("texto puro não vira anexo", () => {
    expect(
      imagensDoClipboard({
        items: [item("string", "text/plain", null)],
      }),
    ).toEqual([]);
  });

  it("sem clipboard devolve vazio", () => {
    expect(imagensDoClipboard(null)).toEqual([]);
  });

  it("usa files quando items não traz a imagem", () => {
    const print = new File(["jpg"], "foto.jpg", { type: "image/jpeg" });
    expect(imagensDoClipboard({ items: [], files: [print] })).toEqual([print]);
  });
});
