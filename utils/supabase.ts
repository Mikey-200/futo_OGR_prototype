import { createBrowserClient } from "@supabase/ssr";

let supabaseClient: ReturnType<typeof createBrowserClient> | null = null;

export const createClient = () => {
  if (supabaseClient) return supabaseClient;

  supabaseClient = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || "mock-url",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "mock-anon-key"
  );

  return supabaseClient;
};
