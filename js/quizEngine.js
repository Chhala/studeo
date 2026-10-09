// quizEngine.js — Unique responsabilité : la logique pure d'une session de jeu.
// Ne touche à aucun élément du DOM.
//
// Modèle "tout ou rien" : soumettreReponse() ne fait qu'accumuler les réponses en mémoire
// (session.reponses) — rien n'est écrit dans dataStore avant finaliserSession(), appelée
// uniquement quand la session va au bout. Une session abandonnée en cours de route ne laisse
// donc aucune trace (ni statut de mot changé, ni étoile, ni taux de réussite).

import * as dataStore from "./dataStore.js";

const SEUIL_DEFI = 0.8; // 80 % exigé
// Révision : plus de seuil par passage — l'étoile est gagnée quand TOUS les mots du lot ont
// été réussis au moins une fois dans la journée, tous passages confondus (décision §5.30).

// Rattrapage de Révision : pour chaque mot encore à travailler, on repose un mot déjà réussi
// (au moins 2, au plus la moitié des mots réussis du lot) — voir décision §5.30.
const RATTRAPAGE_MIN_MOTS_REUSSIS = 2;
const RATTRAPAGE_PART_MAX_MOTS_REUSSIS = 0.5;

// Défi : poids de tirage par statut — un mot maîtrisé sort moins souvent qu'un mot à revoir
// ou pas encore confirmé, sans disparaître pour autant (il faut continuer à vérifier qu'il
// est toujours su).
const POIDS_DEFI = { a_revoir: 3, non_teste: 2, maitrise: 1 };
const LONGUEURS_DEFI = [10, 15, 20];
// Seules 15 et 20 peuvent porter l'étoile bonus du jour (jamais 10, le minimum) — 20 a
// deux fois plus de chances que 15 de la porter (voir décision §5.25).
const LONGUEURS_BONUS_ELIGIBLES = [15, 20];
const NB_MOTS_INJECTES_MIN = 1;
const NB_MOTS_INJECTES_MAX = 3;
const NB_LOTS_DISPONIBLES = 3;
// Un lot de moins de 10 mots est complété jusqu'à 10 mots qui comptent pour l'étoile, avec
// d'anciens mots (décision §5.38) : sinon ajouter 1 ou 2 mots suffirait à gagner l'étoile sans
// réviser quoi que ce soit.
const NB_MIN_MOTS_LOT_REVISION = 10;
// Défi : pas d'étoile s'il reste moins de 5 mots non maîtrisés dans tout le vocabulaire.
const SEUIL_MOTS_A_APPRENDRE_DEFI = 5;

function melanger(tableau) {
  const copie = [...tableau];
  for (let i = copie.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copie[i], copie[j]] = [copie[j], copie[i]];
  }
  return copie;
}

// Tirage pondéré sans remise (Efraimidis–Spirakis) : chaque élément reçoit la clé
// random^(1/poids) ; les plus grandes clés sont retenues — un poids plus fort sort plus
// souvent, sans jamais exclure les poids faibles.
function tirerPondere(elements, poids, n) {
  return elements
    .map((element) => ({ element, cle: Math.pow(Math.random(), 1 / poids(element)) }))
    .sort((a, b) => b.cle - a.cle)
    .slice(0, n)
    .map(({ element }) => element);
}

// Répartit les `intercalaires` à intervalles réguliers parmi les `principaux` (au lieu de les
// mélanger au hasard) : un mot difficile n'est ainsi jamais noyé dans une série de mots
// difficiles d'affilée, pour garder un rythme encourageant.
function entrelacer(principaux, intercalaires) {
  const total = principaux.length + intercalaires.length;
  const resultat = new Array(total).fill(null);
  intercalaires.forEach((item, i) => {
    resultat[Math.floor(((i + 1) * total) / (intercalaires.length + 1))] = item;
  });
  let suivant = 0;
  return resultat.map((emplacement) => emplacement ?? principaux[suivant++]);
}

function normaliser(texte) {
  return texte
    .trim()
    .toLowerCase()
    .replace(/[?!.,]/g, "")
    .replace(/\s+/g, " ");
}

// Un mot peut avoir plusieurs formes acceptées : "good bye / bye" accepte les deux.
function formesAcceptees(motAnglais) {
  return motAnglais.split(" / ").map((forme) => normaliser(forme));
}

export function longueursDefiDisponibles() {
  return LONGUEURS_DEFI;
}

// Le Défi ne rapporte une étoile que s'il reste de quoi apprendre : au moins 5 mots du
// vocabulaire non maîtrisés (décision §5.39). Sinon on peut s'entraîner, sans étoile.
export function defiPeutRapporterEtoile() {
  return dataStore.getMots().filter((m) => m.statut !== "maitrise").length >= SEUIL_MOTS_A_APPRENDRE_DEFI;
}

// Détermine, de façon stable sur toute une journée (recalculable à l'identique sans rien
// stocker), laquelle de 15 ou 20 porte l'étoile bonus du jour — un simple hash de la date
// locale, pas un vrai tirage aléatoire à chaque appel.
function hashDate(texte) {
  let h = 0;
  for (let i = 0; i < texte.length; i++) {
    h = (h * 31 + texte.charCodeAt(i)) >>> 0;
  }
  return h;
}

export function longueurBonusDuJour() {
  const jour = dataStore.dateLocaleAujourdhui();
  return hashDate(jour) % 3 === 0 ? 15 : 20;
}

// ---------- Sélection du/des lot(s) de révision ----------

// Les N dates d'ajout distinctes les plus récentes (la plus récente en premier), avec leur
// nombre de mots — sert à proposer le choix "quel questionnaire réviser ?".
export function lotsDisponibles() {
  const mots = dataStore.getMots();
  const dates = [...new Set(mots.map((m) => m.dateAjout))].sort((a, b) => (a < b ? 1 : -1));
  return dates.slice(0, NB_LOTS_DISPONIBLES).map((dateAjout) => ({
    dateAjout,
    nbMots: mots.filter((m) => m.dateAjout === dateAjout).length
  }));
}

// Lots imposés avant tout choix libre (décisions §5.31 et §5.40), dans l'ordre où ils doivent
// être faits : TOUS les lots jamais réussis, le plus ancien d'abord, jusqu'à ce que l'enfant ait
// comblé son retard (2 étoiles de Révision par jour au maximum, donc 2 lots récompensés par
// jour). Liste vide = tout est à jour, l'enfant choisit son questionnaire.
export function lotsObligatoires() {
  const mots = dataStore.getMots();
  return [...new Set(mots.map((m) => m.dateAjout))]
    .sort()
    .filter((dateAjout) => !dataStore.lotEstReussi(dateAjout));
}

// Prochain lot que la Révision va imposer (avec son nombre de mots), ou null si tout est à jour.
export function prochainLotObligatoire() {
  const dateAjout = lotsObligatoires()[0];
  if (dateAjout === undefined) return null;
  return { dateAjout, nbMots: dataStore.getMots().filter((m) => m.dateAjout === dateAjout).length };
}

// ---------- Création de session ----------

// Pioche 1 à 3 mots d'anciens lots à ajouter au PREMIER passage d'une révision, pour vérifier
// que d'anciens mots sont toujours sus (maîtrisés, en attente ou à revoir). Ils n'entrent
// jamais dans la condition de l'étoile (compteDansScore: false, estDuLot: false) : une erreur
// sur l'un d'eux met à jour son statut (il redevient "à revoir", donc plus présent dans les
// Défis), sans bloquer la récompense du jour.
function piocherMotsInjectes(motsExclus) {
  const idsExclus = new Set(motsExclus.map((m) => m.id));
  const candidats = dataStore.getMots().filter(
    (m) => !idsExclus.has(m.id) && (m.statut === "maitrise" || m.statut === "a_revoir" || (m.streakActuel || 0) === 1)
  );

  const nb = NB_MOTS_INJECTES_MIN + Math.floor(Math.random() * (NB_MOTS_INJECTES_MAX - NB_MOTS_INJECTES_MIN + 1));
  return melanger(candidats)
    .slice(0, nb)
    .map((mot) => ({ mot, compteDansScore: false, estDuLot: false }));
}

// Complète un petit lot avec d'anciens mots : d'abord ceux "à revoir", puis "en attente" (une
// seule bonne réponse), puis "maîtrisés", enfin les jamais testés (dernier recours : l'enfant ne
// les a peut-être jamais étudiés) ; au hasard à l'intérieur de chaque catégorie.
function choisirComplements(motsDuLot) {
  const manque = NB_MIN_MOTS_LOT_REVISION - motsDuLot.length;
  if (manque <= 0) return [];
  const idsLot = new Set(motsDuLot.map((m) => m.id));
  const rang = (m) =>
    m.statut === "a_revoir" ? 0 : m.statut === "non_teste" && (m.streakActuel || 0) === 1 ? 1 : m.statut === "maitrise" ? 2 : 3;
  return melanger(dataStore.getMots().filter((m) => !idsLot.has(m.id)))
    .sort((a, b) => rang(a) - rang(b)) // tri stable : le hasard est conservé dans chaque catégorie
    .slice(0, manque);
}

// Mots qui complètent le lot AUJOURD'HUI : ceux déjà mémorisés pour ce lot (ils restent les mêmes
// pendant la journée, pour que les rattrapages et l'étoile portent sur le même ensemble), sinon un
// nouveau choix. Aucun complément si le lot atteint déjà 10 mots.
function complementsDuJour(dateAjout, lot) {
  if (lot.length >= NB_MIN_MOTS_LOT_REVISION) return [];
  const idsLot = new Set(lot.map((m) => m.id));
  const stockes = dataStore
    .getComplementsRevisionDuJour(dateAjout)
    .map((id) => dataStore.getMot(id))
    .filter((m) => m && !idsLot.has(m.id))
    .slice(0, NB_MIN_MOTS_LOT_REVISION - lot.length);
  return [...stockes, ...choisirComplements([...lot, ...stockes])];
}

// Questions d'un passage de rattrapage : les mots du lot encore non réussis aujourd'hui,
// entrecoupés de mots du lot déjà réussis (jamais d'anciens lots) pour garder un rythme
// encourageant et éviter que l'enfant déduise "ce mot revient donc j'avais faux".
function questionsDeRattrapage(motsARefaire, motsValides) {
  const nbIntercalaires = Math.min(
    Math.max(motsARefaire.length, RATTRAPAGE_MIN_MOTS_REUSSIS),
    Math.ceil(motsValides.length * RATTRAPAGE_PART_MAX_MOTS_REUSSIS)
  );
  const principaux = melanger(motsARefaire).map((mot) => ({ mot, compteDansScore: true, estDuLot: true }));
  const intercalaires = melanger(motsValides)
    .slice(0, nbIntercalaires)
    .map((mot) => ({ mot, compteDansScore: true, estDuLot: true }));
  return entrelacer(principaux, intercalaires);
}

// options.dateAjout (revision) : lot à réviser, par défaut le plus récent.
// options.longueur (defi) : nombre de mots, parmi longueursDefiDisponibles().
export function creerSession(type, options = {}) {
  if (type === "revision") {
    const dateAjout = options.dateAjout || dataStore.getDerniereDateAjout();
    const lot = dataStore.getMots().filter((m) => m.dateAjout === dateAjout);
    // "Lot effectif" : le lot, complété par d'anciens mots s'il compte moins de 10 mots. Les
    // compléments comptent pour l'étoile exactement comme les mots du lot.
    const complements = complementsDuJour(dateAjout, lot);
    const motsEffectifs = [...lot, ...complements];
    const complementsIds = complements.map((m) => m.id);

    const idsValides = new Set(dataStore.getMotsValidesRevisionDuJour(dateAjout));
    const motsValides = motsEffectifs.filter((m) => idsValides.has(m.id));
    const motsARefaire = motsEffectifs.filter((m) => !idsValides.has(m.id));

    // Rattrapage : une partie du lot effectif est déjà réussie aujourd'hui et il reste des mots à
    // travailler. Sinon (premier passage, ou lot déjà entièrement réussi aujourd'hui),
    // questionnaire complet + mots d'anciens lots (sauf si des compléments en tiennent déjà lieu).
    if (motsValides.length > 0 && motsARefaire.length > 0) {
      return { type, dateAjout, complementsIds, questions: questionsDeRattrapage(motsARefaire, motsValides), indexCourant: 0, reponses: [] };
    }

    const questions = melanger([
      ...motsEffectifs.map((mot) => ({ mot, compteDansScore: true, estDuLot: true })),
      ...(complements.length === 0 ? piocherMotsInjectes(lot) : [])
    ]);

    return { type, dateAjout, complementsIds, questions, indexCourant: 0, reponses: [] };
  }

  const longueur = LONGUEURS_DEFI.includes(options.longueur) ? options.longueur : LONGUEURS_DEFI[1];
  const questions = tirerPondere(
    dataStore.getMots(),
    (mot) => POIDS_DEFI[mot.statut] ?? POIDS_DEFI.non_teste,
    longueur
  ).map((mot) => ({ mot, compteDansScore: true, estDuLot: false }));

  return { type, longueur, questions, indexCourant: 0, reponses: [] };
}

export function motCourant(session) {
  const question = session.questions[session.indexCourant];
  return question ? question.mot : null;
}

export function estTerminee(session) {
  return session.indexCourant >= session.questions.length;
}

// N'écrit rien dans dataStore : accumule juste la réponse en mémoire (voir finaliserSession).
export function soumettreReponse(session, saisie) {
  const question = session.questions[session.indexCourant];
  if (!question) return { correct: false, bonneReponseAffichee: "" };

  const correct = formesAcceptees(question.mot.motAnglais).includes(normaliser(saisie));
  session.reponses.push({
    mot: question.mot,
    correct,
    compteDansScore: question.compteDansScore,
    estDuLot: question.estDuLot
  });
  session.indexCourant += 1;

  return { correct, bonneReponseAffichee: question.mot.motAnglais.split(" / ")[0] };
}

// Point d'entrée unique pour clôturer une session menée à son terme : applique d'un coup le
// statut de chaque mot (règle des 2 jours différents, voir dataStore.enregistrerReponse),
// le taux de réussite global, puis détermine et crédite l'étoile du jour le cas échéant.
// À n'appeler QUE si la session est allée jusqu'au bout — jamais sur un abandon.
export function finaliserSession(session) {
  // Reste-t-il quelque chose à apprendre ? Évalué AVANT d'appliquer les réponses (qui font
  // évoluer les statuts) — sinon une session qui vient de rendre des mots maîtrisés se
  // retrouverait à tort sans rien à apprendre (décision §5.39).
  let aApprendre;
  if (session.type === "revision") {
    // Les compléments du jour sont mémorisés seulement maintenant (session menée à son terme).
    if (session.complementsIds && session.complementsIds.length > 0) {
      dataStore.definirComplementsRevisionDuJour(session.dateAjout, session.complementsIds);
    }
    aApprendre = dataStore.getAApprendreRevisionDuJour(session.dateAjout);
    if (aApprendre === undefined) {
      // Premier passage terminé aujourd'hui pour ce lot : on fige la réponse pour la journée.
      const lot = dataStore.getMots().filter((m) => m.dateAjout === session.dateAjout);
      const complementsMots = (session.complementsIds || []).map((id) => dataStore.getMot(id)).filter(Boolean);
      aApprendre = [...lot, ...complementsMots].some((m) => m.statut !== "maitrise");
      dataStore.definirAApprendreRevisionDuJour(session.dateAjout, aApprendre);
    }
  } else {
    aApprendre = defiPeutRapporterEtoile();
  }

  for (const { mot, correct } of session.reponses) {
    dataStore.enregistrerReponse(mot.id, correct);
  }

  const notees = session.reponses.filter((r) => r.compteDansScore);
  const bonnesReponsesNotees = notees.filter((r) => r.correct).length;
  const totalNote = notees.length;
  const scoreParfait = totalNote > 0 && bonnesReponsesNotees === totalNote;
  const pourcentage = totalNote > 0 ? bonnesReponsesNotees / totalNote : 0;

  let etoilesGagnees = 0;
  let bonusGagne = false;
  let motsRestants = 0;
  let tailleLot = 0;
  let rienAApprendre = false; // l'étoile aurait été méritée, mais il n'y a plus rien à apprendre
  if (session.type === "revision") {
    dataStore.mettreAJourValidationRevision(
      session.dateAjout,
      session.reponses.filter((r) => r.estDuLot).map((r) => ({ id: r.mot.id, correct: r.correct }))
    );

    const idsValides = new Set(dataStore.getMotsValidesRevisionDuJour(session.dateAjout));
    const lot = dataStore.getMots().filter((m) => m.dateAjout === session.dateAjout);
    const motsEffectifs = [...lot, ...complementsDuJour(session.dateAjout, lot)];
    motsRestants = motsEffectifs.filter((m) => !idsValides.has(m.id)).length;
    tailleLot = motsEffectifs.length;

    if (motsEffectifs.length > 0 && motsRestants === 0) {
      dataStore.marquerLotReussi(session.dateAjout);
      if (aApprendre) etoilesGagnees = dataStore.essayerCrediterEtoileRevision(session.dateAjout);
      else rienAApprendre = true;
    }
  } else if (pourcentage >= SEUIL_DEFI && totalNote > 0) {
    if (aApprendre) {
      const porteLeBonus = LONGUEURS_BONUS_ELIGIBLES.includes(session.longueur) && session.longueur === longueurBonusDuJour();
      etoilesGagnees = dataStore.essayerCrediterEtoileDefi(porteLeBonus ? 1 : 0);
      bonusGagne = porteLeBonus && etoilesGagnees > 1;
    } else {
      rienAApprendre = true;
    }
  }

  return {
    total: session.reponses.length,
    bonnesReponses: session.reponses.filter((r) => r.correct).length,
    totalNote,
    bonnesReponsesNotees,
    scoreParfait,
    etoilesGagnees,
    bonusGagne,
    motsRestants,
    tailleLot,
    rienAApprendre
  };
}
