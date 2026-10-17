// dataStore.js — Unique responsabilité : lire/écrire l'état applicatif dans localStorage.
// Aucun autre module ne touche directement à localStorage : tout passe par ici.

import { WORDS_SEED } from "./words.seed.js";
import { CHARACTER_DEFAULT_ID } from "./characters.config.js";
import { BACKGROUND_NONE_ID } from "./backgrounds.config.js";

const STORAGE_KEY = "studeo.etat.v1";

// Étoiles de départ : 1 personnage (tanuki) + le fond "aucun" sont gratuits d'office, mais
// aucun autre item ne l'est — ces 5 ⭐ laissent un vrai premier choix (un fond à 3 ⭐ tout de
// suite, ou économiser pour un 2ᵉ personnage à 7 ⭐).
const ETOILES_DE_DEPART = 5;

// Migration unique (décision §5.23) : les fonds 12 à 15 ont été renumérotés pour que l'ordre
// d'affichage suive la numérotation des fichiers (ancien → nouvel id : Halloween 12→15,
// Autumn 13→12, Winter 14→13, Christmas 15→14). Les déblocages et le fond actif enregistrés
// pointent sur des id : sans cette traduction, un enfant ayant débloqué Halloween se
// retrouverait avec Autumn. Appliquée une seule fois (drapeau `ordreFondsV2`) — la rotation
// n'est pas idempotente — y compris sur une sauvegarde ancienne importée.
const CORRESPONDANCE_FONDS_V2 = { bg12: "bg15", bg13: "bg12", bg14: "bg13", bg15: "bg14" };

function migrerOrdreFonds(donnees) {
  if (donnees.ordreFondsV2 === true) return donnees;
  const traduire = (id) => CORRESPONDANCE_FONDS_V2[id] ?? id;
  const resultat = { ...donnees, ordreFondsV2: true };
  if (Array.isArray(donnees.itemsDebloques)) {
    resultat.itemsDebloques = donnees.itemsDebloques.map((cle) =>
      cle.startsWith("background:") ? `background:${traduire(cle.slice("background:".length))}` : cle
    );
  }
  if (typeof donnees.fondActif === "string") resultat.fondActif = traduire(donnees.fondActif);
  return resultat;
}

// Renommage des personnages (décision §5.33) : teddy→beary, skeleton→bones, reindeer→
// deer-deer, et polar (retiré du catalogue) → catty, qui prend sa place : un enfant ayant
// débloqué ou choisi Polar garde ainsi son déblocage sur Catty (même prix) au lieu de le
// perdre. Idempotente (aucun nouvel id n'est aussi un ancien id) : appliquée à chaque
// chargement/import sans drapeau, avec dédoublonnage des déblocages.
const CORRESPONDANCE_PERSONNAGES = { teddy: "beary", skeleton: "bones", reindeer: "deer-deer", polar: "catty" };

function migrerIdentifiantsPersonnages(donnees) {
  const traduire = (id) => CORRESPONDANCE_PERSONNAGES[id] ?? id;
  const resultat = { ...donnees };
  if (Array.isArray(donnees.itemsDebloques)) {
    const traduits = donnees.itemsDebloques.map((cle) =>
      cle.startsWith("character:") ? `character:${traduire(cle.slice("character:".length))}` : cle
    );
    resultat.itemsDebloques = [...new Set(traduits)];
  }
  if (typeof donnees.personnageActif === "string") resultat.personnageActif = traduire(donnees.personnageActif);
  return resultat;
}

function etatParDefaut() {
  return {
    ordreFondsV2: true,
    mots: structuredClone(WORDS_SEED),
    totalEtoiles: ETOILES_DE_DEPART,
    personnageActif: CHARACTER_DEFAULT_ID,
    fondActif: BACKGROUND_NONE_ID,
    itemsDebloques: [
      `character:${CHARACTER_DEFAULT_ID}`,
      `background:${BACKGROUND_NONE_ID}`
    ],
    totalReponses: 0,
    totalBonnesReponses: 0,
    // Dates d'ajout dont le lot de révision a déjà été réussi à 100 % au moins une fois —
    // déverrouille le choix parmi les anciens questionnaires (voir quizEngine.js).
    lotsRevisionReussis: [],
    // Mots du lot déjà réussis AUJOURD'HUI en Révision, par lot (date d'ajout) — sert aux
    // passages de rattrapage (voir quizEngine.creerSession et décision §5.30). Repart à vide
    // dès que le jour change.
    revisionDuJour: { date: null, parLot: {}, complements: {}, aApprendre: {} },
    // Indice "Appuie ici, je vais t'aider !" de la recherche de "Mes Mots" (décision §5.37) :
    // nombre de fois où il a été affiché, et si l'enfant a déjà utilisé la recherche.
    aideRecherche: { affichages: 0, utilisee: false },
    // Étoiles de Révision gagnées aujourd'hui, par lot (date d'ajout) : 1 ⭐ par lot réussi,
    // 2 ⭐ maximum par jour (décision §5.31). Repart à vide dès que le jour change.
    etoilesRevisionDuJour: { date: null, lots: [] },
    // Dernière date (locale) où l'étoile du Défi a été gagnée — plafonne à 1 ⭐ de base/jour.
    derniereEtoileDefi: null,
    // Réglage de l'appareil (menu ⋮) : sons activés ou non (décision §5.48). Ce n'est pas de la
    // progression : aucune réinitialisation n'y touche.
    sonsActifs: true,
    // Badges (décision §5.53) : "obtenus" = condition remplie, "epingles" = étoiles reçues. Un badge
    // obtenu n'est jamais retiré. Tanuki est offert d'office (badge cosmétique, 0 ⭐).
    badges: badgesParDefaut(),
    suiviBadges: suiviBadgesParDefaut(),
    // Cartable / « Mon Sac » : objectifs fixés par le parent, que l'enfant remplit avec ses étoiles
    // (décision §5.55). Les étoiles versées SORTENT du solde et ne reviennent que si l'objectif est retiré.
    cartable: cartableParDefaut()
  };
}

// ---------- Cartable : objectifs (décision §5.55) ----------
// objectifs : [{ id, libelle, cout, versees }] ; dernierRetire : { libelle, cout } du dernier objectif
// retiré OU validé (le formulaire propose de le recréer) ; prochainId : compteur d'identifiants.
export const CARTABLE_MAX_OBJECTIFS = 4;
export const CARTABLE_MAX_ETOILES = 150;
export const CARTABLE_LIBELLE_MAX = 30;

function cartableParDefaut() {
  return { objectifs: [], dernierRetire: null, prochainId: 1 };
}

// Remet en forme un cartable lu dans une sauvegarde (ancienne, abîmée ou importée) : une sauvegarde sans
// cartable donne « aucun objectif », et une valeur invalide est écartée plutôt que de casser la page.
function normaliserCartable(brut) {
  const cartable = cartableParDefaut();
  if (!brut || typeof brut !== "object") return cartable;

  const ids = new Set();
  const objectifs = Array.isArray(brut.objectifs) ? brut.objectifs : [];
  for (const o of objectifs) {
    if (cartable.objectifs.length >= CARTABLE_MAX_OBJECTIFS || !o || typeof o !== "object") continue;
    const id = Math.floor(Number(o.id));
    const cout = Math.floor(Number(o.cout));
    const versees = Math.floor(Number(o.versees));
    const libelle = typeof o.libelle === "string" ? o.libelle.trim().slice(0, CARTABLE_LIBELLE_MAX) : "";
    if (!libelle || !(id >= 1) || ids.has(id)) continue;
    if (!(cout >= 1 && cout <= CARTABLE_MAX_ETOILES)) continue;
    ids.add(id);
    cartable.objectifs.push({ id, libelle, cout, versees: Number.isFinite(versees) ? Math.max(0, Math.min(cout, versees)) : 0 });
  }

  const dernier = brut.dernierRetire;
  if (dernier && typeof dernier.libelle === "string" && dernier.libelle.trim()) {
    const cout = Math.floor(Number(dernier.cout));
    if (cout >= 1 && cout <= CARTABLE_MAX_ETOILES) {
      cartable.dernierRetire = { libelle: dernier.libelle.trim().slice(0, CARTABLE_LIBELLE_MAX), cout };
    }
  }

  const plusGrand = cartable.objectifs.reduce((m, o) => Math.max(m, o.id), 0);
  const propose = Math.floor(Number(brut.prochainId));
  cartable.prochainId = Math.max(plusGrand + 1, Number.isFinite(propose) ? propose : 1);
  return cartable;
}

function badgesParDefaut() {
  return { obtenus: ["tanuki"], epingles: ["tanuki"] };
}

// Compteurs propres aux badges (ils partent de zéro : aucun historique n'existait avant eux) :
//  - serie / dernierJourSerie : jours d'étude consécutifs (Bunny, Deer-Deer) ;
//  - joursDefi : dates distinctes où un Défi a atteint 80 % (Chicken) ;
//  - questionnaires : questionnaires de Révision réussis, 2 comptés par jour au maximum (Bones).
function suiviBadgesParDefaut() {
  return {
    serie: 0,
    dernierJourSerie: null,
    joursDefi: [],
    questionnaires: { total: 0, date: null, lots: [] }
  };
}

// "Jour" déterminé selon l'horloge locale de l'appareil (pas UTC, pas de serveur) — utilisé
// pour la date d'ajout des mots, le plafond quotidien d'étoiles, et par quizEngine pour
// calculer quelle longueur de Défi porte l'étoile bonus du jour (voir décision §5.25).
function formaterDateLocale(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function dateLocaleAujourdhui() {
  return formaterDateLocale(new Date());
}

// Veille, en jour de calendrier local : on recule d'un JOUR (setDate), pas de 24 h — un changement
// d'heure (jour de 23 h ou 25 h) ne doit jamais fausser une série de jours (décision §5.53).
export function dateLocaleHier() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return formaterDateLocale(d);
}

let etat = null;

function charger() {
  try {
    const brut = localStorage.getItem(STORAGE_KEY);
    if (!brut) return etatParDefaut();
    const parsed = JSON.parse(brut);
    // Fusion défensive : si une future version ajoute un champ, les sauvegardes
    // anciennes ne cassent pas l'application.
    const charge = { ...etatParDefaut(), ...migrerIdentifiantsPersonnages(migrerOrdreFonds(parsed)) };
    charge.cartable = normaliserCartable(charge.cartable);
    return charge;
  } catch (erreur) {
    console.error("Studeo: sauvegarde illisible, réinitialisation.", erreur);
    return etatParDefaut();
  }
}

function sauvegarder() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(etat));
  } catch (erreur) {
    console.error("Studeo: échec de la sauvegarde locale.", erreur);
  }
}

export function init() {
  etat = charger();
  sauvegarder();
}

export function getEtat() {
  return etat;
}

// ---------- Mots ----------

export function getMots() {
  return etat.mots;
}

export function getMot(id) {
  return etat.mots.find((m) => m.id === id) || null;
}

// Comparaison pour détecter un doublon : sans tenir compte des majuscules, des accents, de la
// ponctuation courante ni des espaces en trop (décision §5.38).
function normaliserPourDoublon(texte) {
  return String(texte)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[?!.,]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

// Un mot est un doublon s'il existe déjà avec le MÊME anglais ET la MÊME traduction française
// (un même mot anglais avec une autre traduction — "right" = droite / juste — reste permis).
// `idAIgnorer` : le mot en cours de modification, qui ne doit pas se comparer à lui-même.
export function motExiste(motAnglais, traductionFrancais, idAIgnorer = null) {
  const en = normaliserPourDoublon(motAnglais);
  const fr = normaliserPourDoublon(traductionFrancais);
  return etat.mots.some(
    (m) => m.id !== idAIgnorer && normaliserPourDoublon(m.motAnglais) === en && normaliserPourDoublon(m.traductionFrancais) === fr
  );
}

// Renvoie null si le mot est un doublon (l'interface prévient déjà l'enfant avant d'arriver ici).
export function ajouterMot(motAnglais, traductionFrancais) {
  if (motExiste(motAnglais, traductionFrancais)) return null;
  const idSuivant = etat.mots.reduce((max, m) => Math.max(max, m.id), 0) + 1;
  const mot = {
    id: idSuivant,
    motAnglais: motAnglais.trim(),
    traductionFrancais: traductionFrancais.trim(),
    dateAjout: dateLocaleAujourdhui(),
    statut: "non_teste",
    streakActuel: 0
  };
  etat.mots.push(mot);
  sauvegarder();
  return mot;
}

export function modifierMot(id, changements) {
  const mot = getMot(id);
  if (!mot) return null;
  const en = changements.motAnglais ?? mot.motAnglais;
  const fr = changements.traductionFrancais ?? mot.traductionFrancais;
  if (motExiste(en, fr, id)) return null;
  Object.assign(mot, changements);
  sauvegarder();
  return mot;
}

export function supprimerMot(id) {
  etat.mots = etat.mots.filter((m) => m.id !== id);
  sauvegarder();
}

// Un mot passe "maitrise" après 2 bonnes réponses CONSÉCUTIVES données lors de 2 JOURS
// DIFFÉRENTS (décision §5.30) — deux réussites à quelques minutes d'écart ne prouvent que la
// mémoire à très court terme. Règles :
//  - une mauvaise réponse remet toujours le compteur à zéro (même pour un mot maîtrisé) ;
//  - une bonne réponse ne fait progresser le compteur qu'UNE fois par jour, et pas du tout
//    si le mot a été raté plus tôt dans la journée (un mot raté aujourd'hui ne progresse
//    qu'à partir de demain).
// Entre les deux (une seule bonne réponse, pas encore confirmée), le mot reste affiché comme
// "non_teste" (pas de picto, décision §5.5) plutôt que d'introduire un 4ᵉ statut visible.
const STREAK_POUR_MAITRISE = 2;

export function enregistrerReponse(id, correct) {
  const mot = getMot(id);
  if (!mot) return;
  const aujourdHui = dateLocaleAujourdhui();

  if (correct) {
    const peutProgresser = mot.dateDerniereErreur !== aujourdHui && mot.dateDerniereBonne !== aujourdHui;
    if (peutProgresser) {
      mot.streakActuel = (mot.streakActuel || 0) + 1;
      mot.dateDerniereBonne = aujourdHui;
      mot.statut = mot.streakActuel >= STREAK_POUR_MAITRISE ? "maitrise" : "non_teste";
    }
  } else {
    mot.streakActuel = 0;
    mot.statut = "a_revoir";
    mot.dateDerniereErreur = aujourdHui;
  }

  // Taux de réussite : seule la première réponse de chaque mot dans la journée compte —
  // sinon les passages de rattrapage (réponses juste après correction) le gonfleraient.
  if (mot.dateReponseComptee !== aujourdHui) {
    mot.dateReponseComptee = aujourdHui;
    etat.totalReponses += 1;
    if (correct) etat.totalBonnesReponses += 1;
  }
  sauvegarder();
}

// ---------- Sons ----------

export function getSonsActifs() {
  return etat.sonsActifs !== false;
}

export function definirSonsActifs(valeur) {
  etat.sonsActifs = Boolean(valeur);
  sauvegarder();
}

// ---------- Aide à la recherche (Mes Mots) ----------
// L'indice s'arrête dès que l'enfant a utilisé la recherche une fois, ou après 3 apparitions.
const AIDE_RECHERCHE_MAX_AFFICHAGES = 3;

export function indiceRechercheAutorise() {
  const aide = etat.aideRecherche || {};
  return !aide.utilisee && (aide.affichages || 0) < AIDE_RECHERCHE_MAX_AFFICHAGES;
}

export function noterIndiceRechercheAffiche() {
  const aide = etat.aideRecherche || { affichages: 0, utilisee: false };
  etat.aideRecherche = { ...aide, affichages: (aide.affichages || 0) + 1 };
  sauvegarder();
}

export function noterRechercheUtilisee() {
  const aide = etat.aideRecherche || { affichages: 0, utilisee: false };
  if (aide.utilisee) return;
  etat.aideRecherche = { ...aide, utilisee: true };
  sauvegarder();
}

// ---------- Rattrapage de Révision : mots du lot déjà réussis aujourd'hui ----------

function revisionDuJourAJour() {
  const aujourdHui = dateLocaleAujourdhui();
  if (!etat.revisionDuJour || etat.revisionDuJour.date !== aujourdHui) {
    etat.revisionDuJour = { date: aujourdHui, parLot: {}, complements: {}, aApprendre: {} };
  }
  if (!etat.revisionDuJour.complements) etat.revisionDuJour.complements = {};
  if (!etat.revisionDuJour.aApprendre) etat.revisionDuJour.aApprendre = {};
  return etat.revisionDuJour;
}

// Y avait-il encore quelque chose à apprendre dans ce lot (au moins un mot non maîtrisé) au
// DÉBUT de la journée ? Mémorisé au premier passage terminé, avant que les réponses ne fassent
// évoluer les statuts : sinon un second passage de rattrapage verrait des mots devenus maîtrisés
// le matin même et refuserait à tort l'étoile (décision §5.39). undefined = pas encore évalué.
export function getAApprendreRevisionDuJour(dateAjout) {
  return revisionDuJourAJour().aApprendre[dateAjout];
}

export function definirAApprendreRevisionDuJour(dateAjout, valeur) {
  revisionDuJourAJour().aApprendre[dateAjout] = Boolean(valeur);
  sauvegarder();
}

export function getMotsValidesRevisionDuJour(dateAjout) {
  const suivi = revisionDuJourAJour();
  return suivi.parLot[dateAjout] || [];
}

// Mots d'anciens lots qui complètent un petit lot (moins de 10 mots) pour la journée (décision
// §5.38). Mémorisés à la fin d'une session menée à son terme (jamais sur un abandon), pour que
// les passages de rattrapage et le calcul de l'étoile portent sur le même ensemble de mots.
export function getComplementsRevisionDuJour(dateAjout) {
  return revisionDuJourAJour().complements[dateAjout] || [];
}

export function definirComplementsRevisionDuJour(dateAjout, ids) {
  revisionDuJourAJour().complements[dateAjout] = ids;
  sauvegarder();
}

// resultats : [{ id, correct }] pour les mots du lot interrogés pendant la session. Une
// réussite valide le mot pour la journée, une erreur (y compris sur un mot déjà validé tout
// à l'heure) le retire : il devra être réussi à nouveau.
export function mettreAJourValidationRevision(dateAjout, resultats) {
  const suivi = revisionDuJourAJour();
  const valides = new Set(suivi.parLot[dateAjout] || []);
  for (const { id, correct } of resultats) {
    if (correct) valides.add(id);
    else valides.delete(id);
  }
  suivi.parLot[dateAjout] = [...valides];
  sauvegarder();
}

export function getDerniereDateAjout() {
  if (etat.mots.length === 0) return null;
  return etat.mots.reduce((max, m) => (m.dateAjout > max ? m.dateAjout : max), etat.mots[0].dateAjout);
}

export function getTauxDeReussite() {
  if (etat.totalReponses === 0) return null;
  return Math.round((etat.totalBonnesReponses / etat.totalReponses) * 100);
}

// ---------- Porte-monnaie d'étoiles ----------

export function getTotalEtoiles() {
  return etat.totalEtoiles;
}

export function crediterEtoiles(n) {
  etat.totalEtoiles += n;
  sauvegarder();
}

export function debiterEtoiles(n) {
  if (etat.totalEtoiles < n) return false;
  etat.totalEtoiles -= n;
  sauvegarder();
  return true;
}

// Réservé au menu parent (code secret) : impose directement un solde, sans passer par le
// crédit/débit habituel.
export function definirTotalEtoiles(n) {
  etat.totalEtoiles = Math.max(0, Math.floor(n) || 0);
  sauvegarder();
}

// ---------- Étoiles quotidiennes (Révision / Défi) ----------

// Révision : 1 ⭐ par lot réussi dans la journée, 2 ⭐ maximum par jour (heure locale de
// l'appareil), jamais deux fois pour le même lot le même jour. Renvoie le nombre d'étoiles
// créditées (1 ou 0).
const ETOILES_REVISION_MAX_PAR_JOUR = 2;

// Étoiles gagnées en Révision/Défi et pas encore montrées à l'enfant : l'accueil les lit une
// seule fois pour jouer l'effet sur le compteur (décision §5.32). Volontairement en mémoire
// uniquement — ni sauvegardé ni exporté — et jamais alimenté par les déblocages, dépenses ou
// réglages du menu parent, qui ne sont pas des gains à célébrer.
let gainEtoilesEnAttente = 0;

export function consommerGainEtoiles() {
  const gain = gainEtoilesEnAttente;
  gainEtoilesEnAttente = 0;
  return gain;
}

// Vrai quand les étoiles de Révision du jour sont toutes prises : un lot supplémentaire ne
// rapporterait plus rien aujourd'hui.
export function etoilesRevisionDuJourAtteintes() {
  const jour = etat.etoilesRevisionDuJour;
  return !!jour && jour.date === dateLocaleAujourdhui() && jour.lots.length >= ETOILES_REVISION_MAX_PAR_JOUR;
}

export function essayerCrediterEtoileRevision(dateAjout) {
  const aujourdHui = dateLocaleAujourdhui();
  if (!etat.etoilesRevisionDuJour || etat.etoilesRevisionDuJour.date !== aujourdHui) {
    etat.etoilesRevisionDuJour = { date: aujourdHui, lots: [] };
  }
  const { lots } = etat.etoilesRevisionDuJour;
  if (lots.includes(dateAjout) || lots.length >= ETOILES_REVISION_MAX_PAR_JOUR) return 0;
  lots.push(dateAjout);
  etat.totalEtoiles += 1;
  gainEtoilesEnAttente += 1;
  sauvegarder();
  return 1;
}

// Défi : crédite 1 ⭐ si le Défi n'a pas déjà rapporté son étoile aujourd'hui — 0 sinon.
// `etoilesSupplementaires` (voir décision §5.25) s'ajoute à l'étoile de base quand la
// longueur choisie porte le bonus du jour ; jamais créditée séparément du plafond
// quotidien — si l'étoile du jour est déjà prise, le bonus ne peut pas non plus être obtenu
// par un essai ultérieur.
export function essayerCrediterEtoileDefi(etoilesSupplementaires = 0) {
  const aujourdHui = dateLocaleAujourdhui();
  if (etat.derniereEtoileDefi === aujourdHui) return 0;
  etat.derniereEtoileDefi = aujourdHui;
  const total = 1 + etoilesSupplementaires;
  etat.totalEtoiles += total;
  gainEtoilesEnAttente += total;
  sauvegarder();
  return total;
}

// ---------- Lots de révision déjà réussis ----------
// Un lot est "réussi" dès que tous ses mots ont été validés au moins une fois dans la
// même journée (tous passages confondus). Les lots récents NON réussis sont imposés avant
// tout choix libre parmi les questionnaires (voir quizEngine.lotsObligatoires).

export function lotEstReussi(dateAjout) {
  return etat.lotsRevisionReussis.includes(dateAjout);
}

export function marquerLotReussi(dateAjout) {
  if (!etat.lotsRevisionReussis.includes(dateAjout)) {
    etat.lotsRevisionReussis.push(dateAjout);
    sauvegarder();
  }
}

// ---------- Déblocages (personnages & fonds, système unifié) ----------

export function estDebloque(type, id) {
  return etat.itemsDebloques.includes(`${type}:${id}`);
}

export function debloquer(type, id) {
  const cle = `${type}:${id}`;
  if (!etat.itemsDebloques.includes(cle)) {
    etat.itemsDebloques.push(cle);
    sauvegarder();
  }
}

export function getPersonnageActif() {
  return etat.personnageActif;
}

export function setPersonnageActif(id) {
  if (!estDebloque("character", id)) return false;
  etat.personnageActif = id;
  sauvegarder();
  return true;
}

export function getFondActif() {
  return etat.fondActif;
}

export function setFondActif(id) {
  if (!estDebloque("background", id)) return false;
  etat.fondActif = id;
  sauvegarder();
  return true;
}

// ---------- Badges (décision §5.53) ----------

const QUESTIONNAIRES_MAX_PAR_JOUR = 2;

export function getBadgesEtat() {
  return { obtenus: [...etat.badges.obtenus], epingles: [...etat.badges.epingles] };
}

export function badgeEstObtenu(id) {
  return etat.badges.obtenus.includes(id);
}

// Renvoie true si le badge vient d'être obtenu (false s'il l'était déjà).
export function marquerBadgeObtenu(id) {
  if (etat.badges.obtenus.includes(id)) return false;
  etat.badges.obtenus.push(id);
  sauvegarder();
  return true;
}

// Épingler = recevoir les étoiles d'un badge obtenu. Les étoiles vont directement au solde, SANS
// passer par gainEtoilesEnAttente : l'effet est joué tout de suite sur l'écran « Mon Album », il
// ne doit pas être rejoué à l'accueil.
export function epinglerBadge(id, gain) {
  if (!etat.badges.obtenus.includes(id) || etat.badges.epingles.includes(id)) return false;
  etat.badges.epingles.push(id);
  etat.totalEtoiles += gain;
  sauvegarder();
  return true;
}

export function getTotalBonnesReponses() {
  return etat.totalBonnesReponses;
}

// Jour d'étude : une Révision ou un Défi terminé avec assez de bonnes réponses. Série stricte :
// hier compte, un jour manqué la remet à 1. Renvoie la série courante.
export function noterJourEtude() {
  const suivi = etat.suiviBadges;
  const aujourdHui = dateLocaleAujourdhui();
  if (suivi.dernierJourSerie === aujourdHui) return suivi.serie;
  suivi.serie = suivi.dernierJourSerie === dateLocaleHier() ? suivi.serie + 1 : 1;
  suivi.dernierJourSerie = aujourdHui;
  sauvegarder();
  return suivi.serie;
}

// Série affichée à l'enfant : retombe à zéro dès qu'un jour est manqué (ni aujourd'hui ni hier).
export function getSerieJoursEtude() {
  const suivi = etat.suiviBadges;
  const actif = suivi.dernierJourSerie === dateLocaleAujourdhui() || suivi.dernierJourSerie === dateLocaleHier();
  return actif ? suivi.serie : 0;
}

// Série brute (non remise à zéro à l'affichage) : sert à décider si un badge est obtenu.
export function getSerieJoursEtudeBrute() {
  return etat.suiviBadges.serie;
}

export function noterDefiReussi() {
  const jours = etat.suiviBadges.joursDefi;
  const aujourdHui = dateLocaleAujourdhui();
  if (jours.includes(aujourdHui)) return;
  jours.push(aujourdHui);
  sauvegarder();
}

export function getNbJoursDefiReussis() {
  return etat.suiviBadges.joursDefi.length;
}

// Un questionnaire de Révision (= un lot validé dans la journée) compte une fois par lot et par
// jour, 2 par jour au maximum (comme les étoiles de Révision). Renvoie true s'il a été compté.
export function noterQuestionnaireReussi(dateAjout) {
  const questionnaires = etat.suiviBadges.questionnaires;
  const aujourdHui = dateLocaleAujourdhui();
  if (questionnaires.date !== aujourdHui) {
    questionnaires.date = aujourdHui;
    questionnaires.lots = [];
  }
  if (questionnaires.lots.includes(dateAjout) || questionnaires.lots.length >= QUESTIONNAIRES_MAX_PAR_JOUR) return false;
  questionnaires.lots.push(dateAjout);
  questionnaires.total += 1;
  sauvegarder();
  return true;
}

export function getNbQuestionnairesReussis() {
  return etat.suiviBadges.questionnaires.total;
}

// ---------- Export / Import ----------

function telechargerJSON(objet, nomFichier) {
  const blob = new Blob([JSON.stringify(objet, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const lien = document.createElement("a");
  lien.href = url;
  lien.download = nomFichier;
  document.body.appendChild(lien);
  lien.click();
  document.body.removeChild(lien);
  URL.revokeObjectURL(url);
}

// Sauvegarde complète : tout l'état, pour changer d'appareil ou faire un vrai backup.
export function exporterSauvegardeComplete() {
  telechargerJSON(etat, `studeo-sauvegarde-${new Date().toISOString().slice(0, 10)}.json`);
}

export function importerSauvegarde(contenuJSON) {
  const donnees = JSON.parse(contenuJSON);
  etat = { ...etatParDefaut(), ...migrerIdentifiantsPersonnages(migrerOrdreFonds(donnees)) };
  etat.cartable = normaliserCartable(etat.cartable);
  sauvegarder();
}

// Partage du vocabulaire seul, sans la progression de l'enfant — pour mettre à jour le
// fichier de seed dans le dépôt GitHub à destination d'un autre élève. Les dateAjout
// d'origine sont conservées (important pour que le bouton "Révision" fonctionne dès le
// premier lancement chez le nouvel élève).
export function exporterListeMotsSansProgression() {
  const motsSansProgression = etat.mots.map((m) => ({
    id: m.id,
    motAnglais: m.motAnglais,
    traductionFrancais: m.traductionFrancais,
    dateAjout: m.dateAjout,
    statut: "non_teste"
  }));
  telechargerJSON(motsSansProgression, "words.json");
}

// ---------- Réinitialisations ----------

// Remise à zéro complète : repart de zéro sur l'apprentissage ET le jeu, mais conserve le
// dictionnaire de mots (id, motAnglais, traductionFrancais, dateAjout) — supprimer le
// vocabulaire saisi au fil du temps n'a pas de rapport avec l'intention de ce bouton.
export function remiseAZeroComplete() {
  etat.mots = etat.mots.map((m) => ({
    ...m,
    statut: "non_teste",
    streakActuel: 0,
    dateDerniereBonne: null,
    dateDerniereErreur: null,
    dateReponseComptee: null
  }));
  etat.totalEtoiles = ETOILES_DE_DEPART;
  etat.totalReponses = 0;
  etat.totalBonnesReponses = 0;
  etat.personnageActif = CHARACTER_DEFAULT_ID;
  etat.fondActif = BACKGROUND_NONE_ID;
  etat.itemsDebloques = [
    `character:${CHARACTER_DEFAULT_ID}`,
    `background:${BACKGROUND_NONE_ID}`
  ];
  etat.lotsRevisionReussis = [];
  etat.revisionDuJour = { date: null, parLot: {}, complements: {}, aApprendre: {} };
  etat.etoilesRevisionDuJour = { date: null, lots: [] };
  etat.derniereEtoileDefi = null;
  etat.aideRecherche = { affichages: 0, utilisee: false };
  // Les badges repartent aussi de zéro (sinon « 75 mots maîtrisés » resterait affiché avec 0 mot
  // maîtrisé) ; « Réinitialiser étoiles & achats », elle, les conserve (décision §5.53).
  etat.badges = badgesParDefaut();
  etat.suiviBadges = suiviBadgesParDefaut();
  // Les objectifs du cartable disparaissent SANS rendre leurs étoiles : le solde repart à 5, comme le reste
  // (rendre les étoiles le ferait dépasser le solde de départ, décision §5.55).
  etat.cartable = cartableParDefaut();
  sauvegarder();
}

// Réinitialisation étoiles & achats uniquement : ne touche ni aux mots, ni à leur statut,
// ni au taux de réussite — seule la couche "jeu/récompense" est repartie à zéro (y compris
// les lots déjà réussis et l'historique d'étoiles quotidiennes, qui relèvent de cette couche).
export function reinitialiserEtoilesEtAchats() {
  etat.totalEtoiles = ETOILES_DE_DEPART;
  etat.personnageActif = CHARACTER_DEFAULT_ID;
  etat.fondActif = BACKGROUND_NONE_ID;
  etat.itemsDebloques = [
    `character:${CHARACTER_DEFAULT_ID}`,
    `background:${BACKGROUND_NONE_ID}`
  ];
  etat.lotsRevisionReussis = [];
  etat.revisionDuJour = { date: null, parLot: {}, complements: {}, aApprendre: {} };
  etat.etoilesRevisionDuJour = { date: null, lots: [] };
  etat.derniereEtoileDefi = null;
  etat.cartable = cartableParDefaut();   // objectifs supprimés, étoiles non rendues (solde remis à 5 ci-dessus)
  sauvegarder();
}

// ---------- Cartable : opérations (décision §5.55) ----------
// Chaque opération modifie le solde ET l'objectif puis sauvegarde UNE seule fois : une fermeture de
// l'application au mauvais moment ne peut donc jamais perdre ou dupliquer des étoiles.

export function getObjectifs() {
  return etat.cartable.objectifs.map((o) => ({ ...o }));
}

export function getDernierObjectifRetire() {
  return etat.cartable.dernierRetire ? { ...etat.cartable.dernierRetire } : null;
}

// Renvoie l'objectif créé, ou null (déjà 4 objectifs, libellé vide, coût hors de 1 à 150).
export function ajouterObjectif(libelle, cout) {
  const texte = String(libelle ?? "").trim().slice(0, CARTABLE_LIBELLE_MAX);
  const montant = Math.floor(Number(cout));
  if (etat.cartable.objectifs.length >= CARTABLE_MAX_OBJECTIFS) return null;
  if (!texte || !(montant >= 1 && montant <= CARTABLE_MAX_ETOILES)) return null;
  const objectif = { id: etat.cartable.prochainId, libelle: texte, cout: montant, versees: 0 };
  etat.cartable.prochainId += 1;
  etat.cartable.objectifs.push(objectif);
  sauvegarder();
  return { ...objectif };
}

// Verse jusqu'à `n` étoiles du solde dans l'objectif, sans jamais dépasser ni le solde ni le coût de
// l'objectif. Renvoie le nombre d'étoiles réellement versées (0 si rien n'a pu l'être).
export function verserDansObjectif(id, n) {
  const objectif = etat.cartable.objectifs.find((o) => o.id === id);
  if (!objectif) return 0;
  const versement = Math.max(0, Math.min(Math.floor(Number(n)) || 0, etat.totalEtoiles, objectif.cout - objectif.versees));
  if (versement === 0) return 0;
  etat.totalEtoiles -= versement;
  objectif.versees += versement;
  sauvegarder();
  return versement;
}

// Retire l'objectif : TOUTES ses étoiles retournent au solde. Renvoie { objectif, rembourse } ou null.
export function retirerObjectif(id) {
  const index = etat.cartable.objectifs.findIndex((o) => o.id === id);
  if (index === -1) return null;
  const [objectif] = etat.cartable.objectifs.splice(index, 1);
  etat.totalEtoiles += objectif.versees;
  etat.cartable.dernierRetire = { libelle: objectif.libelle, cout: objectif.cout };
  sauvegarder();
  return { objectif: { ...objectif }, rembourse: objectif.versees };
}

// Validation par le parent : seulement si l'objectif est plein. Les étoiles sont dépensées pour de bon.
export function validerObjectif(id) {
  const index = etat.cartable.objectifs.findIndex((o) => o.id === id);
  if (index === -1 || etat.cartable.objectifs[index].versees < etat.cartable.objectifs[index].cout) return false;
  const [objectif] = etat.cartable.objectifs.splice(index, 1);
  etat.cartable.dernierRetire = { libelle: objectif.libelle, cout: objectif.cout };
  sauvegarder();
  return true;
}
