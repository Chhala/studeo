// themeEngine.js — Unique responsabilité : appliquer le fond d'écran actif et gérer l'effet
// de profondeur (parallaxe par inclinaison, avec repli en douce respiration CSS).

import { BACKGROUNDS_CONFIG, BACKGROUND_NONE_ID } from "./backgrounds.config.js";
import * as dataStore from "./dataStore.js";
import * as rewardEngine from "./rewardEngine.js";

let coucheFond = null;
let ecouteurOrientationActif = false;

export function lierElementFond(el) {
  coucheFond = el;
  appliquerFondActif();
}

export function getCatalogue() {
  const actif = dataStore.getFondActif();
  return BACKGROUNDS_CONFIG.map((fond) => ({
    ...fond,
    debloque: dataStore.estDebloque("background", fond.id),
    actif: fond.id === actif
  }));
}

export function essayerSelectionner(id) {
  const fond = BACKGROUNDS_CONFIG.find((f) => f.id === id);
  if (!fond) return { ok: false, manque: 0 };

  const resultat = rewardEngine.essayerDebloquer("background", id, fond.coutEtoiles);
  if (!resultat.ok) return resultat;

  dataStore.setFondActif(id);
  appliquerFondActif();
  return { ok: true };
}

function appliquerFondActif() {
  if (!coucheFond) return;

  const idActif = dataStore.getFondActif();
  const fond = BACKGROUNDS_CONFIG.find((f) => f.id === idActif);

  if (!fond || idActif === BACKGROUND_NONE_ID || !fond.image) {
    coucheFond.style.backgroundImage = "none";
    return;
  }

  coucheFond.style.backgroundImage = `url("${fond.image}")`;
  coucheFond.style.backgroundPosition = fond.focal || "center";
  coucheFond.style.backgroundSize = "cover";
}

// Parallaxe : inclinaison du téléphone en priorité, respiration CSS en repli universel.
// Respecte systématiquement prefers-reduced-motion.
export function initParallax() {
  if (!coucheFond) return;

  const motionReduite = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (motionReduite) return;

  coucheFond.classList.add("fond-respiration");

  if (typeof DeviceOrientationEvent !== "undefined") {
    if (typeof DeviceOrientationEvent.requestPermission === "function") {
      // iOS 13+ : l'autorisation doit être demandée depuis un geste utilisateur explicite.
      // Cette fonction est appelée par installPrompt/app.js au bon moment (ex: premier tap).
      return;
    }
    // Android et anciens iOS : pas de permission requise, on active directement.
    activerParallaxeOrientation();
  }
}

export function demanderPermissionParallaxeIOS() {
  if (
    typeof DeviceOrientationEvent === "undefined" ||
    typeof DeviceOrientationEvent.requestPermission !== "function"
  ) {
    return;
  }
  DeviceOrientationEvent.requestPermission()
    .then((reponse) => {
      if (reponse === "granted") activerParallaxeOrientation();
    })
    .catch(() => {
      /* refusé ou indisponible : la respiration CSS reste active en repli */
    });
}

function activerParallaxeOrientation() {
  if (ecouteurOrientationActif || !coucheFond) return;
  ecouteurOrientationActif = true;
  coucheFond.classList.remove("fond-respiration");

  window.addEventListener("deviceorientation", (evenement) => {
    const beta = evenement.beta || 0; // avant/arrière, -180 à 180
    const gamma = evenement.gamma || 0; // gauche/droite, -90 à 90
    const decalageX = Math.max(-10, Math.min(10, gamma / 3));
    const decalageY = Math.max(-10, Math.min(10, (beta - 45) / 4));
    coucheFond.style.transform = `translate(${decalageX}px, ${decalageY}px) scale(1.12)`;
  });
}
