import type { SupabaseClient } from "@supabase/supabase-js";

/** Upload estável no Android (HTTP): bytes + MIME explícito. */
export async function uploadAnexo(
  supabase: SupabaseClient,
  caminho: string,
  arquivo: File,
  contentType: string,
) {
  const bytes = await arquivo.arrayBuffer();
  return supabase.storage.from("anexos").upload(caminho, bytes, {
    contentType,
    upsert: false,
  });
}
