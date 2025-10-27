// supabase.js
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.1";
import Papa from "https://cdn.jsdelivr.net/npm/papaparse@5.4.1/+esm";

console.log("✅ supabase.js chargé");

const supabaseUrl = "https://xrffjwulhrydrhlvuhlj.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhyZmZqd3VsaHJ5ZHJobHZ1aGxqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA2Mjc2MDQsImV4cCI6MjA3NjIwMzYwNH0.uzlCCfMol_8RqRG2fx4RITkLTZogIKWTQd5zhZELjhg";
export const supabase = createClient(supabaseUrl, supabaseKey);
window.supabase = supabase;

document.addEventListener("DOMContentLoaded", () => {
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
  const passwordDiv = document.getElementById("passwordDiv");
  const eventPasswordInput = document.getElementById("eventPassword");

  // Toggle password input for private events
  privateCsvCheckbox.addEventListener("change", () => {
    passwordDiv.style.display = privateCsvCheckbox.checked ? "block" : "none";
  });

  // Session handling
  const onLogin = () => {
    authDiv.style.display = "none";
    uploadDiv.style.display = "block";
    logoutBtn.style.display = "inline-block";
  };
  const onLogout = () => {
    authDiv.style.display = "block";
    uploadDiv.style.display = "none";
    logoutBtn.style.display = "none";
    publicUrlDiv.textContent = "";
  };

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
    const { error } = await supabase.auth.signUp({ email: email.value, password: password.value });
    if (error) alert("Erreur : " + error.message);
    else alert("✅ Compte créé, vérifie ton email.");
  };

  login.onclick = async () => {
    const { error } = await supabase.auth.signInWithPassword({ email: email.value, password: password.value });
    if (error) alert("Erreur : " + error.message);
    else onLogin();
  };

  // Check username availability
  async function checkPublicJsonExists(username) {
    const publicJsonName = `guests_${username}.json`;
    const { data, error } = await supabase.storage.from("public-guests").list("", { search: publicJsonName });
    if (error) console.warn(error.message);
    return data?.some((f) => f.name === publicJsonName) || false;
  }

  usernameInput.addEventListener("blur", async () => {
    const username = usernameInput.value.trim();
    if (!username) { usernameStatus.textContent = ""; return; }
    const exists = await checkPublicJsonExists(username);
    usernameStatus.textContent = exists ? "❌ Pseudo déjà utilisé pour un JSON public" : "✅ Disponible (JSON public)";
    usernameStatus.style.color = exists ? "red" : "green";
  });

  // Detect CSV delimiter
  function detectDelimiter(text) {
    const firstLine = text.split(/\r?\n/)[0] || "";
    return (firstLine.match(/;/g) || []).length > (firstLine.match(/,/g) || []).length ? ";" : ",";
  }

  // Upload handler
  sendBtn.onclick = async () => {
    const { data: userData } = await supabase.auth.getUser();
    const user = userData?.user;
    if (!user) return alert("❌ Tu dois être connecté pour uploader.");

    const username = usernameInput.value.trim();
    if (!username) return alert("❌ Choisis un identifiant public.");

    const isPrivate = privateCsvCheckbox.checked;
    const eventPassword = eventPasswordInput.value.trim();
    if (isPrivate && !eventPassword) return alert("❌ Pour un événement privé, définis un mot de passe.");

    const csvFile = csvInput.files[0];
    if (!csvFile) return alert("❌ Choisis un fichier CSV.");

    const text = await csvFile.text();
    const delimiter = detectDelimiter(text);
    const parsed = Papa.parse(text, { header: true, skipEmptyLines: true, delimiter });
    const rows = parsed.data;

    // Upload CSV private
    const csvPath = `guests_${username}.csv`;
    const csvBlob = new Blob([text], { type: "text/csv" });
    const { error: csvUpErr } = await supabase.storage.from("guests").upload(csvPath, csvBlob, { upsert: true });
    if (csvUpErr) return alert("Erreur upload CSV : " + csvUpErr.message);

    // Public JSON
    let signedOrPublicUrl = null;
    if (!isPrivate) {
      const jsonBlob = new Blob([JSON.stringify(rows, null, 2)], { type: "application/json" });
      const publicJsonName = `guests_${username}.json`;
      const { error: jsonUpErr } = await supabase.storage.from("public-guests").upload(publicJsonName, jsonBlob, { upsert: true });
      if (jsonUpErr) return alert("Erreur upload JSON public: " + jsonUpErr.message);
      signedOrPublicUrl = `${supabaseUrl}/storage/v1/object/public/public-guests/${publicJsonName}`;
    } else {
      // Private signed URL
      const oneYear = 60 * 60 * 24 * 365;
      const { data: signed, error: signedErr } = await supabase.storage.from("guests").createSignedUrl(csvPath, oneYear);
      if (signedErr || !signed?.signedURL) return alert("Erreur génération URL signée pour le CSV privé.");
      signedOrPublicUrl = signed.signedURL;
    }

    // Upsert event
    const eventRow = {
      username,
      event_password: isPrivate ? eventPassword : null,
      signed_url: signedOrPublicUrl,
      is_private: isPrivate,
      created_at: new Date().toISOString(),
      user_id: user.id,
    };
    const { error: upsertErr } = await supabase.from("events").upsert(eventRow, { onConflict: "username" });
    if (upsertErr) return alert("Erreur enregistrement événement: " + upsertErr.message);

    // Upload images
    for (const img of imagesInput.files) {
      const { error: imgErr } = await supabase.storage.from("images").upload(`${username}/${img.name}`, img, { upsert: true });
      if (imgErr) return alert("Erreur upload image: " + imgErr.message);
    }

    const eventUrl = `${window.location.origin}/events/tables.html?event=${encodeURIComponent(username)}`;
    publicUrlDiv.innerHTML = isPrivate
      ? `🔒 Événement privé créé. Partage ce lien : <br><strong><a href="${eventUrl}" target="_blank">${eventUrl}</a></strong>`
      : `🌍 Événement public créé. Table publique : <br><strong><a href="${eventUrl}" target="_blank">${eventUrl}</a></strong> <br> JSON public : <br><code>${signedOrPublicUrl}</code>`;

    alert("✅ Upload terminé !");
  };
});
