// ================================
// ✅ SUPABASE.JS — DigitalTables
// ================================

// --- Import des dépendances externes ---
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.1";
import Papa from "https://cdn.jsdelivr.net/npm/papaparse@5.4.1/+esm";

console.log("✅ supabase.js chargé");

// --- Configuration Supabase ---
const supabaseUrl = "https://xrffjwulhrydrhlvuhlj.supabase.co";
const supabaseKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhyZmZqd3VsaHJ5ZHJobHZ1aGxqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA2Mjc2MDQsImV4cCI6MjA3NjIwMzYwNH0.uzlCCfMol_8RqRG2fx4RITkLTZogIKWTQd5zhZELjhg";

export const supabase = createClient(supabaseUrl, supabaseKey);

// ================================
// 🔹 FONCTIONS UTILITAIRES
// ================================

// Détection du séparateur CSV
function detectDelimiter(text) {
  const firstLine = text.split(/\r?\n/)[0];
  const countComma = (firstLine.match(/,/g) || []).length;
  const countSemicolon = (firstLine.match(/;/g) || []).length;
  return countSemicolon > countComma ? ";" : ",";
}

// Création d’un JSON à partir d’un CSV
async function csvToJson(file) {
  const text = await file.text();
  const delimiter = detectDelimiter(text);
  const results = Papa.parse(text, {
    header: true,
    skipEmptyLines: true,
    delimiter,
  });
  return results.data;
}

// ================================
// 🔸 UPLOAD D’ÉVÉNEMENT
// ================================
export async function uploadEvent({ file, eventName, isPrivate, password }) {
  try {
    // Vérifie la session utilisateur
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData?.user) {
      return { success: false, error: "Utilisateur non connecté" };
    }

    const user = userData.user;

    // Conversion CSV -> JSON
    const guests = await csvToJson(file);
    const jsonBlob = new Blob([JSON.stringify(guests, null, 2)], {
      type: "application/json",
    });

    // --- Upload CSV dans le bucket "guests" (privé) ---
    const csvPath = `${eventName}/guests.csv`;
    const { error: uploadCsvError } = await supabase.storage
      .from("guests")
      .upload(csvPath, file, { upsert: true });

    if (uploadCsvError)
      return { success: false, error: "Erreur upload CSV : " + uploadCsvError.message };

    // --- Upload JSON public dans "public-guests" (si non privé) ---
    let publicUrl = null;
    if (!isPrivate) {
      const jsonPath = `guests_${eventName}.json`;
      const { error: jsonError } = await supabase.storage
        .from("public-guests")
        .upload(jsonPath, jsonBlob, { upsert: true });
      if (jsonError)
        return { success: false, error: "Erreur upload JSON public : " + jsonError.message };

      publicUrl = `https://xrffjwulhrydrhlvuhlj.supabase.co/storage/v1/object/public/public-guests/${jsonPath}`;
    }

    // --- Si privé, créer une URL signée pour les invités ---
    let signedUrl = null;
    if (isPrivate) {
      const { data, error: signError } = await supabase.storage
        .from("guests")
        .createSignedUrl(csvPath, 60 * 60 * 24 * 7); // valide 7 jours
      if (signError)
        return { success: false, error: "Erreur création URL signée : " + signError.message };
      signedUrl = data.signedUrl;
    }

    // --- Enregistrement de l’événement dans la table "events" ---
    const { error: insertError } = await supabase.from("events").upsert(
      {
        name: eventName,
        owner_id: user.id,
        is_private: isPrivate,
        password: isPrivate ? password : null,
        json_public_url: publicUrl,
        signed_url: signedUrl,
        updated_at: new Date(),
      },
      { onConflict: "name" }
    );

    if (insertError)
      return { success: false, error: "Erreur enregistrement événement : " + insertError.message };

    console.log("✅ Événement enregistré :", eventName);
    return { success: true, publicUrl, signedUrl };
  } catch (err) {
    console.error("Erreur uploadEvent :", err);
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
