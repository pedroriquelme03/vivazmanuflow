import { redirect } from "next/navigation";
import { exigirGovernanca } from "@/lib/governanca-acesso";

export const dynamic = "force-dynamic";

/** O perfil no checklist agora é definido em Cadastros > Equipe. */
export default async function AcessosPage() {
  await exigirGovernanca("/governanca/admin/equipe", true);
  redirect("/admin");
}
