// supabase.js
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.1";

const supabaseUrl = "https://xrffjwulhrydrhlvuhlj.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhyZmZqd3VsaHJ5ZHJobHZ1aGxqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA2Mjc2MDQsImV4cCI6MjA3NjIwMzYwNH0.uzlCCfMol_8RqRG2fx4RITkLTZogIKWTQd5zhZELjhg";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Récupérer CSV privé via Edge Function
 * @param {string} username 
 * @param {string} password 
 * @param {string} userId 
 * @returns {Promise<string>} signed URL
 */
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

/**
 * Récupérer toutes les images privées via signed URLs pour dashboard
 * @param {string} username 
 * @param {string} userId 
 * @returns {Promise<Array<{name: string, url: string}>>}
 */
export async function getPrivateImages(username, userId) {
  const { data: imagesList, error } = await supabase.storage.from("images").list(username);
  if (error) throw new Error("Erreur récupération images : " + error.message);
  
  const signedUrls = await Promise.all(imagesList.map(async img => {
    const { data: urlData, error: urlErr } = await supabase
      .storage
      .from("images")
      .createSignedUrl(`${username}/${img.name}`, 60 * 60); // 1h
    if (urlErr) return { name: img.name, url: "#" };
    return { name: img.name, url: urlData.signedUrl };
  }));

  return signedUrls;
}
