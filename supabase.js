import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = 'https://xrffjwulhrydrhlvuhlj.supabase.co';
const SUPABASE_KEY = 'xrffjwulhrydrhlvuhlj';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

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

// Vérifie si déjà connecté
supabase.auth.getSession().then(({ data }) => {
  if (data.session) onLogin();
});

signup.onclick = async () => {
  const { error } = await supabase.auth.signUp({
    email: email.value,
    password: password.value
  });
  if (error) alert('Erreur: ' + error.message);
  else alert('Compte créé ! Vérifie ton email.');
};

login.onclick = async () => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.value,
    password: password.value
  });
  if (error) alert('Erreur: ' + error.message);
  else onLogin();
};

logout.onclick = async () => {
  await supabase.auth.signOut();
  authDiv.style.display = 'block';
  uploadDiv.style.display = 'none';
  logout.style.display = 'none';
};

function onLogin() {
  authDiv.style.display = 'none';
  uploadDiv.style.display = 'block';
  logout.style.display = 'inline-block';
}

// Upload fichiers
sendBtn.onclick = async () => {
  const user = (await supabase.auth.getUser()).data.user;
  if (!user) return alert("Non connecté.");

  // 1️⃣ Upload CSV
  const csv = csvInput.files[0];
  if (csv) {
    const { error } = await supabase.storage.from('uploads')
      .upload(`${user.id}/${csv.name}`, csv, { upsert: true });
    if (error) alert('Erreur upload CSV: ' + error.message);
  }

  // 2️⃣ Upload images
  const imgs = imagesInput.files;
  for (const img of imgs) {
    const { error } = await supabase.storage.from('uploads')
      .upload(`${user.id}/images/${img.name}`, img, { upsert: true });
    if (error) alert('Erreur upload image: ' + error.message);
  }

  alert('Upload terminé ! 🎉');
};
