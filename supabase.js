// --- supabase.js ---
// Script unique pour gérer la connexion Supabase, l'upload des CSV,
// la conversion en JSON, la sauvegarde dans la table "events"
// et la génération automatique du JSON public.
// À inclure avec : <script type="module" src="supabase.js"></script>

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.1";
import Papa from "https://cdn.jsdelivr.net/npm/papaparse@5.4.1/+esm";

// --- Configuration Supabase ---
const SUPABASE_URL = "https://xrffjwulhrydrhlvuhlj.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhyZmZqd3VsaHJ5ZHJobHZ1aGxqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mjk3MjA5MDYsImV4cCI6MjA0NTI5NjkwNn0.qbBA3ylKo6ax7uQ91fNO3O1wUHX8je-8UL4OtC5n6B4";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ---------------------------------------------------------------
// 🔹 Fonction : Upload du CSV (public ou privé)
// ---------------------------------------------------------------
export async function uploadCsv(eventSlug, file, isPrivate, password = null) {
  try {
    if (!file) throw new Error("Aucun fichier sélectionné.");

    const csvText = await file.text();
    const parsed = Papa.parse(csvText, { header: true });
    const guests = parsed.data.filter((r) => r.name && r.table);

    if (guests.length === 0)
      throw new Error("Le fichier CSV est vide ou mal formaté.");

    // 1️⃣ Upload du CSV original dans le bucket "guests"
    const csvPath = `${eventSlug}.csv`;
    const { error: uploadError } = await supabase.storage
      .from("guests")
      .upload(csvPath, file, { upsert: true });

    if (uploadError) throw uploadError;

    // 2️⃣ Création ou mise à jour de l'événement dans la table "events"
    const { data: eventData, error: insertError } = await supabase
      .from("events")
      .upsert(
        [
          {
            slug: eventSlug,
            is_private: isPrivate,
            password: isPrivate ? password : null,
            csv_path: csvPath,
          },
        ],
        { onConflict: "slug" }
      )
      .select()
      .single();

    if (insertError) throw insertError;

    // 3️⃣ Si événement public → génération du JSON public
    if (!isPrivate) {
      const jsonBlob = new Blob([JSON.stringify(guests, null, 2)], {
        type: "application/json",
      });
      const jsonPath = `guests_${eventSlug}.json`;

      const { error: jsonError } = await supabase.storage
        .from("public-guests")
        .upload(jsonPath, jsonBlob, { upsert: true });

      if (jsonError) throw jsonError;
    }

    return {
      success: true,
      message: `Événement "${eventSlug}" enregistré avec succès.`,
    };
  } catch (err) {
    console.error("Erreur uploadCsv:", err);
    return { success: false, message: err.message };
  }
}

// ---------------------------------------------------------------
// 🔹 Fonction : Récupérer le JSON des invités (public ou privé)
// ---------------------------------------------------------------
export async function fetchGuestsData(eventSlug, password = null) {
  try {
    // 1️⃣ Récupération des infos de l’événement
    const { data: event, error: eventError } = await supabase
      .from("events")
      .select("*")
      .eq("slug", eventSlug)
      .single();

    if (eventError || !event) throw new Error("Événement introuvable.");

    // 2️⃣ Cas public → on charge le JSON depuis le bucket public-guests
    if (!event.is_private) {
      const { data, error } = await supabase.storage
        .from("public-guests")
        .download(`guests_${eventSlug}.json`);

      if (error) throw error;
      const text = await data.text();
      return JSON.parse(text);
    }

    // 3️⃣ Cas privé → vérification du mot de passe
    if (event.is_private && event.password !== password)
      throw new Error("Mot de passe incorrect pour cet événement privé.");

    // 4️⃣ Téléchargement du CSV privé et conversion en JSON
    const { data: csvData, error: csvError } = await supabase.storage
      .from("guests")
      .download(event.csv_path);

    if (csvError) throw csvError;

    const csvText = await csvData.text();
    const parsed = Papa.parse(csvText, { header: true });
    const guests = parsed.data.filter((r) => r.name && r.table);

    return guests;
  } catch (err) {
    console.error("Erreur fetchGuestsData:", err);
    throw err;
  }
}

// ---------------------------------------------------------------
// 🔹 Fonction : Vérifier si un événement existe déjà
// ---------------------------------------------------------------
export async function checkEventExists(eventSlug) {
  const { data, error } = await supabase
    .from("events")
    .select("slug")
    .eq("slug", eventSlug)
    .maybeSingle();

  if (error) throw error;
  return !!data;
}
