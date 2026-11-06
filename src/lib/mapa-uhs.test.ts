import { describe, expect, it } from "vitest";
import { compararNumeroUh, lerRelatorioUhs, uhsParaLimpar, type TextoPdf } from "./mapa-uhs";

/** Monta uma linha do relatório com os textos nas colunas do layout do Desbravador. */
function linha(y: number, celulas: [number, string][], pagina = 1): TextoPdf[] {
  return celulas.map(([x, texto]) => ({ pagina, x, y, texto }));
}

const cabecalho: TextoPdf[] = [
  ...linha(44, [[221.8, "Relatório de UHs para Governança - Resumido"]]),
  ...linha(53, [[267.6, "Data: 21/10/2026"]]),
  ...linha(97, [[22.7, "Edificação:"], [66.7, "01"], [426.2, "Andar:"], [456.8, "02"]]),
];

const textos: TextoPdf[] = [
  ...cabecalho,
  // Permanência com troca de enxoval.
  ...linha(123, [[18.3, "1254"], [69.7, "LXF"], [104.6, "Ocupada"], [208.5, "19/10/26"], [250.5, "23/10/26"], [299.2, "4"], [381, "Sim"]]),
  // Livre e sem nada: fica fora.
  ...linha(136, [[18.3, "1252"], [69.7, "LXF"], [104.6, "Livre"], [299.2, "0"]]),
  // Suja com dois serviços (o segundo na linha de baixo).
  ...linha(174, [[18.3, "1257"], [69.7, "LP"], [104.6, "Suja"], [299.2, "0"], [310.5, "[ ] Limpeza"]]),
  ...linha(185, [[310.5, "[ ] Retoque"]]),
  // Saída hoje.
  ...linha(200, [[18.3, "1230"], [69.7, "LXF"], [104.6, "Ocupada"], [208.5, "19/10/26"], [250.5, "21/10/26"], [299.2, "2"]]),
  // Chegada em UH livre: só conferir, não entra.
  ...linha(212, [[18.3, "1270"], [69.7, "LXF"], [104.6, "Livre"], [208.5, "21/10/26"], [250.5, "26/10/26"], [299.2, "2"], [408.8, "Sim(2)"]]),
  // Livre com retoque agendado: entra com o serviço como tarefa.
  ...linha(224, [[18.3, "1123"], [69.7, "LP"], [104.6, "Livre"], [299.2, "0"], [310.5, "[ ] Retoque"]]),
  ...linha(236, [[310.5, "[ ] Inspeção"]]),
  // UH de outra página, com número menor.
  ...linha(123, [[18.3, "1000"], [69.7, "GDF"], [104.6, "Ocupada"], [208.5, "20/10/26"], [250.5, "22/10/26"], [299.2, "3"]], 2),
];

describe("relatório diário de governança", () => {
  it("lê a data e as UHs do PDF", () => {
    const r = lerRelatorioUhs(textos);
    expect(r.data).toBe("21/10/2026");
    expect(r.uhs.map((u) => u.numero)).toEqual(["1254", "1252", "1257", "1230", "1270", "1123", "1000"]);
    expect(r.uhs.find((u) => u.numero === "1257")?.servicos).toEqual(["Limpeza", "Retoque"]);
  });

  it("lista só as UHs para limpar hoje, do menor para o maior número", () => {
    const lista = uhsParaLimpar(lerRelatorioUhs(textos));
    expect(lista.map((u) => u.numero)).toEqual(["1000", "1123", "1230", "1254", "1257"]);
    expect(lista.find((u) => u.numero === "1254")?.tarefa).toBe("Arrumação + troca de enxoval");
    expect(lista.find((u) => u.numero === "1230")?.tarefa).toBe("Limpeza de saída (aguardando check-out)");
    expect(lista.find((u) => u.numero === "1123")?.tarefa).toBe("Retoque");
  });

  it("recusa um PDF que não é o relatório", () => {
    expect(() => lerRelatorioUhs(linha(10, [[18, "Qualquer coisa"]]))).toThrow(/Não reconheci/);
  });

  it("ordena números de UH como números", () => {
    expect(["1250", "999", "1000", "1200"].sort(compararNumeroUh)).toEqual(["999", "1000", "1200", "1250"]);
  });
});
