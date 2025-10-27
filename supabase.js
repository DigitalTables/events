import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
console.log("✅ supabase.js chargé");

// 🔒 Clés publiques seulement (anon key)
const supabaseUrl = "https://xrffjwulhrydrhlvuhlj.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhyZmZqd3VsaHJ5ZHJobHZ1aGxqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA2Mjc2MDQsImV4cCI6MjA3NjIwMzYwNH0.uzlCCfMol_8RqRG2fx4RITkLTZogIKWTQd5zhZELjhg";

export const supabase = createClient(supabaseUrl, supabaseKey);

// Fonction RGPD-friendly pour obtenir le CSV privé via la Edge Function
export async function getPrivateCsv(path) {
  const res = await fetch(`${supabaseUrl}/functions/v1/get-private-csv`, {
    method: "POST",
    headers: { 
      "Content-Type": "application/json",
      "Authorization": `Bearer ${supabaseKey}`
    },
    body: JSON.stringify({ path })
  });
  const data = await res.json();
  if (!res.ok || !data?.signedUrl) throw new Error(data?.error || "Erreur Edge Function");
  return data.signedUrl;
}
