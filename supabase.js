import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.1";
import Papa from "https://cdn.jsdelivr.net/npm/papaparse@5.4.1/+esm";

console.log("✅ supabase.js chargé");

// --- Initialisation Supabase ---
const SUPABASE_URL = "https://xrffjwulhrydrhlvuhlj.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhyZmZqd3VsaHJ5ZHJobHZ1aGxqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA2Mjc2MDQsImV4cCI6MjA3NjIwMzYwNH0.uzlCCfMol_8RqRG2fx4RITkLTZogIKWTQd5zhZELjhg";
export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// --- Détection automatique du séparateur CSV ---
function detectDelimiter(text) {
  const firstLine = text.split(/\r?\n/)[0];
  const countComma = (firstLine.match(/,/g) || []).length;
  const countSemicolon = (firstLine.match(/;/g) || []).length;
  return countSemicolon > countComma ? ";" : ",";
}

// --- Upload CSV + images ---
export async function uploadEvent({ file, eventName, isPrivate, password }) {
  if (!file || !eventName) return { success: false, error: "Fichier ou nom d'événement manquant." };

  try {
    // --- Lecture CSV ---
    const text = await file.text();
    const delimiter = detectDelimiter(text);
    const results = Papa.parse(text, { header: true, skipEmptyLines: true, delimiter });
    const jsonBlob = new Blob([JSON.stringify(results.data, null, 2)], { type: "application/json" });

    // --- Upload CSV original ---
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;
    if (!userId) return { success: false, error: "Non connecté." };

    const { error: csvError } = await supabase.storage.from("guests").upload(`${userId}/${file.name}`, file, { upsert: true });
    if (csvError) return { success: false, error: csvError.message };

    // --- Upload JSON public ou privé ---
    const jsonName = `guests_${eventName}.json`;
    let url = "";
    if (isPrivate) {
      const { error } = await supabase.storage.from("guests").upload(`${userId}/${jsonName}`, jsonBlob, { upsert: true });
      if (error) return { success: false, error: error.message };
      // signed URL pour CSV privé, valable 24h
      const { data: signedData, error: signedErr } = await supabase.storage.from("guests").createSignedUrl(`${userId}/${jsonName}`, 60*60*24);
      if (signedErr) return { success: false, error: signedErr.message };
      url = signedData.signedUrl;
    } else {
      const { error } = await supabase.storage.from("public-guests").upload(jsonName, jsonBlob, { upsert: true });
      if (error) return { success: false, error: error.message };
      url = `https://xrffjwulhrydrhlvuhlj.supabase.co/storage/v1/object/public/public-guests/${jsonName}`;
    }

    // --- Enregistrement événement dans table `events` ---
    await supabase.from("events").upsert({
      user_id: userId,
      username: eventName,
      is_private: isPrivate,
      password: password || null
    });

    return { success: true, url };
  } catch (err) {
    return { success: false, error: err.message };
  }
}


// ================================
// 🔸 RÉCUPÉRATION DES INVITÉS (TABLES.HTML)
// ================================
export async function fetchGuests(eventName, password = null) {
  try {
    // 1️⃣ Cherche l’événement dans la table
    const { data: events, error } = await supabase
      .from("events")
      .select("*")
      .eq("name", eventName)
      .maybeSingle();

    if (error || !events) throw new Error("Événement introuvable");

    // 2️⃣ Si public → charge JSON public
    if (!events.is_private && events.json_public_url) {
      const res = await fetch(events.json_public_url);
      if (!res.ok) throw new Error("Erreur chargement JSON public");
      const data = await res.json();
      return { success: true, guests: data };
    }

    // 3️⃣ Si privé → vérifie le mot de passe
    if (events.is_private) {
      if (!password || password !== events.password)
        return { success: false, error: "Mot de passe incorrect" };

      if (!events.signed_url)
        throw new Error("Aucune URL signée pour cet événement privé.");

      const res = await fetch(events.signed_url);
      if (!res.ok) throw new Error("Erreur accès CSV privé");
      const text = await res.text();
      const delimiter = detectDelimiter(text);
      const results = Papa.parse(text, { header: true, skipEmptyLines: true, delimiter });
      return { success: true, guests: results.data };
    }

    throw new Error("Aucune donnée disponible");
  } catch (err) {
    console.error("❌ Erreur fetchGuests:", err);
    return { success: false, error: err.message };
  }
}
