import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.1";

export const SUPABASE_URL = "https://xrffjwulhrydrhlvuhlj.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhyZmZqd3VsaHJ5ZHJobHZ1aGxqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA2Mjc2MDQsImV4cCI6MjA3NjIwMzYwNH0.uzlCCfMol_8RqRG2fx4RITkLTZogIKWTQd5zhZELjhg";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    // ✅ IMPORTANT : Remplacez par votre vraie URL GitHub Pages
    redirectTo: 'https://digitaltables.github.io/events/index.html',
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
});
export const GOOGLE_CLIENT_ID= "1036214240835-f3cpd0sjeomk1gc31t3sv6v4r6shl729.apps.googleusercontent.com"
/**
 * Récupère le CSV privé signé via Edge Function
 */
export async function getPrivateCsv(username, password, userId) {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/get-private-csv`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${supabaseAnonKey}`
    },
    body: JSON.stringify({ path: `guests_${username}.csv`, password, userId })
  });

  const data = await res.json();
  if (!res.ok || !data?.signedUrl) throw new Error(data.error || "Erreur CSV privé");
  return data.signedUrl;
}

/**
 * Récupère le mapping images → tables pour un événement
 */
export async function getEventImagesMapping(username) {
  const { data, error } = await supabase
    .from("events")
    .select("images_mapping")
    .eq("username", username)
    .single();

  if (error) throw error;
  return data?.images_mapping || {};
}
