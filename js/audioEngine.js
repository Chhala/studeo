// audioEngine.js — Unique responsabilité : prononcer un mot anglais via window.speechSynthesis.
// Encapsule les différences iOS/Android : chargement des voix, déblocage au premier geste.

const disponible = "speechSynthesis" in window;

let voix = [];
let voixChargees = false;
let debloque = false;

function chargerVoix() {
  return new Promise((resolve) => {
    if (!disponible) return resolve([]);

    const dejaLa = speechSynthesis.getVoices();
    if (dejaLa.length > 0) return resolve(dejaLa);

    // Android charge les voix de façon asynchrone : on attend l'événement, avec un
    // filet de sécurité si jamais il ne se déclenche pas sur un navigateur atypique.
    let resolu = false;
    const finir = (v) => {
      if (resolu) return;
      resolu = true;
      resolve(v);
    };

    speechSynthesis.onvoiceschanged = () => finir(speechSynthesis.getVoices());
    setTimeout(() => finir(speechSynthesis.getVoices()), 1000);
  });
}

export async function init() {
  if (!disponible) return;
  voix = await chargerVoix();
  voixChargees = true;
}

// À appeler depuis le tout premier geste de l'enfant (tap sur l'écran d'accueil, par
// exemple) : Safari iOS bloque toute synthèse vocale tant qu'elle n'a pas été déclenchée
// par une interaction utilisateur directe. Un texte réellement synthétisé (pas une chaîne
// vide) est nécessaire ici : c'est ce qui fait vraiment démarrer le moteur vocal (surtout
// sur Chrome/Windows) — sans ça, c'est la première vraie prononciation qui hérite de ce
// démarrage à froid et se retrouve tronquée au début.
export function debloquerAudio() {
  if (!disponible || debloque) return;
  const silence = new SpeechSynthesisUtterance("hello");
  silence.volume = 0;
  speechSynthesis.speak(silence);
  debloque = true;
}

// Les voix locales sont préférées aux voix "en ligne" (ex. voix Natural d'Edge) : ces
// dernières diffusent l'audio depuis un serveur, démarrent avec latence (début du mot
// souvent coupé) et ne fonctionneraient de toute façon pas hors-ligne.
function choisirVoix() {
  if (!voixChargees || voix.length === 0) return null;
  const anglaises = voix.filter((v) => v.lang && v.lang.startsWith("en"));
  const locales = anglaises.filter((v) => v.localService);
  const candidates = locales.length > 0 ? locales : anglaises;
  return (
    candidates.find((v) => v.lang === "en-US") ||
    candidates.find((v) => v.lang === "en-GB") ||
    candidates[0] ||
    null
  );
}

// Prononce un mot anglais. Si le mot contient plusieurs formes acceptées ("hello / hi"),
// seule la première est prononcée pour rester naturel à l'oreille.
export function prononcer(motAnglais) {
  if (!disponible) return;
  const texte = motAnglais.split(" / ")[0].trim();

  const utterance = new SpeechSynthesisUtterance(texte);
  const voixChoisie = choisirVoix();
  if (voixChoisie) utterance.voice = voixChoisie;
  utterance.lang = voixChoisie ? voixChoisie.lang : "en-US";
  utterance.rate = 0.95;

  // Bug connu de Chrome/Chromium : juste après un cancel(), le moteur vocal tronque le
  // tout début du prochain énoncé. On n'appelle donc cancel() que s'il y a vraiment
  // quelque chose à interrompre (enfant qui retape vite), et dans ce cas seulement on
  // laisse un court délai au moteur pour redémarrer avant de parler.
  if (speechSynthesis.speaking || speechSynthesis.pending) {
    speechSynthesis.cancel();
    setTimeout(() => speechSynthesis.speak(utterance), 150);
  } else {
    speechSynthesis.speak(utterance);
  }
}

export function estDisponible() {
  return disponible;
}
