import { describe, expect, it } from "vitest";
import { ACEITA_ANEXO, extensao, nomeDoAnexo, tipoAnexo } from "./checklist-anexo";

describe("tipoAnexo", () => {
  it("usa o MIME quando tem", () => {
    expect(tipoAnexo("x", "image/png")).toBe("foto");
    expect(tipoAnexo("x", "video/mp4")).toBe("video");
  });

  it("sem MIME, olha a extensão (também em URL com query)", () => {
    expect(tipoAnexo("https://a/b/foto.JPG?t=1")).toBe("foto");
    expect(tipoAnexo("https://a/b/v.mov")).toBe("video");
    expect(tipoAnexo("planilha.xlsx", "application/vnd.ms-excel")).toBe("documento");
    expect(tipoAnexo("laudo.pdf")).toBe("documento");
    expect(tipoAnexo("contrato.docx")).toBe("documento");
  });

  it("recusa o que não conhece, mas aceita foto sem tipo do Android", () => {
    expect(tipoAnexo("programa.exe", "application/x-msdownload")).toBeNull();
    expect(tipoAnexo("image", "")).toBe("foto");
  });
});

describe("helpers", () => {
  it("extensao e nome", () => {
    expect(extensao("a/b.PDF?x=1")).toBe("pdf");
    expect(nomeDoAnexo("https://s/governanca/123/rel%20final.pdf")).toBe("rel final.pdf");
  });

  it("aceita imagem, vídeo e documentos de escritório", () => {
    expect(ACEITA_ANEXO).toContain("image/*");
    expect(ACEITA_ANEXO).toContain("video/*");
    expect(ACEITA_ANEXO).toContain(".pdf");
    expect(ACEITA_ANEXO).toContain(".xlsx");
  });
});
