// vieMascottes.js — Unique responsabilité : donner vie aux personnages DÉBLOQUÉS de la grille
// de "Mon Album" (décision §5.34) : attente en continu avec des départs décalés, quelques pas
// aléatoires de temps en temps (un seul personnage à la fois) et une réaction quand on touche
// une tuile. Les personnages verrouillés restent figés. Ne sait rien des écrans : on lui donne
// un conteneur de tuiles et la liste des personnages débloqués.

import { SpriteAnimator } from "./spriteAnimator.js";
import { reactionBoutique, dureeAnimationMs } from "./characters.config.js";

const DELAI_ENTRE_PAS_MS = [4000, 8000];
const CYCLES_DE_PAS = 2.5;
const MARGE_REACTION_MS = 250;

let tuiles = new Map(); // id -> { animateur, minuteurDepart, minuteurFin }
let minuteurPas = null;
let retraits = [];

const alea = (min, max) => min + Math.random() * (max - min);
const mouvementReduit = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// Arrête toutes les animations et minuteurs : à appeler avant d'afficher une autre vue (sinon
// les images continueraient de défiler sur des éléments qui ne sont plus à l'écran).
export function arreter() {
  clearTimeout(minuteurPas);
  minuteurPas = null;
  tuiles.forEach((t) => {
    clearTimeout(t.minuteurDepart);
    clearTimeout(t.minuteurFin);
    t.animateur.arreter();
  });
  tuiles = new Map();
  retraits.forEach((retirer) => retirer());
  retraits = [];
}

function jouer(id, animation, dureeMs) {
  const t = tuiles.get(id);
  if (!t) return;
  clearTimeout(t.minuteurDepart);
  clearTimeout(t.minuteurFin);
  t.animateur.jouer(animation);
  t.minuteurFin = setTimeout(() => t.animateur.jouer("idle"), dureeMs);
}

function planifierPas() {
  clearTimeout(minuteurPas);
  minuteurPas = setTimeout(() => {
    const ids = [...tuiles.keys()];
    if (ids.length > 0 && !document.hidden) {
      const id = ids[Math.floor(Math.random() * ids.length)];
      jouer(id, "walk", dureeAnimationMs(id, "walk") * CYCLES_DE_PAS);
    }
    planifierPas();
  }, alea(...DELAI_ENTRE_PAS_MS));
}

// Toucher une tuile débloquée : le personnage réagit (voir `reactionBoutique` dans la config),
// puis revient à l'attente.
export function reagir(id) {
  if (!tuiles.has(id)) return;
  const animation = reactionBoutique(id);
  const cycles = animation === "walk" ? CYCLES_DE_PAS : 1;
  jouer(id, animation, dureeAnimationMs(id, animation) * cycles + MARGE_REACTION_MS);
}

// `conteneur` : élément contenant les tuiles ".tuile-collectible" (data-id = id du personnage).
// `idsDebloques` : seuls ces personnages s'animent.
export function demarrer(conteneur, idsDebloques) {
  arreter();
  if (mouvementReduit()) return;

  conteneur.querySelectorAll(".tuile-collectible").forEach((tuile) => {
    const id = tuile.dataset.id;
    if (!idsDebloques.includes(id)) return;

    const animateur = new SpriteAnimator(tuile.querySelector("img"), tuile.querySelector(".repli"));
    animateur.definirPersonnage(id);
    const t = { animateur, minuteurDepart: null, minuteurFin: null };
    // Départs décalés : les personnages ne bougent pas tous en même temps, comme des robots.
    t.minuteurDepart = setTimeout(() => animateur.jouer("idle"), alea(0, 1800));
    tuiles.set(id, t);
  });

  planifierPas();

  // Onglet caché : on met tout en pause (économie de batterie), reprise au retour.
  const surVisibilite = () => {
    if (document.hidden) {
      clearTimeout(minuteurPas);
      tuiles.forEach((t) => { clearTimeout(t.minuteurFin); t.animateur.arreter(); });
    } else {
      tuiles.forEach((t) => t.animateur.jouer("idle"));
      planifierPas();
    }
  };
  document.addEventListener("visibilitychange", surVisibilite);
  retraits.push(() => document.removeEventListener("visibilitychange", surVisibilite));
}
