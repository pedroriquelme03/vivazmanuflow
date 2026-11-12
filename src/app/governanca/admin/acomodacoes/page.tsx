import { redirect } from "next/navigation";

/** Acomodações virou Locais (UH ou área, por propriedade). Mantém o link antigo funcionando. */
export default function AcomodacoesPage() {
  redirect("/governanca/admin/locais");
}
