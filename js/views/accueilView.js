// accueilView.js — Unique responsabilité : afficher et faire vivre l'écran d'accueil.

import * as appShell from "../appShell.js";
import * as dataStore from "../dataStore.js";
import * as characterEngine from "../characterEngine.js";
import * as quizEngine from "../quizEngine.js";
import * as overlays from "../overlays.js";
import * as router from "../router.js";
import * as icons from "../icons.js";

export function render() {
  const mots = dataStore.getMots();
  const total = mots.length;
  const maitrises = mots.filter((m) => m.statut === "maitrise").length;
  const aRevoir = mots.filter((m) => m.statut === "a_revoir").length;
  const etoiles = dataStore.getTotalEtoiles();
  // Étoiles gagnées depuis le dernier affichage de l'accueil : le compteur part de l'ancienne
  // valeur et monte avec l'effet (décision §5.32). Lu une seule fois, il ne rejoue jamais.
  const gain = Math.min(dataStore.consommerGainEtoiles(), etoiles);
  const taux = dataStore.getTauxDeReussite();

  const derniereDate = dataStore.getDerniereDateAjout();
  const nbDernierLot = mots.filter((m) => m.dateAjout === derniereDate).length;
  // Un lot en retard est imposé en premier (décision §5.40) : le sous-titre annonce celui-là.
  const lotImpose = quizEngine.prochainLotObligatoire();
  const sousTitreRevision = lotImpose
    ? `${lotImpose.nbMots} mot${lotImpose.nbMots > 1 ? "s" : ""} à réviser`
    : `${nbDernierLot} mot${nbDernierLot > 1 ? "s" : ""} du dernier ajout`;

  appShell.getView().innerHTML = `
    <div class="entete">
      <div class="entete-titre font-display">Studeo</div>
      <button type="button" class="chip-etoiles" data-role="aide-etoiles" style="border:none;cursor:pointer;"><span class="etoile-chip">${icons.iconeEtoile()}</span><span class="chiffre-chip">${etoiles - gain}</span></button>
    </div>

    <div class="contenu-scroll">
      <div class="carte carte-mascotte">
        <div class="avatar-mascotte" id="avatar-accueil">
          <img alt="" aria-hidden="true">
          <div class="repli">${icons.iconePatte()}</div>
        </div>
        <div class="bulle-mascotte" id="bulle-accueil"></div>
      </div>

      <div class="grille-stats">
        <button type="button" class="carte stat-carte" data-role="voir-maitrises">
          ${icons.iconeMaitrise()}
          <div class="stat-valeur">${maitrises}</div>
          <div class="stat-label">Maîtrisés</div>
        </button>
        <button type="button" class="carte stat-carte" data-role="voir-a-revoir">
          ${icons.iconeARevoir()}
          <div class="stat-valeur">${aRevoir}</div>
          <div class="stat-label">À revoir</div>
        </button>
      </div>

      <div class="carte carte-reussite">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;">
          <span style="font-weight:700;font-size:13px;">Taux de réussite</span>
          <span class="font-display" style="font-weight:800;font-size:16px;color:var(--accent);">
            ${taux === null ? "—" : taux + "%"}
          </span>
        </div>
        <div class="barre-progression">
          <div class="barre-progression-remplissage" style="width:${taux ?? 0}%;"></div>
        </div>
        <div style="font-weight:600;font-size:10.5px;color:var(--text-muted);margin-top:8px;">
          Bonnes réponses sur l'ensemble de tes essais
        </div>
      </div>

      <div class="groupe-cta">
        <button type="button" class="bouton-cta principal" data-role="revision">
          ${icons.iconeFlamme()}
          <span style="display:flex;flex-direction:column;align-items:flex-start;">
            <span class="font-display">Révision</span>
            <span class="bouton-cta-sous-titre">${sousTitreRevision}</span>
          </span>
        </button>
        <button type="button" class="bouton-cta secondaire" data-role="defi">
          ${icons.iconeDe()}
          <span style="display:flex;flex-direction:column;align-items:flex-start;">
            <span class="font-display">Défi</span>
            <span class="bouton-cta-sous-titre" style="color:var(--text-muted);">Pioche parmi tes ${total} mots</span>
          </span>
        </button>
      </div>
    </div>

    <nav class="nav-basse" aria-label="Navigation principale">
      <button type="button" class="nav-item actif" aria-current="page">
        ${icons.iconeMaison(true)}<span>Accueil</span>
      </button>
      <button type="button" class="nav-item" data-role="nav-mots">
        ${icons.iconeLivre(false)}<span>Mes Mots</span>
      </button>
      <button type="button" class="nav-item" data-role="nav-album">
        ${icons.iconeAlbum(false)}<span>Mon Album</span>
      </button>
    </nav>
  `;

  const vue = appShell.getView();
  characterEngine.lierElementCompagnon(
    vue.querySelector("#avatar-accueil img"),
    vue.querySelector("#avatar-accueil .repli")
  );
  appShell.ecrireTexte(vue.querySelector("#bulle-accueil"), "Salut ! Prête pour apprendre de nouveaux mots aujourd'hui ?");
  characterEngine.demarrerVieAleatoire();
  if (gain > 0) {
    appShell.animerGainEtoiles(vue.querySelector('[data-role="aide-etoiles"]'), etoiles - gain, etoiles, gain);
  }

  vue.querySelector('[data-role="aide-etoiles"]').addEventListener("click", () => overlays.openAideEtoiles());
  vue.querySelector('[data-role="voir-maitrises"]').addEventListener("click", () => router.naviguer("mots?filtre=maitrise"));
  vue.querySelector('[data-role="voir-a-revoir"]').addEventListener("click", () => router.naviguer("mots?filtre=a_revoir"));
  vue.querySelector('[data-role="revision"]').addEventListener("click", () => router.naviguer("session/revision"));
  vue.querySelector('[data-role="defi"]').addEventListener("click", () => router.naviguer("session/defi"));
  vue.querySelector('[data-role="nav-mots"]').addEventListener("click", () => router.naviguer("mots"));
  vue.querySelector('[data-role="nav-album"]').addEventListener("click", () => router.naviguer("album"));
}
