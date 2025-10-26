import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.1";
import Papa from "https://cdn.jsdelivr.net/npm/papaparse@5.4.1/+esm";

export const SUPABASE_URL = "https://xrffjwulhrydrhlvuhlj.supabase.co";
export const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...";
export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// --- Détection automatique du séparateur CSV ---
function detectDelimiter(text) {
  const firstLine = text.split(/\r?\n/)[0];
  const countComma = (firstLine.match(/,/g) || []).length;
  const countSemicolon = (firstLine.match(/;/g) || []).length;
  return countSemicolon > countComma ? ";" : ",";
}

// --- Upload CSV + images et création URL signée ---
export async function uploadEvent({ file, eventName, isPrivate, password }) {
  try {
    const text = await file.text();
    const delimiter = detectDelimiter(text);
    const results = Papa.parse(text, { header: true, skipEmptyLines: true, delimiter });

    const jsonBlob = new Blob([JSON.stringify(results.data, null, 2)], { type: "application/json" });
    const jsonName = `guests_${eventName}.json`;

    // Upload CSV brut
    const { error: csvError } = await supabase.storage.from("guests").upload(`${eventName}/${file.name}`, file, { upsert: true });
    if (csvError) return { success: false, error: csvError.message };

    if (isPrivate) {
      const { error } = await supabase.storage.from("guests").upload(`${eventName}/${jsonName}`, jsonBlob, { upsert: true });
      if (error) return { success: false, error: error.message };

      // Génère l'URL signée pour le CSV privé
      const { data: signedUrlData, error: urlError } = await supabase
        .storage
        .from('guests')
        .createSignedUrl(`${eventName}/${jsonName}`, 60 * 60); // lien valable 1h
      if (urlError) return { success: false, error: urlError.message };

      return { success: true, url: signedUrlData.signedUrl };

    } else {
      const { error } = await supabase.storage.from("public-guests").upload(jsonName, jsonBlob, { upsert: true });
      if (error) return { success: false, error: error.message };
      const publicUrl = `https://xrffjwulhrydrhlvuhlj.supabase.co/storage/v1/object/public/public-guests/${jsonName}`;
      return { success: true, url: publicUrl };
    }

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
