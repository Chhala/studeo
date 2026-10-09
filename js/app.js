// app.js — Unique responsabilité : démarrer l'application et câbler les modules entre eux.
// Ne contient aucune logique métier ni aucun rendu propre.

import * as dataStore from "./dataStore.js";
import * as audioEngine from "./audioEngine.js";
import * as themeEngine from "./themeEngine.js";
import * as router from "./router.js";
import * as uiRenderer from "./uiRenderer.js";
import * as installPrompt from "./installPrompt.js";
import * as appShell from "./appShell.js";

// ---------- Démarrage ----------
async function demarrer() {
  dataStore.init();
  await audioEngine.init();

  appShell.init({
    shell: document.getElementById("app-shell"),
    view: document.getElementById("app-view"),
    fond: document.getElementById("fond-actif")
  });

  themeEngine.lierElementFond(document.getElementById("fond-actif"));
  themeEngine.initParallax();

  router.definirGestionnaire(uiRenderer.afficherRoute);
  router.init();

  // Premier geste de l'enfant : débloque l'audio iOS et demande, le cas échéant,
  // l'autorisation d'inclinaison pour le parallaxe (doit être demandée depuis un geste
  // utilisateur direct, donc câblée ici plutôt que dans themeEngine.init()).
  document.body.addEventListener(
    "pointerdown",
    () => {
      audioEngine.debloquerAudio();
      themeEngine.demanderPermissionParallaxeIOS();
    },
    { once: true }
  );

  initInstallation();
}

// ---------- Installation PWA ----------
function initInstallation() {
  installPrompt.init({
    onAndroidInstallable: () => afficherBanniereInstallation("android"),
    onIOSInstructions: () => afficherBanniereInstallation("ios")
  });
}

function afficherBanniereInstallation(plateforme) {
  if (document.getElementById("banniere-installation")) return;

  const banniere = document.createElement("div");
  banniere.id = "banniere-installation";
  banniere.style.cssText = [
    "position:absolute", "left:16px", "right:16px",
    "top:calc(env(safe-area-inset-top, 0px) + 8px)",
    "background:#FFFFFF", "border-radius:18px", "padding:12px 14px",
    "box-shadow:0 6px 20px rgba(194,52,68,0.18)", "display:flex",
    "align-items:center", "gap:10px", "z-index:8", "font-family:'Nunito',sans-serif"
  ].join(";");

  banniere.innerHTML =
    plateforme === "android"
      ? `<span style="flex:1;font-weight:700;font-size:13px;color:var(--text-dark);">Installe Studeo sur ton écran d'accueil !</span>
         <button type="button" id="bouton-installer" style="border:none;background:var(--accent);color:#fff;font-weight:700;font-size:13px;padding:8px 14px;border-radius:999px;cursor:pointer;">Installer</button>
         <button type="button" id="bouton-fermer-banniere" aria-label="Fermer" style="border:none;background:none;font-size:16px;cursor:pointer;color:var(--text-muted);">✕</button>`
      : `<span style="flex:1;font-weight:700;font-size:12.5px;color:var(--text-dark);">Appuie sur Partager, puis « Ajouter à l'écran d'accueil ».</span>
         <button type="button" id="bouton-fermer-banniere" aria-label="Fermer" style="border:none;background:none;font-size:16px;cursor:pointer;color:var(--text-muted);">✕</button>`;

  document.getElementById("app-shell").appendChild(banniere);

  document.getElementById("bouton-fermer-banniere").addEventListener("click", () => banniere.remove());
  const boutonInstaller = document.getElementById("bouton-installer");
  if (boutonInstaller) {
    boutonInstaller.addEventListener("click", async () => {
      await installPrompt.declencherInstallationAndroid();
      banniere.remove();
    });
  }
}

// ---------- Service worker ----------
// Appelée AVANT demarrer() : demarrer() attend le chargement des voix (await audioEngine.init()) et
// peut finir après l'évènement "load" ; l'écouteur posé à la fin de demarrer() n'était alors
// jamais déclenché et le service worker ne s'enregistrait jamais (pas de cache, pas de mode
// hors-ligne, pas de mise à jour contrôlée — décision §5.44).
function enregistrerServiceWorker() {
  if (!("serviceWorker" in navigator)) return;
  const enregistrer = () => {
    navigator.serviceWorker.register("./service-worker.js").catch((erreur) => {
      console.error("Studeo: échec d'enregistrement du service worker.", erreur);
    });
  };
  if (document.readyState === "complete") enregistrer();
  else window.addEventListener("load", enregistrer, { once: true });
}

enregistrerServiceWorker();
demarrer();
