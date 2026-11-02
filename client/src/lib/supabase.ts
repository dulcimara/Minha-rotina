import { createClient } from "@supabase/supabase-js";

// Estes valores vêm das variáveis de ambiente (arquivo .env no computador
// e "Environment variables" no Netlify). Veja o arquivo .env.example.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseKey = import.meta.env.VITE_SUPABASE_KEY as string | undefined;

export const supabaseConfigured = Boolean(supabaseUrl && supabaseKey);

export const supabase = createClient(
  supabaseUrl || "http://localhost",
  supabaseKey || "chave-nao-configurada",
);
