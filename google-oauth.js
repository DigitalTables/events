import { GOOGLE_CLIENT_ID } from "./supabase.js";

let googleAuthWindow = null;

export async function googleSignInPopup() {
  return new Promise((resolve, reject) => {
    const redirectUri = window.location.origin + "/oauth.html";

    const authUrl =
      "https://accounts.google.com/o/oauth2/v2/auth?" +
      new URLSearchParams({
        client_id: GOOGLE_CLIENT_ID,
        redirect_uri: redirectUri,
        response_type: "token",
        scope: [
          "https://www.googleapis.com/auth/drive.file",
          "https://www.googleapis.com/auth/spreadsheets"
        ].join(" "),
        include_granted_scopes: "true",
        prompt: "consent"
      });

    googleAuthWindow = window.open(
      authUrl,
      "google_oauth",
      "width=500,height=600"
    );

    if (!googleAuthWindow) {
      return reject(new Error("Impossible d'ouvrir la popup OAuth."));
    }

    const timer = setInterval(() => {
      try {
        const url = googleAuthWindow.location.href;

        if (url.includes("access_token=")) {
          clearInterval(timer);

          const params = new URLSearchParams(
            url.split("#")[1]
          );

          const accessToken = params.get("access_token");

          googleAuthWindow.close();
          resolve(accessToken);
        }
      } catch (e) {
        // Normal : domaine cross-origin tant que Google n'a pas redirigé.
      }

      if (googleAuthWindow.closed) {
        clearInterval(timer);
        reject(new Error("Fenêtre OAuth fermée par l’utilisateur."));
      }
    }, 300);
  });
}
