import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.1";
import Papa from "https://cdn.jsdelivr.net/npm/papaparse@5.4.1/+esm";

console.log("✅ supabase.js chargé");

const supabaseUrl = "https://xrffjwulhrydrhlvuhlj.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhyZmZqd3VsaHJ5ZHJobHZ1aGxqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA2Mjc2MDQsImV4cCI6MjA3NjIwMzYwNH0.uzlCCfMol_8RqRG2fx4RITkLTZogIKWTQd5zhZELjhg";
const supabase = createClient(supabaseUrl, supabaseKey);
window.supabase = supabase;

// Sélecteurs DOM
const email = document.getElementById("email");
const password = document.getElementById("password");
const signup = document.getElementById("signup");
const login = document.getElementById("login");
const logoutBtn = document.getElementById("logout");
const uploadDiv = document.getElementById("upload");
const authDiv = document.getElementById("auth");
const sendBtn = document.getElementById("send");
const csvInput = document.getElementById("guests");
const imagesInput = document.getElementById("images");
const usernameInput = document.getElementById("username");
const usernameStatus = document.getElementById("usernameStatus");
const privateCsvCheckbox = document.getElementById("privateCsv");
const publicUrlDiv = document.getElementById("publicUrl");
const eventPasswordInput = document.getElementById("eventPassword");
const passwordDiv = document.getElementById("passwordDiv");

// --- Affiche le champ mot de passe seulement si CSV privé ---
privateCsvCheckbox.addEventListener("change", () => {
  passwordDiv.style.display = privateCsvCheckbox.checked ? "block" : "none";
});

// --- Authentification ---
function onLogin() {
  authDiv.style.display = "none";
  uploadDiv.style.display = "block";
  logoutBtn.style.display = "inline-block";
}
function onLogout() {
  authDiv.style.display = "block";
  uploadDiv.style.display = "none";
  logoutBtn.style.display = "none";
  publicUrlDiv.textContent = "";
}

logoutBtn.onclick = async () => {
  await supabase.auth.signOut();
  onLogout();
};

supabase.auth.getSession().then(({ data }) => {
  if (data.session) onLogin();
  else onLogout();
});

supabase.auth.onAuthStateChange((_event, session) => {
  if (session) onLogin();
  else onLogout();
});

signup.onclick = async () => {
  const { error } = await supabase.auth.signUp({
    email: email.value,
    password: password.value,
  });
  if (error) alert("Erreur: " + error.message);
  else alert("✅ Compte créé ! Vérifie ton email.");
};

login.onclick = async () => {
  const { error } = await supabase.auth.signInWithPassword({
    email: email.value,
    password: password.value,
  });
  if (error) alert("Erreur: " + error.message);
  else onLogin();
};

// --- Vérifie la disponibilité du pseudo ---
async function checkUsernameAvailability(username) {
  const { data, error } = await supabase
    .from("events")
    .select("username")
    .eq("username", username);
  if (error) {
    console.error(error);
    return false;
  }
  return data.length === 0;
}

usernameInput.addEventListener("blur", async () => {
  const username = usernameInput.value.trim();
  if (!username) {
    usernameStatus.textContent = "";
    return;
  }
  const available = await checkUsernameAvailability(username);
  usernameStatus.textContent = available
    ? "✅ Disponible"
    : "❌ Déjà pris, choisissez-en un autre";
  usernameStatus.style.color = available ? "green" : "red";
});

// --- Détection du séparateur CSV ---
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
  if (!username) return alert("❌ Choisissez un identifiant public.");
  const isPrivate = privateCsvCheckbox.checked;
  const eventPassword = eventPasswordInput.value.trim();

  if (isPrivate && !eventPassword)
    return alert("❌ Entrez un mot de passe pour l’événement privé.");

  const available = await checkUsernameAvailability(username);
  if (!available) return alert("❌ Identifiant déjà utilisé.");
  const publicJsonName = `guests_${username}.json`;

  const csvFile = csvInput.files[0];
  if (!csvFile) return alert("❌ Aucun fichier CSV sélectionné.");

  const text = await csvFile.text();
  const delimiter = detectDelimiter(text);
  const results = Papa.parse(text, {
    header: true,
    skipEmptyLines: true,
    delimiter,
  });

  const jsonBlob = new Blob([JSON.stringify(results.data, null, 2)], {
    type: "application/json",
  });

  let signedUrl = "";
  if (isPrivate) {
    // 🔒 Upload dans bucket privé
    const { error: uploadError } = await supabase.storage
      .from("guests")
      .upload(publicJsonName, jsonBlob, { upsert: true });
    if (uploadError)
      return alert("Erreur upload JSON privé: " + uploadError.message);

    // Génère une URL signée (7 jours)
    const { data: signed } = await supabase.storage
      .from("private-guests")
      .createSignedUrl(publicJsonName, 604800);
    signedUrl = signed.signedUrl;
  } else {
    // 🌍 Upload public
    const { error: uploadError } = await supabase.storage
      .from("public-guests")
      .upload(publicJsonName, jsonBlob, { upsert: true });
    if (uploadError)
      return alert("Erreur upload JSON public: " + uploadError.message);
    signedUrl = `${supabaseUrl}/storage/v1/object/public/public-guests/${publicJsonName}`;
  }

  // 💾 Enregistre l'événement dans la table
  const { error: insertError } = await supabase.from("events").insert({
    username,
    event_password: isPrivate ? eventPassword : null,
    signed_url: signedUrl,
  });
  if (insertError)
    return alert("Erreur enregistrement événement: " + insertError.message);

  // 📸 Upload des images
  const imgs = imagesInput.files;
  for (const img of imgs) {
    const { error } = await supabase.storage
      .from("images")
      .upload(`${username}/${img.name}`, img, { upsert: true });
    if (error) return alert("Erreur upload image: " + error.message);
  }

  publicUrlDiv.innerHTML = `
    ✅ Événement enregistré !<br>
    ${
      isPrivate
        ? "🔒 Événement privé protégé par mot de passe.<br>"
        : "🌍 Événement public accessible librement.<br>"
    }
    Lien vers tables : <br>
    <strong>https://digitaltables.github.io/events/tables.html?event=${username}</strong>
  `;
  alert("✅ Upload terminé !");
};
