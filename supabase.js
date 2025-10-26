import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.1";
import Papa from "https://cdn.jsdelivr.net/npm/papaparse@5.4.1/+esm";

console.log("✅ supabase.js chargé");

// --- Initialisation Supabase ---
const SUPABASE_URL = "https://xrffjwulhrydrhlvuhlj.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhyZmZqd3VsaHJ5ZHJobHZ1aGxqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA2Mjc2MDQsImV4cCI6MjA3NjIwMzYwNH0.uzlCCfMol_8RqRG2fx4RITkLTZogIKWTQd5zhZELjhg";
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
window.supabase = supabase;

// --- DOM elements ---
const email = document.getElementById("email");
const password = document.getElementById("password");
const signup = document.getElementById("signup");
const login = document.getElementById("login");
const logout = document.getElementById("logout");
const authDiv = document.getElementById("auth");
const uploadDiv = document.getElementById("upload");
const usernameInput = document.getElementById("username");
const usernameStatus = document.getElementById("usernameStatus");
const privateCsvCheckbox = document.getElementById("privateCsv");
const passwordDiv = document.getElementById("passwordDiv");
const eventPasswordInput = document.getElementById("eventPassword");
const csvInput = document.getElementById("guests");
const imagesInput = document.getElementById("images");
const sendBtn = document.getElementById("send");
const publicUrlDiv = document.getElementById("publicUrl");

// --- Restauration automatique après clic sur lien d'email ---
(async function handleAuthRedirect() {
  try {
    const { data, error } = await supabase.auth.getSessionFromUrl({ storeSession: true });
    if (error) console.warn("getSessionFromUrl:", error.message);
    if (data?.session) {
      console.log("✅ Session restaurée via lien email");
      window.history.replaceState({}, document.title, window.location.pathname);
      onLogin();
    }
  } catch (err) {
    // Cas où la méthode n'existe pas ou pas de token dans l'URL
  }
})();

// --- Fonctions d'affichage ---
function onLogin() {
  authDiv.style.display = "none";
  uploadDiv.style.display = "block";
  logout.style.display = "inline-block";
}

function onLogout() {
  authDiv.style.display = "block";
  uploadDiv.style.display = "none";
  logout.style.display = "none";
  publicUrlDiv.textContent = "";
}

// --- Vérifie session au chargement ---
supabase.auth.getSession().then(({ data }) => {
  if (data.session) onLogin();
  else onLogout();
});

// --- Écoute changement de session ---
supabase.auth.onAuthStateChange((_event, session) => {
  if (session) onLogin();
  else onLogout();
});

// --- Authentification ---
signup.onclick = async () => {
  const { error } = await supabase.auth.signUp({
    email: email.value,
    password: password.value,
    options: {
      emailRedirectTo: "https://digitaltables.github.io/events/index.html"
    }
  });
  if (error) alert("❌ " + error.message);
  else alert("✅ Compte créé ! Vérifie ton email pour confirmer ton inscription.");
};

login.onclick = async () => {
  const { error } = await supabase.auth.signInWithPassword({
    email: email.value,
    password: password.value
  });
  if (error) alert("❌ " + error.message);
  else onLogin();
};

logout.onclick = async () => {
  await supabase.auth.signOut();
  onLogout();
};

// --- Affichage du champ mot de passe si CSV privé ---
privateCsvCheckbox.addEventListener("change", () => {
  passwordDiv.style.display = privateCsvCheckbox.checked ? "block" : "none";
});

// --- Vérifie disponibilité du pseudo ---
async function checkUsernameAvailability(username) {
  if (!username) return false;
  const publicJsonName = `guests_${username}.json`;
  const { data, error } = await supabase.storage.from("public-guests").list("", { search: publicJsonName });
  if (error) return false;
  return !data.some(f => f.name === publicJsonName);
}

usernameInput.addEventListener("blur", async () => {
  const username = usernameInput.value.trim();
  if (!username) {
    usernameStatus.textContent = "";
    return;
  }
  const available = await checkUsernameAvailability(username);
  usernameStatus.textContent = available ? "✅ Disponible" : "❌ Déjà pris";
  usernameStatus.style.color = available ? "green" : "red";
});

// --- Détection automatique du séparateur CSV ---
function detectDelimiter(text) {
  const firstLine = text.split(/\r?\n/)[0];
  const countComma = (firstLine.match(/,/g) || []).length;
  const countSemicolon = (firstLine.match(/;/g) || []).length;
  return countSemicolon > countComma ? ";" : ",";
}

// --- Upload CSV + images ---
sendBtn.onclick = async () => {
  const { data: userData } = await supabase.auth.getUser();
  const user = userData?.user;
  if (!user) return alert("❌ Non connecté.");

  const username = usernameInput.value.trim();
  if (!username) return alert("❌ Choisissez un identifiant public valide.");

  const csvFile = csvInput.files[0];
  if (!csvFile) return alert("❌ Aucun fichier CSV sélectionné.");

  const text = await csvFile.text();
  const delimiter = detectDelimiter(text);

  const results = Papa.parse(text, { header: true, skipEmptyLines: true, delimiter });

  // --- JSON public ou privé ---
  const jsonBlob = new Blob([JSON.stringify(results.data, null, 2)], { type: "application/json" });

  const isPrivate = privateCsvCheckbox.checked;
  const eventPassword = isPrivate ? eventPasswordInput.value.trim() : null;
  const jsonName = `guests_${username}.json`;

  // Upload du CSV dans le bucket `guests`
  const { error: csvError } = await supabase.storage.from("guests").upload(`${user.id}/${csvFile.name}`, csvFile, { upsert: true });
  if (csvError) return alert("Erreur upload CSV : " + csvError.message);

  // Upload du JSON dans le bon bucket
  if (isPrivate) {
    const { error } = await supabase.storage.from("guests").upload(`${user.id}/${jsonName}`, jsonBlob, { upsert: true });
    if (error) return alert("Erreur upload JSON privé : " + error.message);
  } else {
    const { error } = await supabase.storage.from("public-guests").upload(jsonName, jsonBlob, { upsert: true });
    if (error) return alert("Erreur upload JSON public : " + error.message);
    const publicUrl = `https://xrffjwulhrydrhlvuhlj.supabase.co/storage/v1/object/public/public-guests/${jsonName}`;
    publicUrlDiv.textContent = `✅ Fichier public disponible : ${publicUrl}`;
  }

  // --- Enregistrement de l'événement dans la table events ---
  const { error: insertError } = await supabase.from("events").upsert({
    user_id: user.id,
    username,
    is_private: isPrivate,
    password: eventPassword || null
  });
  if (insertError) console.error("Erreur enregistrement événement :", insertError);

  // --- Upload images ---
  const imgs = imagesInput.files;
  for (const img of imgs) {
    const { error } = await supabase.storage.from("images").upload(`${user.id}/${img.name}`, img, { upsert: true });
    if (error) console.warn("Erreur upload image:", error.message);
  }

  alert("✅ Upload terminé !");
};
