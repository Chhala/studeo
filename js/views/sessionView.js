// sessionView.js — Unique responsabilité : afficher et faire vivre une session de jeu.
// Le bouton haut-parleur n'apparaît qu'après la réponse (correction/récapitulatif), jamais
// sur la question elle-même — il donnerait sinon la réponse avant que l'enfant n'essaie.
//
// La mascotte "parle" tout du long (bulle de dialogue, texte écrit caractère par caractère) :
// elle pose la question, réagit à la réponse, annonce le choix de longueur/lot. L'enfant
// avance à son rythme (bouton "Continuer"), jamais poussé par un minuteur automatique.
//
// Une session en cours est protégée par une garde de sortie (router.activerGarde) : quitter
// sans terminer demande confirmation, et rien n'est enregistré tant que la session n'a pas
// été menée jusqu'au bout (voir quizEngine.finaliserSession). Le bouton croix en haut
// déclenche la même confirmation (aucun moyen de sortie caché derrière le seul bouton retour
// Android).

import * as appShell from "../appShell.js";
import * as dataStore from "../dataStore.js";
import * as quizEngine from "../quizEngine.js";
import * as audioEngine from "../audioEngine.js";
import * as characterEngine from "../characterEngine.js";
import * as overlays from "../overlays.js";
import * as router from "../router.js";
import * as icons from "../icons.js";
import * as mascotteTexte from "../mascotteTexte.js";

let session = null;

export function render(type) {
  if (type === "defi") {
    renderChoixLongueurDefi();
  } else {
    renderChoixRevision();
  }
}

function renderVide() {
  appShell.getView().innerHTML = `
    <div class="ecran-session">
      <div class="session-question">
        <div class="session-mot-francais font-display" style="font-size:20px;">
          Pas encore de mot à réviser aujourd'hui !
        </div>
        <button type="button" class="bouton-cta principal" data-role="retour">
          <span class="font-display">Retour à l'accueil</span>
        </button>
      </div>
    </div>
  `;
  appShell.getView().querySelector('[data-role="retour"]').addEventListener("click", () => router.naviguer("accueil"));
}

// ---------- Éléments partagés : en-tête (sortie) et mascotte qui parle ----------
// Pas de compteur "Mot X / Y" : la narration de la mascotte (mascotteTexte.js) donne déjà des
// repères contextuels au bon moment ("plus que 3 mots", "dernier mot") — un chiffre fixe en
// plus n'apportait rien que l'enfant ne sache déjà (il choisit la longueur en lançant la
// session) et allait à l'encontre du ton "la mascotte raconte" de cet écran.

function rendreEntete({ confirmerSortie }) {
  return `
    <div class="session-entete">
      <button type="button" class="bouton-sortie-session" data-role="sortie" data-confirme="${confirmerSortie ? "1" : "0"}" aria-label="Quitter la session">
        ${icons.iconeCroix()}
      </button>
    </div>
  `;
}

function attacherSortie() {
  const bouton = appShell.getView().querySelector("[data-role='sortie']");
  if (!bouton) return;
  bouton.addEventListener("click", () => {
    if (bouton.dataset.confirme === "1") {
      confirmerAbandon(() => router.naviguer("accueil"));
    } else {
      router.naviguer("accueil");
    }
  });
}

function rendreMascotte(id) {
  return `
    <div class="carte carte-mascotte">
      <div class="avatar-mascotte" id="${id}">
        <img alt="" aria-hidden="true">
        <div class="repli">${icons.iconePatte()}</div>
      </div>
      <div class="bulle-mascotte" id="${id}-bulle"></div>
    </div>
  `;
}

function lierMascotte(id, texte) {
  const vue = appShell.getView();
  characterEngine.lierElementCompagnon(
    vue.querySelector(`#${id} img`),
    vue.querySelector(`#${id} .repli`)
  );
  appShell.ecrireTexte(vue.querySelector(`#${id}-bulle`), texte);
}

// ---------- Écrans de choix, avant le début de la session ----------

function libelleLot(dateAjout, estLePlusRecent) {
  if (estLePlusRecent) return "Dernier lot";
  const jours = Math.round((Date.parse(new Date().toDateString()) - Date.parse(dateAjout)) / 86400000);
  if (jours <= 0) return "Aujourd'hui";
  if (jours === 1) return "Hier";
  return `Il y a ${jours} jours`;
}

function renderChoixRevision() {
  const derniereDate = dataStore.getDerniereDateAjout();
  if (derniereDate === null) {
    renderVide();
    return;
  }

  // Un lot récent pas encore réussi est imposé avant tout choix libre (décision §5.31).
  const obligatoires = quizEngine.lotsObligatoires();
  if (obligatoires.length > 0) {
    demarrerSession("revision", { dateAjout: obligatoires[0] });
    return;
  }

  const lots = quizEngine.lotsDisponibles();

  appShell.getView().innerHTML = `
    <div class="ecran-session">
      ${rendreEntete({ confirmerSortie: false })}
      ${rendreMascotte("avatar-choix")}
      <div class="session-question">
        <div style="display:flex;flex-direction:column;gap:12px;width:100%;max-width:320px;">
          ${lots.map((lot, i) => `
            <button type="button" class="bouton-cta ${i === 0 ? "principal" : "secondaire"}" data-date="${lot.dateAjout}" style="width:100%;">
              <span style="display:flex;flex-direction:column;align-items:flex-start;">
                <span class="font-display">${libelleLot(lot.dateAjout, i === 0)}</span>
                <span class="bouton-cta-sous-titre" style="${i === 0 ? "" : "color:var(--text-muted);"}">${lot.nbMots} mot${lot.nbMots > 1 ? "s" : ""}</span>
              </span>
            </button>
          `).join("")}
        </div>
      </div>
    </div>
  `;

  lierMascotte("avatar-choix", "Quel questionnaire veux-tu réviser ?");
  attacherSortie();

  appShell.getView().querySelectorAll("[data-date]").forEach((bouton) => {
    bouton.addEventListener("click", () => demarrerSession("revision", { dateAjout: bouton.dataset.date }));
  });
}

function renderChoixLongueurDefi() {
  const longueurs = quizEngine.longueursDefiDisponibles();
  const longueurBonus = quizEngine.longueurBonusDuJour();

  appShell.getView().innerHTML = `
    <div class="ecran-session">
      ${rendreEntete({ confirmerSortie: false })}
      ${rendreMascotte("avatar-choix")}
      <div class="session-question">
        <div style="display:flex;gap:12px;width:100%;max-width:320px;">
          ${longueurs.map((n) => `
            <button type="button" class="bouton-cta secondaire" data-longueur="${n}" style="flex:1;justify-content:center;">
              <span class="font-display">${n}</span>
            </button>
          `).join("")}
        </div>
      </div>
    </div>
  `;

  // S'il ne reste presque rien à apprendre, le Défi ne rapporte pas d'étoile : la mascotte
  // ne parle donc plus du bonus (décision §5.39).
  lierMascotte(
    "avatar-choix",
    quizEngine.defiPeutRapporterEtoile()
      ? `Combien de mots veux-tu faire ? Entre nous... je crois que le questionnaire de ${longueurBonus} mots cache une étoile bonus aujourd'hui !`
      : "Tu connais presque tous tes mots ! Ce Défi ne rapportera pas d'étoile, mais tu peux t'entraîner. Combien de mots veux-tu faire ?"
  );
  attacherSortie();

  appShell.getView().querySelectorAll("[data-longueur]").forEach((bouton) => {
    bouton.addEventListener("click", () => demarrerSession("defi", { longueur: Number(bouton.dataset.longueur) }));
  });
}

// ---------- Déroulement de la session ----------

function demarrerSession(type, options) {
  session = quizEngine.creerSession(type, options);
  if (session.questions.length === 0) {
    renderVide();
    return;
  }
  router.activerGarde(confirmerAbandon);
  renderQuestion();
}

function confirmerAbandon(procederNavigation) {
  overlays.openConfirmation({
    titre: "Quitter la session ?",
    message: "Ta progression de cette session ne sera pas enregistrée.",
    texteConfirmer: "Quitter",
    onConfirmer: () => {
      router.desactiverGarde();
      procederNavigation();
    }
  });
}

function renderQuestion() {
  const mot = quizEngine.motCourant(session);
  const numero = session.indexCourant + 1;
  const total = session.questions.length;

  appShell.getView().innerHTML = `
    <div class="ecran-session">
      ${rendreEntete({ confirmerSortie: true })}
      ${rendreMascotte("avatar-session")}
      <div class="session-question" id="zone-question">
        <form id="form-reponse" style="display:flex;flex-direction:column;align-items:center;gap:14px;width:100%;">
          <label for="champ-reponse" class="visually-hidden">Traduction en anglais</label>
          <input id="champ-reponse" class="session-input" type="text" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" data-gramm="false" placeholder="Ta réponse...">
          <button type="submit" class="session-valider font-display" style="width:100%;max-width:240px;">Valider</button>
        </form>
      </div>
    </div>
  `;

  const precedenteCorrecte = session.reponses.length > 0 && session.reponses[session.reponses.length - 1].correct;
  lierMascotte("avatar-session", mascotteTexte.phraseQuestion(mot.traductionFrancais, numero, total, precedenteCorrecte));
  attacherSortie();

  const vue = appShell.getView();
  const champ = vue.querySelector("#champ-reponse");
  champ.focus();

  vue.querySelector("#form-reponse").addEventListener("submit", (evenement) => {
    evenement.preventDefault();
    traiterReponse(champ.value);
  });
}

// Après une réponse : la mascotte réagit, et l'enfant avance à son rythme avec "Continuer"
// (plus aucun minuteur automatique). Le mot juste reste **toujours** dans la case du haut,
// que la réponse soit bonne ou mauvaise — seule la case du bas change (vide, ou la réponse
// de l'enfant en cas d'erreur) — pour que l'endroit où regarder ne soit jamais ambigu, et le
// haut-parleur reste donc lui aussi toujours accroché à la même case (celle du haut).
function traiterReponse(saisie) {
  const vue = appShell.getView();
  const bulle = vue.querySelector("#avatar-session-bulle");
  const zoneQuestion = vue.querySelector("#zone-question");

  const { correct, bonneReponseAffichee } = quizEngine.soumettreReponse(session, saisie);

  characterEngine.jouerAnimation(correct ? "jump" : "hurt");
  appShell.ecrireTexte(bulle, correct ? mascotteTexte.phraseCorrecte() : mascotteTexte.phraseIncorrecte(bonneReponseAffichee));

  zoneQuestion.innerHTML = `
    <div class="boite-mot correct">
      <span class="mot">${bonneReponseAffichee}</span>
      <button type="button" id="bouton-audio-correction" class="audio-interne" aria-label="Écouter la prononciation">
        ${icons.iconeHautParleur()}
      </button>
    </div>
    <div class="espace-correction">
      ${!correct ? `<div class="boite-mot incorrect"><span class="mot" id="mot-saisi"></span></div>` : ""}
    </div>
    <button type="button" id="bouton-continuer" class="session-valider font-display" style="width:100%;max-width:240px;">Continuer</button>
  `;

  if (!correct) {
    // Affectation directe en textContent (pas d'injection dans le gabarit HTML) : ce que
    // l'enfant a tapé est une donnée, pas du balisage de confiance.
    zoneQuestion.querySelector("#mot-saisi").textContent = saisie.trim();
  }

  vue.querySelector("#bouton-audio-correction").addEventListener("click", () => audioEngine.prononcer(bonneReponseAffichee));
  vue.querySelector("#bouton-continuer").addEventListener("click", () => {
    if (quizEngine.estTerminee(session)) {
      router.desactiverGarde();
      renderRecap();
    } else {
      renderQuestion();
    }
  });
}

function renderRecap() {
  const { totalNote, bonnesReponsesNotees, scoreParfait, etoilesGagnees, bonusGagne, motsRestants, tailleLot, rienAApprendre } = quizEngine.finaliserSession(session);

  // Le score et l'étoile gagnée sont dits par la mascotte (carte blanche, toujours lisible) plutôt
  // qu'écrits en texte libre sur le fond d'écran (décision §5.41).
  const phraseEtoile = bonusGagne
    ? `Bonus décroché : tu gagnes ${etoilesGagnees} étoiles !`
    : etoilesGagnees > 0
      ? "Tu gagnes une étoile !"
      : "";

  // Révision incomplète : l'enfant sait qu'un nouveau passage l'attend — plus court dès qu'au
  // moins un mot du lot a été réussi (sinon c'est un questionnaire complet).
  const plusCourt = motsRestants < tailleLot ? ", ce sera plus court" : "";
  // Réussite sans étoile parce qu'il n'y a plus rien à apprendre : on le dit, et on encourage à
  // ajouter de nouveaux mots (décision §5.39).
  // Étoiles de Révision du jour toutes gagnées alors qu'il reste des questionnaires imposés : on
  // dit que continuer est possible mais ne rapportera plus d'étoile aujourd'hui (décision §5.40).
  const retardSansEtoile = session.type === "revision" && dataStore.etoilesRevisionDuJourAtteintes() && quizEngine.lotsObligatoires().length > 0;
  // En Défi, le score compte (l'étoile exige 80 %) : on le dit. En Révision il n'apporte rien de
  // plus que « Score parfait » ou la liste des mots restants.
  const bilan = scoreParfait
    ? "Score parfait ! Je suis fier de toi !"
    : session.type === "defi"
      ? `${bonnesReponsesNotees} sur ${totalNote}, bravo pour l'effort !`
      : "Session terminée, bravo pour l'effort !";
  const phraseRetard = "Ça suffit pour aujourd'hui ! Tu peux continuer si tu veux, mais il n'y aura plus d'étoile avant demain.";
  // Avec le garde-fou, on garde la nouvelle (l'étoile) et la consigne, sans le bilan : la bulle
  // resterait sinon trop longue.
  const texteMascotte = rienAApprendre
    ? "Bravo, tu connais déjà tous ces mots ! Pas d'étoile cette fois : ajoute de nouveaux mots pour en gagner."
    : session.type === "revision" && motsRestants > 0
      ? `Il te reste ${motsRestants} mot${motsRestants > 1 ? "s" : ""} à retravailler. Relance une Révision${plusCourt} !`
      : retardSansEtoile
        ? [phraseEtoile, phraseRetard].filter(Boolean).join(" ")
        : [bilan, phraseEtoile].filter(Boolean).join(" ");

  appShell.getView().innerHTML = `
    <div class="ecran-session">
      ${rendreMascotte("avatar-recap")}
      <div class="session-question">
        <button type="button" class="bouton-cta principal" data-role="retour" style="margin-top:12px;">
          <span class="font-display">Retour à l'accueil</span>
        </button>
      </div>
    </div>
  `;

  lierMascotte("avatar-recap", texteMascotte);
  if (scoreParfait) characterEngine.jouerAnimation("jump");

  appShell.getView().querySelector('[data-role="retour"]').addEventListener("click", () => router.naviguer("accueil"));
}
