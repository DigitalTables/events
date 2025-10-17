import { createClient } from '@supabase/supabase-js'

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ⚙️ Ajouter ou mettre à jour les infos profil
async function saveProfile({ full_name, event_date, event_type }) {
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    alert("Utilisateur non connecté !");
    return;
  }

  const { error } = await supabase
    .from('user_profiles')
    .upsert({
      id: user.id,
      full_name,
      event_date,
      event_type
    });

  if (error) {
    console.error(error);
    alert("Erreur sauvegarde profil : " + error.message);
  } else {
    alert("Profil enregistré !");
  }
}
