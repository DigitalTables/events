import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
console.log("✅ supabase.js chargé");
// ⚠️ Remplace avec tes vraies infos projet
const supabaseUrl = "https://xrffjwulhrydrhlvuhlj.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhyZmZqd3VsaHJ5ZHJobHZ1aGxqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA2Mjc2MDQsImV4cCI6MjA3NjIwMzYwNH0.uzlCCfMol_8RqRG2fx4RITkLTZogIKWTQd5zhZELjhg";
export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Fonction RGPD-friendly pour obtenir le CSV privé via la Edge Function
export async function getPrivateCsv(username, password, userId) {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/get-private-csv`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ eventUsername: username, password, userId }),
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error);
  return data.url; // URL signée temporaire
}
