// supabase.js
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.1";

const supabaseUrl = "https://xrffjwulhrydrhlvuhlj.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhyZmZqd3VsaHJ5ZHJobHZ1aGxqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA2Mjc2MDQsImV4cCI6MjA3NjIwMzYwNH0.uzlCCfMol_8RqRG2fx4RITkLTZogIKWTQd5zhZELjhg";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Récupérer CSV privé via Edge Function
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

// Récupérer toutes les images avec signed URL
export async function getPrivateImages(username) {
  const { data: imagesList, error } = await supabase.storage.from("images").list(`${username}/tables`);
  if (error || !imagesList) return {};
  
  const mapping = {};
  for (const img of imagesList) {
    const tableName = img.name.split("_")[0]; // nom de la table avant "_"
    const { data: urlData } = await supabase.storage
      .from("images")
      .createSignedUrl(`${username}/tables/${img.name}`, 60*60);
    mapping[tableName] = urlData.signedUrl;
  }
  return mapping;
}

// Vérifier si pseudo déjà utilisé
export async function checkPublicJsonExists(username) {
  try {
    const { data, error } = await supabase.storage.from("public-guests").list("", { search: `guests_${username}.json` });
    if (error) return false;
    return data.some(f => f.name === `guests_${username}.json`);
  } catch(e) {
    console.error("checkPublicJsonExists error:", e);
    return false;
  }
}
