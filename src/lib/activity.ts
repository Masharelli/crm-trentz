import type { SupabaseClient } from "@supabase/supabase-js";

// Registro de actividad para el timeline del cliente. Es best-effort:
// si falla no debe romper la accion principal.
export async function logActivity(
  supabase: SupabaseClient,
  entry: {
    actor_id?: string | null;
    client_id: string;
    entity_type: string;
    entity_id?: string | null;
    action: string;
    description: string;
  },
) {
  const { error } = await supabase.from("activity_logs").insert(entry);
  if (error) {
    console.error("[activity] no se pudo registrar:", error.message);
  }
}
