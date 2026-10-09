// characterEngine.js — Unique responsabilité : exposer la liste des personnages avec leur
// état (actif/débloqué/verrouillé) et piloter l'animation du compagnon affiché à l'écran.
// Ne connaît rien du DOM des écrans qui l'utilisent.

import { CHARACTERS_CONFIG, cheminSprite, dureeAnimationMs } from "./characters.config.js";
import * as dataStore from "./dataStore.js";
import * as rewardEngine from "./rewardEngine.js";
import { SpriteAnimator } from "./spriteAnimator.js";

let animateur = null;
let minuteurRetourIdle = null;

export function lierElementCompagnon(imgEl, fallbackEl) {
  animateur = new SpriteAnimator(imgEl, fallbackEl);
  animateur.definirPersonnage(dataStore.getPersonnageActif());
  animateur.jouer("idle");
}

export function getCatalogue() {
  const actif = dataStore.getPersonnageActif();
  return CHARACTERS_CONFIG.map((perso) => ({
    ...perso,
    image: cheminSprite(perso.id, "idle", 0, 1),
    debloque: dataStore.estDebloque("character", perso.id),
    actif: perso.id === actif
  }));
}

// Renvoie { ok: true } ou { ok: false, manque: n } pour afficher "il te manque N étoiles".
export function essayerSelectionner(id) {
  const perso = CHARACTERS_CONFIG.find((p) => p.id === id);
  if (!perso) return { ok: false, manque: 0 };

  const resultat = rewardEngine.essayerDebloquer("character", id, perso.coutEtoiles);
  if (!resultat.ok) return resultat;

  dataStore.setPersonnageActif(id);
  if (animateur) {
    animateur.definirPersonnage(id);
    animateur.jouer("idle");
  }
  return { ok: true };
}

export function jouerAnimation(nom) {
  if (animateur) animateur.jouer(nom);
}

// ---------- Vie aléatoire de la mascotte de l'accueil (décision §5.34) ----------
// De temps en temps, la mascotte fait quelques pas sur place (2 ou 3 cycles de marche), puis
// revient à l'attente. Bunny et Catty font parfois une danse à la place. (Le rebond de Slime,
// sans pieds, est géré par SpriteAnimator via `rebond` dans la config.)

const DELAI_PREMIER_EPISODE_MS = 6000; // laisse passer le texte de la mascotte et l'effet des étoiles
const DELAI_ENTRE_EPISODES_MS = [8000, 20000];
const PROBABILITE_DANSE = 0.25;
const PERSONNAGES_QUI_DANSENT = ["bunny", "catty"];
const DUREE_DANSE_MS = 1300;

let minuteurVie = null;
let minuteurFinEpisode = null;
let cibleVie = null;

const alea = (min, max) => min + Math.random() * (max - min);

function terminerEpisode(cible) {
  clearTimeout(minuteurFinEpisode);
  if (cible.imgEl.isConnected) cible.jouer("idle");
}

export function arreterVieAleatoire() {
  clearTimeout(minuteurVie);
  clearTimeout(minuteurFinEpisode);
  minuteurVie = null;
  cibleVie = null;
}

// Joue un épisode maintenant (le minuteur l'appelle ; exporté pour pouvoir le déclencher
// directement). Sans effet si la mascotte est occupée (réaction en cours) ou l'onglet caché.
export function jouerEpisode(cible = cibleVie) {
  if (!cible || document.hidden || !cible.imgEl.isConnected || cible.animationCourante !== "idle") return;

  const id = cible.characterId;
  if (PERSONNAGES_QUI_DANSENT.includes(id) && Math.random() < PROBABILITE_DANSE) {
    cible.jouer("jump"); // pour eux, la variante de base de "jump" est leur danse
    minuteurFinEpisode = setTimeout(() => terminerEpisode(cible), DUREE_DANSE_MS);
    return;
  }

  const cycles = Math.random() < 0.5 ? 2 : 3;
  cible.jouer("walk");
  minuteurFinEpisode = setTimeout(() => terminerEpisode(cible), dureeAnimationMs(id, "walk") * cycles);
}

// À appeler une fois la mascotte de l'accueil liée (lierElementCompagnon). S'arrête d'elle-même
// si son image quitte l'écran, et ne tourne pas si l'appareil demande de limiter les animations.
export function demarrerVieAleatoire() {
  arreterVieAleatoire();
  if (!animateur || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  const cible = animateur;
  cibleVie = cible;

  const planifier = (delai) => {
    minuteurVie = setTimeout(() => {
      if (!cible.imgEl.isConnected) return;
      jouerEpisode(cible);
      planifier(alea(...DELAI_ENTRE_EPISODES_MS));
    }, delai);
  };
  planifier(DELAI_PREMIER_EPISODE_MS);
}

// À appeler sur chaque événement de scroll de la liste "Mes Mots" : bascule sur le cycle
// de marche, puis revient sur idle ~150ms après le dernier événement.
export function signalerScroll() {
  if (!animateur) return;
  if (animateur.animationCourante !== "walk") animateur.jouer("walk");

  clearTimeout(minuteurRetourIdle);
  minuteurRetourIdle = setTimeout(() => animateur.jouer("idle"), 150);
}
