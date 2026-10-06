import { describe, expect, it } from "vitest";
import {
  ambienteEscolhido,
  ambientesDoPapel,
  listaAmbientes,
  pessoaDoAmbiente,
  recursoAmbienteAusente,
} from "@/lib/ambiente-equipe";

describe("listaAmbientes", () => {
  it("quem não tem o campo fica na manutenção", () => {
    expect(listaAmbientes(undefined)).toEqual(["manutencao"]);
  });

  it("aceita os dois sem repetir", () => {
    expect(listaAmbientes(["ti", "manutencao", "ti"])).toEqual([
      "ti",
      "manutencao",
    ]);
  });
});

describe("recursoAmbienteAusente", () => {
  it("reconhece a função que ainda não foi criada no banco", () => {
    expect(
      recursoAmbienteAusente(
        "Could not find the function public.admin_definir_ambientes in the schema cache",
      ),
    ).toBe(true);
    expect(
      recursoAmbienteAusente(
        "Could not find the function public.marcar_ambiente_demanda in the schema cache",
      ),
    ).toBe(true);
  });

  it("não esconde um erro real de validação", () => {
    expect(recursoAmbienteAusente("Marque Manutenção, TI ou os dois")).toBe(
      false,
    );
  });
});

describe("pessoaDoAmbiente", () => {
  it("colaborador de manutenção não entra na lista de TI", () => {
    expect(pessoaDoAmbiente(["manutencao"], "ti")).toBe(false);
    expect(pessoaDoAmbiente(["ti"], "ti")).toBe(true);
    expect(pessoaDoAmbiente(["manutencao", "ti"], "ti")).toBe(true);
  });
});

describe("ambienteEscolhido", () => {
  it("com um ambiente só ignora o cookie", () => {
    expect(ambienteEscolhido(["ti"], "manutencao")).toBe("ti");
  });

  it("com os dois usa o cookie", () => {
    expect(ambienteEscolhido(["manutencao", "ti"], "ti")).toBe("ti");
  });

  it("sem cookie começa na manutenção", () => {
    expect(ambienteEscolhido(["manutencao", "ti"], undefined)).toBe(
      "manutencao",
    );
  });
});

describe("ambientesDoPapel", () => {
  it("líder não entra no TI mesmo com os dois marcados", () => {
    expect(ambientesDoPapel("lider", ["manutencao", "ti"])).toEqual([
      "manutencao",
    ]);
  });

  it("admin e colaborador seguem o que está marcado", () => {
    expect(ambientesDoPapel("admin", ["manutencao", "ti"])).toEqual([
      "manutencao",
      "ti",
    ]);
    expect(ambientesDoPapel("colaborador", ["ti"])).toEqual(["ti"]);
  });
});
