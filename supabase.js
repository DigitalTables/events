import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.1";
import Papa from "https://cdn.jsdelivr.net/npm/papaparse@5.4.1/+esm";

console.log("✅ Fichier supabase.js chargé");

// --- Supabase (clé publique ANON) ---
const supabaseUrl = "https://xrffjwulhrydrhlvuhlj.supabase.co";
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhyZmZqd3VsaHJ5ZHJobHZ1aGxqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA2Mjc2MDQsImV4cCI6MjA3NjIwMzYwNH0.uzlCCfMol_8RqRG2fx4RITkLTZogIKWTQd5zhZELjhg';
const supabase = createClient(supabaseUrl, supabaseKey);

document.addEventListener('DOMContentLoaded', () => {

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
  const usernameInput = document.getElementById('username');
  const usernameStatus = document.getElementById('usernameStatus');
  const privateCsvCheckbox = document.getElementById('privateCsv');
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

  supabase.auth.getSession().then(({ data }) => {
    if (data.session) onLogin();
    else onLogout();
  });

  supabase.auth.onAuthStateChange((_event, session) => {
    if (session) onLogin();
    else onLogout();
  });

  // --- Authentification ---
  signup.onclick = async () => {
    const { error } = await supabase.auth.signUp({
      email: email.value,
      password: password.value,
      options: { emailRedirectTo: window.location.href }
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

  // --- Vérifie disponibilité pseudo ---
  async function checkUsernameAvailability(username) {
    if (!username) return false;
    const publicJsonName = `guests_${username}.json`;
    const { data, error } = await supabase.storage.from('public-guests').list('', { search: publicJsonName });
    if (error) return false;
    return !data.some(f => f.name === publicJsonName);
  }

  usernameInput.addEventListener('blur', async () => {
    const username = usernameInput.value.trim();
    if (!username) {
      usernameStatus.textContent = '';
      return;
    }
    const available = await checkUsernameAvailability(username);
    usernameStatus.textContent = available ? "✅ Disponible" : "❌ Déjà pris";
    usernameStatus.className = available ? "available" : "taken";
  });

  // --- Détection séparateur CSV ---
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
    const available = await checkUsernameAvailability(username);
    if (!available) return alert("❌ Identifiant déjà utilisé.");

    const csvFile = csvInput.files[0];
    if (!csvFile) return alert("❌ Aucun fichier CSV sélectionné.");
    const text = await csvFile.text();
    const delimiter = detectDelimiter(text);

    const results = Papa.parse(text, {
      header: true,
      skipEmptyLines: true,
      delimiter
    });

    // --- JSON public si non privé ---
    if (!privateCsvCheckbox.checked) {
      const publicJsonName = `guests_${username}.json`;
      const jsonBlob = new Blob([JSON.stringify(results.data, null, 2)], { type: 'application/json' });
      const { error } = await supabase.storage.from('public-guests').upload(publicJsonName, jsonBlob, { upsert: true });
      if (error) return alert('Erreur upload JSON public: ' + error.message);
      const publicUrl = `https://xrffjwulhrydrhlvuhlj.supabase.co/storage/v1/object/public/public-guests/${publicJsonName}`;
      publicUrlDiv.textContent = `✅ JSON public disponible à l’URL : ${publicUrl}`;
    }

    // --- Upload images ---
    const imgs = imagesInput.files;
    for (const img of imgs) {
      const { error } = await supabase.storage.from('images').upload(`${user.id}/${img.name}`, img, { upsert: true });
      if (error) return alert('Erreur upload image: ' + error.message);
    }

    alert("✅ Upload terminé !");
  };

});
