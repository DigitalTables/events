import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.1";
import Papa from "https://cdn.jsdelivr.net/npm/papaparse@5.4.1/+esm";

console.log("✅ Fichier supabase.js chargé");

// --- Supabase ---
const supabaseUrl = "https://xrffjwulhrydrhlvuhlj.supabase.co";
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhyZmZqd3VsaHJ5ZHJobHZ1aGxqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA2Mjc2MDQsImV4cCI6MjA3NjIwMzYwNH0.uzlCCfMol_8RqRG2fx4RITkLTZogIKWTQd5zhZELjhg';
const supabase = createClient(supabaseUrl, supabaseKey);
window.supabase = supabase;

// --- Sélecteurs DOM ---
const email = document.getElementById('email');
const password = document.getElementById('password');
const signup = document.getElementById('signup');
const login = document.getElementById('login');
const logout = document.getElementById('logout');
const uploadDiv = document.getElementById('upload');
const authDiv = document.getElementById('auth');
const sendBtn = document.getElementById('send');
const csvInput = document.getElementById('guests');
const imagesInput = document.getElementById('images');
const privateCheckbox = document.getElementById('privateUpload');
const publicUrlDiv = document.getElementById('publicUrl');

// --- Gestion de session ---
function onLogin() {
  authDiv.style.display = 'none';
  uploadDiv.style.display = 'block';
  logout.style.display = 'inline-block';
}

function onLogout() {
  authDiv.style.display = 'block';
  uploadDiv.style.display = 'none';
  logout.style.display = 'none';
  publicUrlDiv.textContent = '';
}

// Vérifie token de confirmation dans l'URL
const params = new URLSearchParams(window.location.search);
if (params.has('access_token')) {
  alert("✅ Ton compte est confirmé ! Connecte-toi maintenant.");
  window.history.replaceState({}, document.title, window.location.pathname);
}

// Vérifie session au chargement
supabase.auth.getSession().then(({ data }) => {
  if (data.session) onLogin();
  else onLogout();
});

// Écoute des changements de session
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
      emailRedirectTo: "https://digitaltables.github.io/events/"
    }
  });
  if (error) alert('Erreur: ' + error.message);
  else alert("✅ Compte créé ! Vérifie ton email pour confirmer.");
};

login.onclick = async () => {
  const { error } = await supabase.auth.signInWithPassword({
    email: email.value,
    password: password.value
  });
  if (error) alert('Erreur: ' + error.message);
  else onLogin();
};

logout.onclick = async () => {
  await supabase.auth.signOut();
  onLogout();
};

// --- Upload fichiers ---
sendBtn.onclick = async () => {
  const { data: userData } = await supabase.auth.getUser();
  const user = userData?.user;
  if (!user) return alert("❌ Non connecté.");

  const csvFile = csvInput.files[0];
  if (!csvFile) return alert("❌ Aucun fichier CSV sélectionné.");

  const isPrivate = privateCheckbox.checked;

  // Crée un Blob CSV
  const csvBlob = new Blob([await csvFile.text()], { type: 'text/csv' });

  // Upload du CSV privé
  const { error: csvError } = await supabase.storage
    .from('guests')
    .upload(`${user.id}/${csvFile.name}`, csvBlob, { upsert: true });

  if (csvError) return alert('Erreur upload CSV: ' + csvError.message);

  alert("✅ Fichier CSV privé uploadé.");

  // --- Optionnel : conversion JSON publique si non privé ---
  if (!isPrivate) {
    const text = await csvBlob.text();
    const delimiter = detectDelimiter(text);

    Papa.parse(text, {
      header: true,
      skipEmptyLines: true,
      delimiter,
      complete: async (results) => {
        const guestsJson = JSON.stringify(results.data, null, 2);
        const jsonBlob = new Blob([guestsJson], { type: 'application/json' });

        const publicJsonName = `guests_${user.id}.json`;

        const { error: jsonError } = await supabase.storage
          .from('public-guests')
          .upload(publicJsonName, jsonBlob, { upsert: true });

        if (jsonError) {
          alert('⚠️ Erreur upload JSON public: ' + jsonError.message);
        } else {
          const publicUrl = `${supabaseUrl}/storage/v1/object/public/public-guests/${publicJsonName}`;
          publicUrlDiv.innerHTML = `
            ✅ <b>JSON public créé avec succès !</b><br>
            URL : <a href="${publicUrl}" target="_blank">${publicUrl}</a>
          `;
          console.log("✅ JSON public disponible à :", publicUrl);
        }
      }
    });
  }

  // --- Upload images ---
  const imgs = imagesInput.files;
  for (const img of imgs) {
    const { error } = await supabase.storage.from('images').upload(`${user.id}/${img.name}`, img, { upsert: true });
    if (error) return alert('Erreur upload image: ' + error.message);
  }

  alert("✅ Upload terminé !");
};

// --- Détection automatique du séparateur CSV ---
function detectDelimiter(text) {
  const firstLine = text.split(/\r?\n/)[0];
  const countComma = (firstLine.match(/,/g) || []).length;
  const countSemicolon = (firstLine.match(/;/g/]) || []).length;
  return countSemicolon > countComma ? ";" : ",";
}

