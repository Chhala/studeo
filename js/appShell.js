// appShell.js — Unique responsabilité : donner aux vues un accès contrôlé à la coquille DOM
// (zone de contenu, zone de fond) et un moyen commun d'afficher voiles et messages toast.
// Aucune logique métier ici.

import * as sons from "./sons.js";

let refs = { shell: null, view: null, fond: null };

export function init({ shell, view, fond }) {
  refs = { shell, view, fond };
}

export function getView() {
  return refs.view;
}

export function getFond() {
  return refs.fond;
}

// Affiche un voile (bottom sheet ou modale centrée) par-dessus l'écran courant.
// contenuHTML est le HTML de la feuille/boîte elle-même (pas du voile qui l'entoure).
export function montrerVoile(contenuHTML, { position = "bas" } = {}) {
  const voile = document.createElement("div");
  const classesValides = ["centre", "bas", "plein"];
  voile.className = `voile ${classesValides.includes(position) ? position : "bas"}`;
  voile.innerHTML = contenuHTML;

  voile.addEventListener("click", (evenement) => {
    if (evenement.target === voile) fermerVoile(voile);
  });

  refs.shell.appendChild(voile);
  return voile;
}

export function fermerVoile(voile) {
  if (voile && voile.parentNode) voile.parentNode.removeChild(voile);
}

let minuteurToast = null;

export function afficherToast(message) {
  let toast = refs.shell.querySelector("#toast");
  if (!toast) {
    toast = document.createElement("div");
    toast.id = "toast";
    toast.style.cssText = [
      "position:absolute", "left:50%", "bottom:140px", "transform:translateX(-50%)",
      "background:var(--text-dark)", "color:#FFFFFF", "font-family:'Nunito',sans-serif",
      "font-weight:700", "font-size:13.5px", "padding:12px 20px", "border-radius:999px",
      "box-shadow:0 6px 18px rgba(0,0,0,0.25)", "z-index:20", "max-width:80%",
      "text-align:center", "transition:opacity 0.25s ease"
    ].join(";");
    refs.shell.appendChild(toast);
  }
  toast.textContent = message;
  toast.style.opacity = "1";

  clearTimeout(minuteurToast);
  minuteurToast = setTimeout(() => {
    toast.style.opacity = "0";
  }, 2200);
}

const DELAI_AVANT_GAIN_MS = 300;   // laisse l'écran d'accueil s'afficher avant l'effet
const ECART_ENTRE_ETOILES_MS = 1500; // plusieurs étoiles : le saut se répète à chaque étoile
const DUREE_PLUS_UN_MS = 1400;       // doit rester < écart (jamais 2 "+1" en même temps) et = animation CSS

let minuteursGain = [];

// Joue l'effet "étoile gagnée" sur le compteur `chip` (accueil) : une série de sauts, un par
// étoile gagnée, le chiffre passant de `valeurDepart` à `valeurFinale` (qui est toujours la
// valeur réelle affichée à la fin, même si quelque chose a changé entre-temps). Une seule
// série à la fois : rappeler la fonction annule celle en cours, un gain ne peut donc jamais
// être affiché deux fois.
export function animerGainEtoiles(chip, valeurDepart, valeurFinale, nbEtoiles) {
  minuteursGain.forEach(clearTimeout);
  minuteursGain = [];
  if (!chip || nbEtoiles <= 0) return;

  const chiffre = chip.querySelector(".chiffre-chip");
  chiffre.textContent = valeurDepart;

  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    chiffre.textContent = valeurFinale;
    sons.etoile();   // le son n'est pas un mouvement : un seul, quel que soit le nombre d'étoiles
    return;
  }

  for (let i = 0; i < nbEtoiles; i++) {
    const estLaDerniere = i === nbEtoiles - 1;
    const valeur = estLaDerniere ? valeurFinale : valeurDepart + i + 1;

    minuteursGain.push(setTimeout(() => {
      chip.classList.remove("gain");
      void chip.offsetWidth; // relance l'animation CSS
      chip.classList.add("gain");
      sons.etoile();

      const plus = document.createElement("span");
      plus.className = "plus-un";
      plus.textContent = "+1";
      chip.appendChild(plus);
      minuteursGain.push(setTimeout(() => plus.remove(), DUREE_PLUS_UN_MS));

      // le chiffre change au sommet du saut
      minuteursGain.push(setTimeout(() => { chiffre.textContent = valeur; }, 250));
    }, DELAI_AVANT_GAIN_MS + i * ECART_ENTRE_ETOILES_MS));
  }
}

// Écrit un texte caractère par caractère dans un élément (effet "Animal Crossing"), en
// quelques secondes à peine quelle que soit sa longueur : la vitesse par caractère s'accélère
// automatiquement pour les textes longs plutôt que de laisser la durée totale grandir sans
// limite. Annule proprement toute écriture en cours sur ce même élément si rappelée avant la
// fin (ex. la question change pendant que la précédente s'affichait encore).
// Renvoie la durée totale d'écriture en millisecondes (0 si l'élément n'existe pas), pour que
// l'appelant puisse planifier la suite (ex. laisser le texte affiché N secondes une fois écrit).
export function ecrireTexte(element, texte, { dureeCibleMs = 1800, cible = "texte" } = {}) {
  if (!element) return 0;
  clearInterval(element._minuteurEcriture);

  // Typographie française : espace insécable avant ? ! : ; et à l'intérieur des guillemets, pour
  // qu'un signe de ponctuation ne se retrouve jamais seul au début de la ligne suivante.
  texte = texte.replace(/ ([?!:;»])/g, " $1").replace(/(«) /g, "$1 ");

  const ecrire = cible === "placeholder"
    ? (valeur) => { element.placeholder = valeur; }
    : (valeur) => { element.textContent = valeur; };

  const delai = Math.min(35, Math.max(12, dureeCibleMs / Math.max(texte.length, 1)));
  ecrire("");
  let index = 0;
  const voix = sons.creerVoix();   // un petit son toutes les 2 lettres (décision §5.48)

  element._minuteurEcriture = setInterval(() => {
    index += 1;
    ecrire(texte.slice(0, index));
    voix(texte[index - 1]);
    if (index >= texte.length) clearInterval(element._minuteurEcriture);
  }, delai);
  return delai * texte.length;
}

// Interrompt une écriture en cours sur cet élément (le texte déjà écrit reste tel quel).
export function arreterEcriture(element) {
  if (element) clearInterval(element._minuteurEcriture);
}

