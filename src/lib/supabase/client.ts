"use client";

import { createBrowserClient } from "@supabase/ssr";
import { getSupabaseConfig } from "@/lib/supabase/env";

export function createClient() {
  const { supabaseKey, supabaseUrl } = getSupabaseConfig();

  return createBrowserClient(supabaseUrl, supabaseKey);
}
