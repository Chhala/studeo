// badgeEngine.js — Unique responsabilité : décider quand un badge est obtenu, et exposer le
// catalogue avec l'état de chaque badge (décision §5.53). Ne touche à aucun élément du DOM.
//
// Trois états : « avenir » (condition pas remplie), « pret » (obtenu, étoiles pas encore reçues :
// l'enfant doit l'épingler) et « obtenu » (épinglé). Un badge obtenu n'est jamais retiré.
//
// Deux familles de conditions :
//  - fondées sur l'ÉTAT (mots maîtrisés, bonnes réponses, déblocages, compteurs) : réévaluées par
//    evaluerEtat(), appelée à chaque affichage qui en dépend — gratuite et idempotente ;
//  - fondées sur UNE SESSION menée à son terme (Révision sans erreur, Défi de 20 mots parfait, jour
//    d'étude, Défi réussi, questionnaire réussi) : apresSession(), appelée par quizEngine.

import { BADGES_ACTIFS, BADGES_CONFIG, cheminImageBadge } from "./badges.config.js";
import { CHARACTERS_CONFIG } from "./characters.config.js";
import { BACKGROUNDS_CONFIG, BACKGROUND_NONE_ID } from "./backgrounds.config.js";
import * as dataStore from "./dataStore.js";

// Un jour compte pour la série d'étude dès qu'une Révision OU un Défi est terminé avec au moins
// 25 % de bonnes réponses. Seuil jamais mentionné à l'enfant : il sert seulement à empêcher de
// traverser une session au hasard (décision §5.53).
const SEUIL_JOUR_D_ETUDE = 0.25;
const NB_MOTS_MIN_REVISION_SANS_ERREUR = 10;
const LONGUEUR_DEFI_PARFAIT = 20;

const MOTS_MAITRISES_PENGUIN = 25;
const MOTS_MAITRISES_PIGGY = 75;
const BONNES_REPONSES_CATTY = 500;
const JOURS_DEFI_CHICKEN = 15;
const QUESTIONNAIRES_BONES = 15;
const SERIE_BUNNY = 7;
const SERIE_DEER_DEER = 24;

function nbMotsMaitrises() {
  return dataStore.getMots().filter((m) => m.statut === "maitrise").length;
}

function tousLesPersonnagesDebloques() {
  return CHARACTERS_CONFIG.every((p) => dataStore.estDebloque("character", p.id));
}

function tousLesFondsDebloques() {
  return BACKGROUNDS_CONFIG.filter((f) => f.id !== BACKGROUND_NONE_ID).every((f) => dataStore.estDebloque("background", f.id));
}

// Conditions fondées sur l'état courant. Les badges de session (ducky, beary) n'y figurent pas.
const CONDITIONS_ETAT = {
  penguin: () => nbMotsMaitrises() >= MOTS_MAITRISES_PENGUIN,
  piggy: () => nbMotsMaitrises() >= MOTS_MAITRISES_PIGGY,
  catty: () => dataStore.getTotalBonnesReponses() >= BONNES_REPONSES_CATTY,
  chicken: () => dataStore.getNbJoursDefiReussis() >= JOURS_DEFI_CHICKEN,
  bones: () => dataStore.getNbQuestionnairesReussis() >= QUESTIONNAIRES_BONES,
  bunny: () => dataStore.getSerieJoursEtudeBrute() >= SERIE_BUNNY,
  "deer-deer": () => dataStore.getSerieJoursEtudeBrute() >= SERIE_DEER_DEER,
  zombie: () => tousLesPersonnagesDebloques(),
  slime: () => tousLesFondsDebloques()
};

function definition(id) {
  return BADGES_CONFIG.find((b) => b.id === id);
}

// Marque un badge obtenu ; s'il est offert (gain 0), il est aussi épinglé d'office.
function obtenir(id) {
  const nouveau = dataStore.marquerBadgeObtenu(id);
  const badge = definition(id);
  if (nouveau && badge && badge.gain === 0) dataStore.epinglerBadge(id, 0);
  return nouveau;
}

// La fonction est-elle allumée ? (interrupteur BADGES_ACTIFS de badges.config.js). Éteinte, ce module
// ne fait plus rien : les vues masquent l'onglet et la pastille, aucun compteur n'est alimenté.
export function badgesActifs() {
  return BADGES_ACTIFS;
}

export function evaluerEtat() {
  if (!BADGES_ACTIFS) return;
  for (const [id, condition] of Object.entries(CONDITIONS_ETAT)) {
    if (!dataStore.badgeEstObtenu(id) && condition()) obtenir(id);
  }
}

// Appelée par quizEngine.finaliserSession, UNIQUEMENT pour une session menée à son terme (une
// session abandonnée ne laisse aucune trace, §5.24). `resume` :
//   type ("revision" | "defi"), longueur (Défi), reponses [{ correct }],
//   premierPassage (Révision : premier passage terminé du jour pour ce lot),
//   lotValide (Révision : tous les mots du lot sont validés aujourd'hui), dateAjout,
//   defiReussi (Défi : seuil de l'étoile atteint).
export function apresSession(resume) {
  if (!BADGES_ACTIFS) return;
  const total = resume.reponses.length;
  const bonnes = resume.reponses.filter((r) => r.correct).length;
  const toutesJustes = total > 0 && bonnes === total;

  if (total > 0 && bonnes / total >= SEUIL_JOUR_D_ETUDE) dataStore.noterJourEtude();

  if (resume.type === "revision") {
    // « Sans rattrapage » : premier passage du jour, TOUTES les questions justes (anciens mots
    // réinjectés compris — sinon l'enfant ne comprendrait pas pourquoi elle a le badge malgré une
    // erreur). Le minimum de mots est garanti par les compléments des petits lots.
    if (resume.premierPassage && toutesJustes && total >= NB_MOTS_MIN_REVISION_SANS_ERREUR) obtenir("ducky");
    if (resume.lotValide) dataStore.noterQuestionnaireReussi(resume.dateAjout);
  } else {
    if (resume.longueur === LONGUEUR_DEFI_PARFAIT && toutesJustes) obtenir("beary");
    if (resume.defiReussi) dataStore.noterDefiReussi();
  }

  evaluerEtat();
}

// ---------- Lecture pour l'interface ----------

function etatDuBadge(id, etat) {
  if (etat.epingles.includes(id)) return "obtenu";
  if (etat.obtenus.includes(id)) return "pret";
  return "avenir";
}

export function getCatalogue() {
  evaluerEtat();
  const etat = dataStore.getBadgesEtat();
  return BADGES_CONFIG.map((b) => ({ ...b, image: cheminImageBadge(b.id), etat: etatDuBadge(b.id, etat) }));
}

// Vrai tant qu'un badge attend d'être épinglé : affiche la pastille sur « Mon Album ».
export function aBadgeEnAttente() {
  if (!BADGES_ACTIFS) return false;
  evaluerEtat();
  const etat = dataStore.getBadgesEtat();
  return BADGES_CONFIG.some((b) => etatDuBadge(b.id, etat) === "pret");
}

// Épingle un badge prêt : les étoiles vont au solde. Renvoie { ok, gain, ancienTotal, nouveauTotal }.
export function epingler(id) {
  const badge = definition(id);
  const ancienTotal = dataStore.getTotalEtoiles();
  if (!BADGES_ACTIFS || !badge || !dataStore.epinglerBadge(id, badge.gain)) return { ok: false, gain: 0, ancienTotal, nouveauTotal: ancienTotal };
  return { ok: true, gain: badge.gain, ancienTotal, nouveauTotal: dataStore.getTotalEtoiles() };
}

// Avancement montré dans la fenêtre d'un badge pas encore obtenu (jamais sur la tuile) :
// { texte, ratio } ou null si ce badge n'en montre pas.
export function getProgres(id) {
  const badge = definition(id);
  if (!badge || !badge.progres) return null;
  const { type, cible } = badge.progres;

  if (type === "serie") {
    const n = Math.min(dataStore.getSerieJoursEtude(), cible);
    return { texte: n > 0 ? `Jour ${n} sur ${cible}` : "Pas encore commencé", ratio: n / cible };
  }
  if (type === "bonnesReponses") {
    const n = Math.min(dataStore.getTotalBonnesReponses(), cible);
    return { texte: `${n} sur ${cible} bonnes réponses`, ratio: n / cible };
  }
  if (type === "joursDefi") {
    const n = Math.min(dataStore.getNbJoursDefiReussis(), cible);
    return { texte: `${n} jour${n > 1 ? "s" : ""} sur ${cible}`, ratio: n / cible };
  }
  return null;
}
