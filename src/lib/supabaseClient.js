import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Check if variables are present and are not placeholder values
export const isConfigured = !!(
  supabaseUrl &&
  supabaseAnonKey &&
  supabaseUrl !== "https://TU-PROYECTO.supabase.co" &&
  supabaseUrl.trim() !== "" &&
  supabaseAnonKey !== "TU_SUPABASE_ANON_KEY" &&
  supabaseAnonKey.trim() !== ""
);

if (!isConfigured) {
  console.error(
    "Supabase no está configurado. Revisá las variables VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY en el archivo .env"
  );
}

// Initialize Supabase client if configured, otherwise export null
export const supabase = isConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;
