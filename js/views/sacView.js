// sacView.js — Unique responsabilité : afficher et faire vivre l'écran « Mon Sac » (le cartable), décision
// §5.55 : la mascotte, le cartable, les objectifs triés par progression, le glissement d'une ligne pour
// remplir / retirer / valider, et la mascotte qui parle à chaque événement. Les données sont dans
// dataStore, les règles dans cartableEngine, les fenêtres dans sacOverlays, les effets dans sacEffets.

import * as appShell from "../appShell.js";
import * as dataStore from "../dataStore.js";
import * as characterEngine from "../characterEngine.js";
import * as sons from "../sons.js";
import * as icons from "../icons.js";
import * as navigation from "../navigation.js";
import * as cartableEngine from "../cartableEngine.js";
import * as sacOverlays from "../sacOverlays.js";
import * as effets from "../sacEffets.js";
import { PHRASES_SAC, phraseSacHabituelle, phraseSacLigne } from "../mascotteTexte.js";

let refs = {};                 // éléments de l'écran affiché (vide hors de cet écran)
let minuteurRetour = null;     // retour à la phrase habituelle après une phrase d'événement

const DUREE_PHRASE_EVENEMENT_MS = 3000;   // une phrase d'événement reste affichée 3 s une fois écrite
const DUREE_PHRASE_IMPORTANTE_MS = 4500;  // …un peu plus pour « à valider » et « validé »

const vivant = () => Boolean(refs.liste && refs.liste.isConnected);

// ---------- La mascotte parle ----------
// Elle PARLE (écriture lettre à lettre + voix) chaque fois que sa phrase change, y compris au retour de la
// phrase habituelle ; mais elle ne réécrit jamais une phrase déjà affichée (décision §5.55).
const normaliser = (texte) => texte.replace(/ /g, " ");

function parler(texte) {
  clearTimeout(minuteurRetour);
  if (!vivant() || !refs.bulle) return 0;
  if (normaliser(refs.bulle.textContent) === normaliser(texte)) return 0;
  return appShell.ecrireTexte(refs.bulle, texte);
}

const phraseHabituelle = () => phraseSacHabituelle(dataStore.getObjectifs().length);
const revenir = () => { parler(phraseHabituelle()); };

// Phrase d'événement : parlée, puis la phrase habituelle revient (parlée elle aussi).
function dire(texte, { retourMs = DUREE_PHRASE_EVENEMENT_MS } = {}) {
  const duree = parler(texte);
  minuteurRetour = setTimeout(revenir, duree + retourMs);
}

const contexte = () => ({ sousElement: refs.carteMascotte, parler, revenir });

function mascotteBlessee() {
  characterEngine.jouerAnimation("hurt");
  setTimeout(() => characterEngine.jouerAnimation("idle"), 900);
}

// ---------- Rendu ----------
export function render() {
  arreter();
  const solde = dataStore.getTotalEtoiles();

  appShell.getView().innerHTML = `
    <div class="entete entete-sac">
      <div class="entete-titre font-display">Mon Sac</div>
      <div class="entete-droite">
        <button type="button" class="bouton-icone plus-rouge" data-role="ajouter" aria-label="Ajouter un objectif">${icons.iconePlus()}</button>
        <div class="chip-etoiles" id="chip-etoiles" data-sans-tap><span class="etoile-chip">${icons.iconeEtoile()}</span><span class="chiffre-chip" id="chiffre-etoiles">${solde}</span></div>
      </div>
    </div>

    <div class="zone-mascotte">
      <div class="carte carte-mascotte" id="carte-sac">
        <div class="avatar-mascotte" id="avatar-sac">
          <img alt="" aria-hidden="true">
          <div class="repli">${icons.iconePatte()}</div>
        </div>
        <div class="bulle-mascotte" id="bulle-sac"></div>
      </div>
    </div>

    <div class="zone-cartable">
      <div class="carte-cartable" id="carte-cartable"><img src="./assets/sac-a-etoiles.png" alt="" onerror="this.style.display='none'"></div>
      <div class="liste-objectifs" id="liste-objectifs"></div>
    </div>

    ${navigation.html("sac")}
  `;

  const vue = appShell.getView();
  refs = {
    liste: vue.querySelector("#liste-objectifs"),
    bulle: vue.querySelector("#bulle-sac"),
    carteMascotte: vue.querySelector("#carte-sac"),
    sac: vue.querySelector("#carte-cartable"),
    compteur: vue.querySelector("#chip-etoiles"),
    chiffre: vue.querySelector("#chiffre-etoiles")
  };

  characterEngine.lierElementCompagnon(vue.querySelector("#avatar-sac img"), vue.querySelector("#avatar-sac .repli"));
  navigation.brancher(vue);
  vue.querySelector('[data-role="ajouter"]').addEventListener("click", ajouterObjectif);

  rendreListe({ animer: false });
  parler(phraseHabituelle());   // à l'arrivée sur l'écran : écrite avec la voix
}

// À appeler quand on quitte l'écran : aucun minuteur ne doit parler une fois la page changée.
export function arreter() {
  clearTimeout(minuteurRetour);
  minuteurRetour = null;
  refs = {};
}

function ligneHTML(objectif) {
  const plein = cartableEngine.estPlein(objectif);
  const action = plein
    ? `<button type="button" class="valider" data-action="valider" data-sans-tap aria-label="Valider l'objectif">${icons.iconeValider()}</button>`
    : `<button type="button" class="verser" data-action="remplir" data-sans-tap aria-label="Remplir d'étoiles">${icons.iconeRemplir()}</button>`;
  return `
    <div class="ligne-mot-wrapper objectif${plein ? " pret" : ""}" data-id="${objectif.id}">
      <div class="ligne-mot-actions">
        ${action}
        <button type="button" class="vider" data-action="retirer" data-sans-tap aria-label="Retirer du cartable">${icons.iconeRetirer()}</button>
      </div>
      <div class="ligne-mot">
        <div class="obj-texte">
          <div class="obj-libelle"></div>
          <div class="obj-barre"><i style="width:${cartableEngine.pourcentage(objectif)}%"></i></div>
        </div>
        <div class="obj-compte">${icons.iconeEtoileLigne()}</div>
      </div>
    </div>`;
}

// Redessine les lignes (triées par progression) ; les lignes glissent vers leur nouvelle place.
function rendreListe({ animer = true } = {}) {
  if (!vivant()) return;
  const positions = animer ? effets.memoriserPositions(refs.liste) : new Map();
  const objectifs = cartableEngine.ordonner(dataStore.getObjectifs());
  refs.liste.innerHTML = objectifs.map(ligneHTML).join("");
  objectifs.forEach((objectif) => {
    refs.liste.querySelector(`[data-id="${objectif.id}"] .obj-libelle`).textContent = objectif.libelle;   // jamais d'interpolation HTML
  });
  refs.liste.querySelectorAll(".ligne-mot-wrapper").forEach((ligne) => brancherLigne(ligne, objectifs));
  refs.chiffre.textContent = dataStore.getTotalEtoiles();
  if (animer) effets.animerReordonnancement(refs.liste, positions);
}

// ---------- Geste : glisser ou toucher une ligne ----------
// Pointer events : le doigt comme la souris. `touch-action: pan-y` (CSS) laisse défiler la page à la verticale.
const LARGEUR_ACTIONS = 96;

function fermerLignes(sauf = null) {
  refs.liste.querySelectorAll(".ligne-mot-wrapper.ouverte").forEach((l) => { if (l !== sauf) l.classList.remove("ouverte"); });
}

function brancherLigne(ligne, objectifs) {
  const objectif = objectifs.find((o) => String(o.id) === ligne.dataset.id);
  const surface = ligne.querySelector(".ligne-mot");
  let x0 = null;
  let glisse = false;
  let base = 0;

  surface.addEventListener("pointerdown", (evenement) => {
    x0 = evenement.clientX;
    glisse = false;
    base = ligne.classList.contains("ouverte") ? -LARGEUR_ACTIONS : 0;
    surface.setPointerCapture(evenement.pointerId);
  });
  surface.addEventListener("pointermove", (evenement) => {
    if (x0 === null) return;
    const dx = evenement.clientX - x0;
    if (Math.abs(dx) > 6 && !glisse) { glisse = true; surface.style.transition = "none"; fermerLignes(ligne); }
    if (glisse) surface.style.transform = `translateX(${Math.max(-LARGEUR_ACTIONS, Math.min(0, base + dx))}px)`;
  });
  surface.addEventListener("pointerup", (evenement) => {
    if (x0 === null) return;
    const dx = evenement.clientX - x0;
    x0 = null;
    surface.style.transition = "";
    surface.style.transform = "";
    if (glisse) { ligne.classList.toggle("ouverte", base + dx < -LARGEUR_ACTIONS / 2); return; }
    if (ligne.classList.contains("ouverte")) { ligne.classList.remove("ouverte"); return; }
    fermerLignes();
    dire(phraseSacLigne(objectif));   // un toucher : l'avancement, ou quoi faire
  });
  surface.addEventListener("pointercancel", () => { x0 = null; surface.style.transition = ""; surface.style.transform = ""; });

  ligne.querySelectorAll("[data-action]").forEach((bouton) => bouton.addEventListener("click", () => {
    ligne.classList.remove("ouverte");
    const action = bouton.dataset.action;
    if (action === "remplir") remplir(objectif, ligne);
    else if (action === "retirer") retirer(objectif, ligne);
    else if (action === "valider") valider(objectif, ligne);
  }));
}

// ---------- Remplir d'étoiles ----------
function remplir(objectif, ligne) {
  if (dataStore.getTotalEtoiles() <= 0) {
    dire(PHRASES_SAC.soldeNul);
    mascotteBlessee();
    return;
  }
  sacOverlays.ouvrirRemplir({
    objectif,
    solde: dataStore.getTotalEtoiles(),
    contexte: contexte(),
    onConfirmer: (n) => animerRemplissage(objectif.id, n, ligne)
  });
}

function animerRemplissage(id, n, ligne) {
  const soldeAvant = dataStore.getTotalEtoiles();
  const verse = dataStore.verserDansObjectif(id, n);   // données d'abord : atomique, sûr même si on quitte l'écran
  if (verse === 0) { revenir(); return; }
  const objectif = dataStore.getObjectifs().find((o) => o.id === id);
  const plein = cartableEngine.estPlein(objectif);

  sons.remplir(verse);
  effets.compterJusqua(refs.chiffre, soldeAvant, dataStore.getTotalEtoiles(), 700);
  effets.declencher(refs.compteur, "debit", 600);
  effets.faireVoler(appShell.getShell(), refs.compteur.querySelector(".etoile-chip"), ligne.querySelector(".obj-compte svg"), verse, () => {
    if (!vivant()) return;
    ligne.querySelector(".obj-barre > i").style.width = `${cartableEngine.pourcentage(objectif)}%`;
    effets.pulserEtoileLigne(ligne);
    effets.declencher(refs.sac, "rebond", 600);
    setTimeout(() => {
      if (!vivant()) return;
      rendreListe();
      if (plein) {
        sons.etoile();
        dire(PHRASES_SAC.objectifPlein, { retourMs: DUREE_PHRASE_IMPORTANTE_MS });
      } else {
        revenir();
      }
    }, plein ? 700 : 500);
  });
}

// ---------- Retirer du cartable ----------
function retirer(objectif, ligne) {
  sacOverlays.ouvrirRetirer({
    objectif,
    contexte: contexte(),
    onConfirmer: () => {
      const resultat = dataStore.retirerObjectif(objectif.id);
      if (!resultat) { revenir(); return; }
      const rembourse = resultat.rembourse;
      const soldeApres = dataStore.getTotalEtoiles();

      sons.retirer();
      effets.declencher(refs.sac, "secousse", 500);

      const terminer = () => {
        if (!vivant()) return;
        effets.refermerLigne(ligne, {}, () => {
          if (!vivant()) return;
          rendreListe();
          dire(rembourse > 0 ? PHRASES_SAC.vide : PHRASES_SAC.retire);
        });
      };
      if (rembourse > 0) {
        effets.faireVoler(appShell.getShell(), ligne.querySelector(".obj-compte svg"), refs.compteur.querySelector(".etoile-chip"), rembourse, () => {
          if (!vivant()) return;
          effets.compterJusqua(refs.chiffre, soldeApres - rembourse, soldeApres, 600);
          effets.declencher(refs.compteur, "gain", 800);
          effets.afficherPlusN(refs.compteur, rembourse);
        });
        setTimeout(terminer, 1000);
      } else {
        terminer();
      }
    }
  });
}

// ---------- Valider (code parent) ----------
function valider(objectif, ligne) {
  sacOverlays.ouvrirCode({
    message: "Un parent doit valider l'accomplissement de cet objectif.",
    contexte: contexte(),
    onOk: () => {
      if (!dataStore.validerObjectif(objectif.id)) { revenir(); return; }
      sons.scoreParfait();
      characterEngine.jouerAnimation("jump");   // la mascotte saute (victoire) puis revient à l'attente
      dire(PHRASES_SAC.valide, { retourMs: DUREE_PHRASE_IMPORTANTE_MS });
      ligne.animate([{ transform: "scale(1)" }, { transform: "scale(1.04)" }, { transform: "scale(1)" }], { duration: 450 });
      setTimeout(() => {
        if (!vivant()) return;
        effets.refermerLigne(ligne, { versLaDroite: true }, () => rendreListe());
      }, 900);
    }
  });
}

// ---------- Créer un objectif ----------
function ajouterObjectif() {
  // Déjà 4 objectifs : on ne demande même pas le code, la mascotte le dit.
  if (dataStore.getObjectifs().length >= dataStore.CARTABLE_MAX_OBJECTIFS) {
    dire(PHRASES_SAC.limite);
    return;
  }
  sacOverlays.ouvrirCode({
    message: "Pour créer un objectif dans le cartable.",
    contexte: contexte(),
    onOk: () => sacOverlays.ouvrirFormulaire({
      dernierRetire: dataStore.getDernierObjectifRetire(),
      contexte: contexte(),
      onAjouter: (libelle, cout) => {
        if (!dataStore.ajouterObjectif(libelle, cout)) { revenir(); return; }
        rendreListe();
        sons.bonneReponse();
        dire(PHRASES_SAC.ajoute);
      }
    })
  });
}
