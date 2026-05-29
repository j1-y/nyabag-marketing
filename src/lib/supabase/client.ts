import { createBrowserClient } from "@supabase/ssr";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

export function createClient() {
  if (!url || !key) {
    throw new Error(
      "Supabase env vars are not set. Copy .env.local.example to .env.local and fill in your project URL and anon key."
    );
  }
  return createBrowserClient(url, key);
}
