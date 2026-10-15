import { describe, expect, it } from "vitest";
import { slugValido, sugerirSlug } from "@/lib/slug-sistema";

describe("slug de sistema", () => {
  it("transforma o nome em slug", () => {
    expect(sugerirSlug("Portal RH")).toBe("portal-rh");
    expect(sugerirSlug("Recreação")).toBe("recreacao");
    expect(sugerirSlug("Sistema de Chamados")).toBe("sistema-de-chamados");
  });

  it("aceita só letras minúsculas, números e hífen", () => {
    expect(slugValido("chamados")).toBe(true);
    expect(slugValido("portal-rh")).toBe(true);
    expect(slugValido("Portal RH")).toBe(false);
    expect(slugValido("-chamados")).toBe(false);
  });
});
