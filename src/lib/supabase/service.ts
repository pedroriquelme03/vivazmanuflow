import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

/** Cliente só do servidor, para o webhook gravar o chamado sem sessão de usuário. */
export function createServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const chave = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !chave) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY ausente");
  }
  return createClient<Database>(url, chave, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
