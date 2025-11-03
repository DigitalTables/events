// supabase.js
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.1";

// --- CONFIG SUPABASE ---
const supabaseUrl = "https://xrffjwulhrydrhlvuhlj.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhyZmZqd3VsaHJ5ZHJobHZ1aGxqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA2Mjc2MDQsImV4cCI6MjA3NjIwMzYwNH0.uzlCCfMol_8RqRG2fx4RITkLTZogIKWTQd5zhZELjhg";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// --- Récupérer CSV privé via Edge Function ---
export async function getPrivateCsv(username, password, userId) {
  try {
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
  } catch (e) {
    console.error("getPrivateCsv error:", e);
    throw e;
  }
}

// --- Récupérer toutes les images (signed URLs) ---
export async function getPrivateImages(username, userId) {
  try {
    const { data: imagesList, error } = await supabase.storage.from("images").list(username);
    if (error) throw new Error("Erreur récupération images : " + error.message);
    if (!imagesList || imagesList.length === 0) return [];

    const signedUrls = await Promise.all(imagesList.map(async img => {
      const { data: urlData, error: urlErr } = await supabase
        .storage
        .from("images")
        .createSignedUrl(`${username}/${img.name}`, 60 * 60); // lien valable 1h
      if (urlErr) return { name: img.name, url: "#" };
      return { name: img.name, url: urlData.signedUrl };
    }));

    return signedUrls;
  } catch(e) {
    console.error("getPrivateImages error:", e);
    return [];
  }
}

// --- Vérifier si pseudo déjà utilisé ---
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
