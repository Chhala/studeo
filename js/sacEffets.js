// sacEffets.js — Unique responsabilité : les effets visuels de « Mon Sac » (décision §5.55) : étoiles qui
// volent entre le compteur et une ligne, chiffre qui compte, rebonds, glissement des lignes. Aucune
// logique métier : la vue décide quand les jouer et met les données à jour elle-même.

import * as icons from "./icons.js";

const mouvementReduit = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// Centre d'un élément, relatif à la coquille de l'application (où se posent les étoiles qui volent).
function centre(element, coquille) {
  const r = element.getBoundingClientRect();
  const c = coquille.getBoundingClientRect();
  return { x: r.left + r.width / 2 - c.left, y: r.top + r.height / 2 - c.top };
}

// Jusqu'à 3 étoiles volent de `depart` à `arrivee` (un seul groupe quel que soit le nombre d'étoiles
// versées : 18 étoiles ne durent pas 18 fois plus longtemps). `fini` est appelée à l'arrivée de la dernière.
export function faireVoler(coquille, depart, arrivee, nbEtoiles, fini) {
  if (mouvementReduit() || !depart || !arrivee) { fini(); return; }
  const nb = Math.min(Math.max(nbEtoiles, 1), 3);
  const d = centre(depart, coquille);
  const a = centre(arrivee, coquille);
  let restantes = nb;
  for (let k = 0; k < nb; k++) {
    const etoile = document.createElement("div");
    etoile.className = "etoile-vol";
    etoile.innerHTML = icons.iconeEtoileLigne();
    coquille.appendChild(etoile);
    const x0 = d.x - 11, y0 = d.y - 11, x1 = a.x - 11, y1 = a.y - 11;
    const xm = (x0 + x1) / 2 + (k - 1) * 18;
    const ym = Math.min(y0, y1) - 46 - k * 6;
    const animation = etoile.animate([
      { transform: `translate(${x0}px, ${y0}px) scale(1)`, opacity: 1 },
      { transform: `translate(${xm}px, ${ym}px) scale(1.35)`, opacity: 1, offset: 0.45 },
      { transform: `translate(${x1}px, ${y1}px) scale(.7)`, opacity: 0.95 }
    ], { duration: 720, delay: k * 110, easing: "ease-in-out", fill: "forwards" });
    animation.onfinish = () => {
      etoile.remove();
      restantes -= 1;
      if (restantes === 0) fini();
    };
  }
}

// Le chiffre du compteur passe de `depart` à `fin` en `duree` ms (d'un coup si le mouvement est réduit).
export function compterJusqua(chiffre, depart, fin, duree = 600) {
  if (!chiffre) return;
  if (mouvementReduit()) { chiffre.textContent = fin; return; }
  const t0 = performance.now();
  const pas = (t) => {
    if (!chiffre.isConnected) return;
    const p = Math.min(1, (t - t0) / duree);
    chiffre.textContent = Math.round(depart + (fin - depart) * p);
    if (p < 1) requestAnimationFrame(pas);
  };
  requestAnimationFrame(pas);
}

// Rejoue une animation CSS portée par une classe (la classe est retirée à la fin).
export function declencher(element, classe, dureeMs) {
  if (!element) return;
  element.classList.remove(classe);
  void element.offsetWidth;
  element.classList.add(classe);
  setTimeout(() => element.classList.remove(classe), dureeMs);
}

// L'étoile d'une ligne grossit un instant quand les étoiles arrivent.
export function pulserEtoileLigne(ligne) {
  const etoile = ligne.querySelector(".obj-compte svg");
  if (etoile && !mouvementReduit()) {
    etoile.animate([{ transform: "scale(1)" }, { transform: "scale(1.45) rotate(15deg)" }, { transform: "scale(1)" }], { duration: 450, easing: "ease-out" });
  }
}

// La pastille « +N » qui monte au-dessus du compteur quand des étoiles reviennent au solde.
export function afficherPlusN(compteur, n) {
  if (mouvementReduit()) return;
  const plus = document.createElement("span");
  plus.className = "plus-un";
  plus.textContent = `+${n}`;
  compteur.appendChild(plus);
  setTimeout(() => plus.remove(), 1400);
}

// Une ligne se referme (hauteur → 0, légère sortie sur le côté) ; `fini` est appelée ensuite.
export function refermerLigne(ligne, { versLaDroite = false } = {}, fini) {
  if (mouvementReduit()) { fini(); return; }
  const animation = ligne.animate([
    { height: `${ligne.offsetHeight}px`, opacity: 1, marginBottom: "0px", transform: "translateX(0)" },
    { height: "0px", opacity: 0, marginBottom: "-10px", transform: versLaDroite ? "translateX(40px)" : "translateX(0)" }
  ], { duration: 400, easing: "ease-in", fill: "forwards" });
  animation.onfinish = fini;
}

// Réordonnancement fluide : mémorise la position de chaque ligne avant un nouveau dessin, puis fait glisser
// chaque ligne de son ancienne place à la nouvelle (une ligne toute neuve apparaît en grossissant).
export function memoriserPositions(conteneur) {
  const positions = new Map();
  conteneur.querySelectorAll(".ligne-mot-wrapper").forEach((ligne) => positions.set(ligne.dataset.id, ligne.getBoundingClientRect().top));
  return positions;
}

export function animerReordonnancement(conteneur, positions) {
  if (mouvementReduit()) return;
  conteneur.querySelectorAll(".ligne-mot-wrapper").forEach((ligne) => {
    const avant = positions.get(ligne.dataset.id);
    if (avant !== undefined) {
      const ecart = avant - ligne.getBoundingClientRect().top;
      if (Math.abs(ecart) > 1) {
        ligne.animate([{ transform: `translateY(${ecart}px)` }, { transform: "translateY(0)" }], { duration: 450, easing: "cubic-bezier(.3,.8,.3,1)" });
      }
    } else if (positions.size > 0) {
      ligne.animate([{ transform: "scale(.85)", opacity: 0 }, { transform: "scale(1)", opacity: 1 }], { duration: 380, easing: "ease-out" });
    }
  });
}
