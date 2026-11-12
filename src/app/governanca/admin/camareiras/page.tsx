import { redirect } from "next/navigation";

/** Camareiras virou Colaboradores (nome + setor). Mantém o link antigo funcionando. */
export default function CamareirasPage() {
  redirect("/governanca/admin/colaboradores");
}
