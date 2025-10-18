
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.1";

console.log("✅ Fichier supabase.js chargé");

// --- Supabase ---
const supabaseUrl = "https://xrffjwulhrydrhlvuhlj.supabase.co";
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhyZmZqd3VsaHJ5ZHJobHZ1aGxqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA2Mjc2MDQsImV4cCI6MjA3NjIwMzYwNH0.uzlCCfMol_8RqRG2fx4RITkLTZogIKWTQd5zhZELjhg';
const supabase = createClient(supabaseUrl, supabaseKey);

// --- Sélecteurs DOM ---
const email = document.getElementById('email');
const password = document.getElementById('password');
const signup = document.getElementById('signup');
const login = document.getElementById('login');
const logout = document.getElementById('logout');
const uploadDiv = document.getElementById('upload');
const authDiv = document.getElementById('auth');
const sendBtn = document.getElementById('send');
const csvInput = document.getElementById('csvFile');
const imagesInput = document.getElementById('images');

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
}

// --- Vérifie token de confirmation dans l'URL ---
const params = new URLSearchParams(window.location.search);
if (params.has('access_token')) {
  alert("✅ Ton compte est confirmé ! Connecte-toi maintenant.");
  // Nettoie l'URL pour ne pas réafficher le message au rechargement
  window.history.replaceState({}, document.title, window.location.pathname);
}

// --- Vérifie session au chargement ---
supabase.auth.getSession().then(({ data }) => {
  if (data.session) onLogin();
  else onLogout();
});

// --- Événements ---
signup.onclick = async () => {
  const { error } = await supabase.auth.signUp({
    email: email.value,
    password: password.value,
    options: {
      emailRedirectTo: "https://digitaltables.github.io/events/" // redirection GitHub Pages
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

  const csv = csvInput.files[0];
  if (csv) {
    const { error } = await supabase.storage.from('data').upload(`${user.id}/${csv.name}`, csv, { upsert: true });
    if (error) return alert('Erreur upload CSV: ' + error.message);
  }

  const imgs = imagesInput.files;
  for (const img of imgs) {
    const { error } = await supabase.storage.from('images').upload(`${user.id}/${img.name}`, img, { upsert: true });
    if (error) return alert('Erreur upload image: ' + error.message);
  }

  alert("✅ Upload terminé !");
};
