console.log("✅ Fichier supabase.js chargé");
// Initialisation du client Supabase (clé publique)
const supabaseUrl = 'https://xrffjwulhrydrhlvuhlj.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhyZmZqd3VsaHJ5ZHJobHZ1aGxqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA2Mjc2MDQsImV4cCI6MjA3NjIwMzYwNH0.uzlCCfMol_8RqRG2fx4RITkLTZogIKWTQd5zhZELjhg';

const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);
console.log("🔗 Supabase initialisé:", supabase);

// Sélecteurs DOM
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

// Fonctions utilitaires d’affichage
function onLogin() {
  console.log("✅ Connexion réussie");
  authDiv.style.display = 'none';
  uploadDiv.style.display = 'block';
  logout.style.display = 'inline-block';
}

function onLogout() {
  console.log("👋 Déconnexion");
  authDiv.style.display = 'block';
  uploadDiv.style.display = 'none';
  logout.style.display = 'none';
}

// Vérifie la session au chargement
supabase.auth.getSession().then(({ data }) => {
  console.log("🔍 Session actuelle:", data);
  if (data.session) onLogin();
  else onLogout();
});

// === ÉVÉNEMENTS ===

signup.onclick = async () => {
  console.log("🟢 Tentative de création de compte...");
  const { error } = await supabase.auth.signUp({
    email: email.value,
    password: password.value
  });
  if (error) alert('Erreur: ' + error.message);
  else alert('✅ Compte créé ! Vérifie ton email avant de te connecter.');
};

login.onclick = async () => {
  console.log("🟡 Tentative de connexion...");
  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.value,
    password: password.value
  });
  if (error) alert('Erreur: ' + error.message);
  else onLogin();
};

logout.onclick = async () => {
  console.log("🔴 Déconnexion...");
  await supabase.auth.signOut();
  onLogout();
};

// === UPLOAD ===
sendBtn.onclick = async () => {
  console.log("📤 Début upload...");
  const { data: userData } = await supabase.auth.getUser();
  const user = userData?.user;
  if (!user) return alert("Non connecté.");

  // Upload CSV
  const csv = csvInput.files[0];
  if (csv) {
    const { error } = await supabase.storage.from('data')
      .upload(`${user.id}/${csv.name}`, csv, { upsert: true });
    if (error) return alert('Erreur upload CSV: ' + error.message);
  }

  // Upload images
  const imgs = imagesInput.files;
  for (const img of imgs) {
    const { error } = await supabase.storage.from('images')
      .upload(`${user.id}/${img.name}`, img, { upsert: true });
    if (error) return alert('Erreur upload image: ' + error.message);
  }

  alert('🎉 Upload terminé !');
};
