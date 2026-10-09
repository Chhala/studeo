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

// ---------- Compensation de la barre d'état sur iPhone en mode application ----------
// Mesuré sur un iPhone 17 Pro (menu ⋮, ligne de diagnostic) : écran 402×874, mais fenêtre ET coquille
// 402×812 alors que la page s'étend sous la barre d'état translucide. iOS retire donc la hauteur de la
// barre d'état (≈ 62 pt) de la fenêtre (innerHeight, vh, dvh) tout en laissant la page démarrer en haut
// de l'écran : même épinglée aux 4 bords, la coquille s'arrête 62 pt trop tôt (bande vide en bas).
// On lui rend cette hauteur : hauteur mesurée + safe-area-inset-top, uniquement sur iOS en mode
// application, et seulement si le résultat ne dépasse pas l'écran (sinon le défaut n'existe pas sur cet
// appareil / cette version d'iOS et on ne touche à rien). Décision §5.44.
function compenserBarreEtatIOS() {
  const shell = document.getElementById("app-shell");
  window.__diagCoquille = "compensation iOS : non";
  if (!shell || window.navigator.standalone !== true) return;

  shell.style.height = ""; // revient à la hauteur naturelle (top/bottom: 0) avant de mesurer

  const sonde = document.createElement("div");
  sonde.style.cssText = "position:fixed;top:0;left:0;width:0;visibility:hidden;padding-top:env(safe-area-inset-top, 0px);";
  document.body.appendChild(sonde);
  const inset = parseFloat(getComputedStyle(sonde).paddingTop) || 0;
  sonde.remove();

  const hauteur = shell.getBoundingClientRect().height;
  const ecran = Math.max(window.screen.width, window.screen.height);
  if (inset > 0 && window.innerHeight > window.innerWidth && hauteur + inset <= ecran + 1) {
    shell.style.height = `${hauteur + inset}px`;
    window.__diagCoquille = `compensation iOS : +${Math.round(inset)}`;
  } else {
    window.__diagCoquille = `compensation iOS : non (inset ${Math.round(inset)})`;
  }
}
compenserBarreEtatIOS();
window.addEventListener("resize", compenserBarreEtatIOS);
window.addEventListener("orientationchange", compenserBarreEtatIOS);
window.addEventListener("pageshow", compenserBarreEtatIOS);

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
