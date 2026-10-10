// sons.js — Unique responsabilité : tous les sons de l'app, fabriqués avec Web Audio (aucun fichier) :
// la voix de la mascotte, la frappe de l'enfant, la bonne/mauvaise réponse, l'étoile gagnée et le
// score parfait (décision §5.48). Ne dépend d'aucun autre module : l'état « sons activés » lui est
// fourni par app.js / overlays.js (qui le lisent dans dataStore).
//
// Tous les sons parlent la même langue, « Pip » : un sinus bref qui commence par un petit glissé et
// qui s'arrête net, sans timbre musical, sans rien au-dessus de 2 kHz.

let ctx = null;
let entree = null;
let actif = true;

const NIVEAU_PIP = 0.24;          // 0,17 × 1,4 : niveau de base validé à l'écoute
const ECART_MIN_MS = 70;          // jamais plus d'un son de voix/frappe par 70 ms (tous émetteurs confondus)
const HAUTEUR_BASE_HZ = 262;      // voix « moyenne » (Tanuki)
const HAUTEUR_FRAPPE_HZ = 262;    // la frappe de l'enfant : une seule note, pour qu'on ne la confonde pas avec la voix
const NIVEAU_FRAPPE = 0.6;        // … et plus discrète

let dernierSonMs = -Infinity;
let voixSilencieuseJusqua = 0;    // un son de jeu / la prononciation couvre la voix un instant

export function definirActif(valeur) {
  actif = Boolean(valeur);
}

export function estActif() {
  return actif;
}

// ---------- Contexte audio ----------

function creerContexte() {
  if (ctx) return;
  try {
    const Contexte = window.AudioContext || window.webkitAudioContext;
    if (!Contexte) return;
    ctx = new Contexte();
    entree = ctx.createGain();
    const doux = ctx.createBiquadFilter();
    doux.type = "lowpass";
    doux.frequency.value = 3200;
    doux.Q.value = 0.5;
    const general = ctx.createGain();
    general.gain.value = 0.6;
    entree.connect(doux);
    doux.connect(general);
    general.connect(ctx.destination);
  } catch (erreur) {
    ctx = null;
  }
}

// Reprend le contexte s'il est suspendu. Sur iPhone il ne démarre qu'après un vrai geste (touchend /
// click) et la prononciation vocale peut le suspendre de nouveau : on le relance donc à CHAQUE geste
// de l'enfant, pas seulement au premier.
function reveiller() {
  creerContexte();
  if (ctx && ctx.state !== "running") ctx.resume().catch(() => {});
}

export function armerDeblocage() {
  ["pointerdown", "touchend", "click", "keydown"].forEach((evenement) => {
    document.addEventListener(evenement, reveiller, { passive: true });
  });
}

// Un son n'est joué que si le contexte tourne vraiment : sinon (iPhone avant le premier geste), les
// notes déjà programmées partiraient toutes d'un coup au réveil du contexte.
function pret() {
  if (!actif || document.hidden) return false;
  creerContexte();
  if (!ctx) return false;
  if (ctx.state !== "running") {
    ctx.resume().catch(() => {});
    return false;
  }
  return true;
}

// ---------- Briques ----------

// Un sinus dont la hauteur glisse de f0 à f1, enveloppe courte (attaque `att`, extinction à `du`).
function coup(f0, f1, { gl = 0.03, du = 0.08, att = 0.003, v = NIVEAU_PIP, t = 0 } = {}) {
  const t0 = ctx.currentTime + t;
  const oscillateur = ctx.createOscillator();
  const gain = ctx.createGain();
  oscillateur.type = "sine";
  oscillateur.frequency.setValueAtTime(f0, t0);
  oscillateur.frequency.exponentialRampToValueAtTime(Math.max(30, f1), t0 + gl);
  gain.gain.setValueAtTime(0.0001, t0);
  gain.gain.exponentialRampToValueAtTime(v, t0 + att);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + du);
  oscillateur.connect(gain).connect(entree);
  oscillateur.start(t0);
  oscillateur.stop(t0 + du + 0.03);
}

// Une « note-pip » : petit glissé descendant (×1,57 → ×1) qui se pose sur la note, puis s'éteint.
const note = (f, { t = 0, du = 0.1, v = NIVEAU_PIP } = {}) => coup(f * 1.57, f, { gl: 0.015, du, att: 0.003, v, t });
// Un bip glissé : la hauteur monte ou descend d'une valeur à l'autre.
const glisse = (f0, f1, { t = 0, gl = 0.1, du = 0.18, v = NIVEAU_PIP } = {}) => coup(f0, f1, { gl, du, att: 0.004, v, t });

const demiTons = (base, n) => base * Math.pow(2, n / 12);
const ALNUM = /[A-Za-zÀ-ÿ0-9]/;

function creneauLibre() {
  const maintenant = performance.now();
  if (maintenant - dernierSonMs < ECART_MIN_MS) return false;
  dernierSonMs = maintenant;
  return true;
}

// Les sons de jeu couvrent la voix un instant (jamais plus de 0,4 s) : deux sons qui se chevauchent
// à la fois donnent un résultat brouillon.
function couvrirVoix(dureeMs) {
  voixSilencieuseJusqua = performance.now() + Math.min(dureeMs, 400);
}

// ---------- Voix de la mascotte ----------

// Renvoie la fonction à appeler pour chaque caractère écrit d'UN texte : un « Pip » toutes les 2 lettres
// (espaces et ponctuation non comptés), jamais plus d'un par 70 ms. La hauteur dépend de la lettre,
// sur 7 demi-tons seulement (peu mélodique) ; la voyelle sonne un peu plus longtemps.
export function creerVoix() {
  let lettres = 0;
  return (caractere) => {
    if (!caractere || !ALNUM.test(caractere)) return;
    lettres += 1;
    if (lettres % 2 !== 0) return;
    if (performance.now() < voixSilencieuseJusqua) return;
    if (!pret() || !creneauLibre()) return;

    // Lettre sans accent (é → e) : la hauteur ne dépend pas de l'accent.
    const c = caractere.toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "");
    const voyelle = "aeiouy".includes(c);
    const f = demiTons(HAUTEUR_BASE_HZ, 2 + ((c.charCodeAt(0) - 97 + 100) % 7));
    const longueur = voyelle ? 1.1 : 0.75;
    coup(f * 2.2, f * 1.4, { gl: 0.015 * longueur, du: 0.04 * longueur, att: 0.003, v: NIVEAU_PIP });
  };
}

// La prononciation anglaise (synthèse vocale) démarre : la voix se tait un moment.
export function couperVoix(dureeMs = 2500) {
  voixSilencieuseJusqua = performance.now() + dureeMs;
}

// ---------- Frappe de l'enfant ----------

function jouerFrappe() {
  if (!pret() || !creneauLibre()) return;
  const f = HAUTEUR_FRAPPE_HZ;
  coup(f * 2.2, f * 1.4, { gl: 0.015 * 0.9, du: 0.04 * 0.9, att: 0.003, v: NIVEAU_PIP * NIVEAU_FRAPPE });
}

// Un petit son à chaque lettre ou chiffre ajouté dans `champ` (une note fixe, qui ne dépend ni de la
// lettre ni de la bonne réponse). L'effacement, les espaces et la ponctuation restent silencieux.
export function brancherFrappe(champ) {
  if (!champ) return;
  let precedente = champ.value.length;
  champ.addEventListener("focus", () => { precedente = champ.value.length; });
  champ.addEventListener("input", (evenement) => {
    const longueur = champ.value.length;
    const ajout = longueur > precedente;
    precedente = longueur;
    if (!ajout) return;
    const ajoute = typeof evenement.data === "string" && evenement.data ? evenement.data : champ.value.slice(-1);
    if (ALNUM.test(ajoute)) jouerFrappe();
  });
}

// ---------- Tap sur un bouton ----------

// Un petit « tic » à chaque tap sur un élément interactif de l'app (boutons, onglets, menu, tuiles de
// l'album, carte de recherche, fond d'un voile qu'on touche pour fermer). Plus haut et plus bref que la
// voix et la frappe, pour qu'on ne les confonde pas. Écouteur unique, en phase de capture : il joue
// avant que le tap ne change l'écran, et couvre un instant la voix qui pourrait démarrer juste après.
const ELEMENTS_INTERACTIFS = 'button, a[href], [role="button"], label, .tuile-collectible, .carte-recherche-mots';
// « Valider » d'une réponse n'a pas de tic : la bonne/mauvaise réponse qui suit joue son propre son.
// `[data-sans-tap]` : un élément (et tout ce qu'il contient) qui se déclare muet — le compteur d'étoiles,
// sa fenêtre d'aide (ouverture et fermeture) et les tuiles de mascottes de l'album (décision de l'utilisateur).
const ELEMENTS_SANS_TAP = '#form-reponse button[type="submit"], button:disabled, input, textarea, select, [data-sans-tap]';

function jouerTap() {
  if (!pret()) return;
  voixSilencieuseJusqua = Math.max(voixSilencieuseJusqua, performance.now() + 120);
  coup(1050, 700, { gl: 0.012, du: 0.035, att: 0.002, v: NIVEAU_PIP * 0.75 });
}

export function brancherTaps() {
  document.addEventListener("click", (evenement) => {
    if (!actif) return;
    const cible = evenement.target instanceof Element ? evenement.target : null;
    if (!cible || cible.closest(ELEMENTS_SANS_TAP)) return;
    if (cible.closest(ELEMENTS_INTERACTIFS) || cible.classList.contains("voile")) jouerTap();
  }, { capture: true, passive: true });
}

// ---------- Sons de jeu ----------

// Bonne réponse : un bip qui monte.
export function bonneReponse() {
  if (!pret()) return;
  couvrirVoix(170);
  glisse(520, 780, { gl: 0.09, du: 0.17 });
}

// Mauvaise réponse : un « boup » grave et plat (doux, pour ne pas décourager).
export function mauvaiseReponse() {
  if (!pret()) return;
  couvrirVoix(260);
  glisse(250, 215, { gl: 0.08, du: 0.26, v: 0.3 });
}

// Étoile gagnée : une montée glissée, puis un pip aigu.
export function etoile() {
  if (!pret()) return;
  couvrirVoix(470);
  glisse(600, 1500, { gl: 0.14, du: 0.2 });
  note(1046.5, { t: 0.17, du: 0.3 });
}

// Score parfait : deux notes, la seconde longue et doublée à l'octave inférieure.
export function scoreParfait() {
  if (!pret()) return;
  couvrirVoix(670);
  note(783.99, { du: 0.1 });
  note(1046.5, { t: 0.12, du: 0.55 });
  note(523.25, { t: 0.12, du: 0.55, v: 0.12 });
}

// Confirmation quand l'enfant (ou le parent) réactive les sons dans le menu.
export function apercu() {
  if (!pret()) return;
  note(783.99, { du: 0.1 });
}
