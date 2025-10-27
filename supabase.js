import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.1";

const supabaseUrl = "https://xrffjwulhrydrhlvuhlj.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhyZmZqd3VsaHJ5ZHJobHZ1aGxqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA2Mjc2MDQsImV4cCI6MjA3NjIwMzYwNH0.uzlCCfMol_8RqRG2fx4RITkLTZogIKWTQd5zhZELjhg";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export async function getPrivateCsv(username, password, userId) {
  const res = await fetch(`${supabaseUrl}/functions/v1/get-private-csv`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${supabaseAnonKey}`
    },
    body: JSON.stringify({ path: `guests_${username}.csv` })
  });

  const data = await res.json();
  if (!res.ok || !data?.signedUrl) throw new Error(data.error || "Erreur CSV privé");
  return data.signedUrl;
}
