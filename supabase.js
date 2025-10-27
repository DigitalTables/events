import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.1";

console.log("✅ supabase.js chargé");

// ⚠️ Remplace par tes infos projet publiques seulement
const SUPABASE_URL = "https://xrffjwulhrydrhlvuhlj.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhyZmZqd3VsaHJ5ZHJobHZ1aGxqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA2Mjc2MDQsImV4cCI6MjA3NjIwMzYwNH0.uzlCCfMol_8RqRG2fx4RITkLTZogIKWTQd5zhZELjhg";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Fonction RGPD-friendly pour obtenir le CSV privé via la Edge Function
export async function getPrivateCsv(path) {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/get-private-csv`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ path })
  });
  const data = await res.json();
  if (!res.ok || !data?.signedUrl) throw new Error(data.error || "Erreur CSV privé");
  return data.signedUrl;
}
