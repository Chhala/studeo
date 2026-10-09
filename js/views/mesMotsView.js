// mesMotsView.js — Unique responsabilité : afficher et faire vivre l'écran "Mes Mots".
// Le rendu est scindé en renderCoquille() (structure fixe) et renderListe() (contenu
// filtré) pour que la frappe dans le champ de recherche ne perde jamais le focus.

import * as appShell from "../appShell.js";
import * as dataStore from "../dataStore.js";
import * as characterEngine from "../characterEngine.js";
import * as audioEngine from "../audioEngine.js";
import * as router from "../router.js";
import * as overlays from "../overlays.js";
import * as icons from "../icons.js";

const etatLocal = { filtre: "tous", tri: "chronologique", recherche: "" };
let idLigneOuverte = null;

// ---------- La mascotte parle dans le champ de recherche (décision §5.37) ----------
const INVITE = "Tu veux rechercher un mot ?";
const INDICE = "Appuie ici, je vais t'aider !";
const MESSAGES_TRI = {
  alphabetique: "J'ai tout trié de A à Z !",
  chronologique: "C'est trié par date d'ajout !"
};
const DELAI_INDICE_MS = 15000;       // temps passé sans autre interaction que le défilement
const DUREE_INDICE_MS = 5000;        // l'indice reste affiché 5 s une fois écrit
const DUREE_MESSAGE_TRI_MS = 3000;   // le message de tri reste affiché 3 s une fois écrit

let minuteurIndice = null;
let minuteurRetourInvite = null;
let indiceJoueCetteVisite = false;

const champRecherche = () => document.getElementById("wordsearch");

// Vérification du formulaire d'ajout/modification : un mot déjà présent (même anglais ET même
// traduction) est refusé avec un message, le formulaire restant ouvert (décision §5.38).
const verifierDoublon = (idAIgnorer) => ({ motAnglais, traductionFrancais }) =>
  dataStore.motExiste(motAnglais, traductionFrancais, idAIgnorer) ? "Ce mot est déjà dans ta liste !" : null;

// Écrit `texte` dans le placeholder, le laisse affiché `dureeAffichageMs` une fois écrit, puis
// l'invite initiale revient.
function parlerDansLeChamp(texte, dureeAffichageMs) {
  const champ = champRecherche();
  if (!champ) return;
  clearTimeout(minuteurRetourInvite);
  const dureeEcriture = appShell.ecrireTexte(champ, texte, { cible: "placeholder" });
  minuteurRetourInvite = setTimeout(() => {
    const courant = champRecherche();
    if (courant && courant.isConnected && document.activeElement !== courant) {
      appShell.ecrireTexte(courant, INVITE, { cible: "placeholder" });
    }
  }, dureeEcriture + dureeAffichageMs);
}

// (Ré)arme l'indice : il se déclenche après 15 s sans autre interaction que le défilement
// (un toucher sur autre chose remet le compteur à zéro), une seule fois par visite de l'écran,
// et jamais une fois que l'enfant a utilisé la recherche ou après 3 apparitions.
function armerIndice() {
  clearTimeout(minuteurIndice);
  if (indiceJoueCetteVisite || !dataStore.indiceRechercheAutorise()) return;
  minuteurIndice = setTimeout(jouerIndice, DELAI_INDICE_MS);
}

function jouerIndice() {
  const champ = champRecherche();
  if (!champ || !champ.isConnected || document.hidden) return;
  if (champ.value !== "" || document.activeElement === champ) return;
  indiceJoueCetteVisite = true;
  dataStore.noterIndiceRechercheAffiche();
  parlerDansLeChamp(INDICE, DUREE_INDICE_MS);
}

export function render(filtreInitial) {
  etatLocal.filtre = filtreInitial || "tous";
  etatLocal.tri = "chronologique";
  etatLocal.recherche = "";
  idLigneOuverte = null;
  indiceJoueCetteVisite = false;
  renderCoquille();
}

function motsFiltres() {
  let mots = dataStore.getMots();

  if (etatLocal.filtre === "maitrise") mots = mots.filter((m) => m.statut === "maitrise");
  if (etatLocal.filtre === "a_revoir") mots = mots.filter((m) => m.statut === "a_revoir");

  if (etatLocal.recherche.trim()) {
    const q = etatLocal.recherche.trim().toLowerCase();
    mots = mots.filter(
      (m) => m.motAnglais.toLowerCase().includes(q) || m.traductionFrancais.toLowerCase().includes(q)
    );
  }

  mots = [...mots];
  if (etatLocal.tri === "alphabetique") {
    mots.sort((a, b) => a.motAnglais.localeCompare(b.motAnglais));
  } else {
    mots.sort((a, b) => (a.dateAjout === b.dateAjout ? a.id - b.id : a.dateAjout < b.dateAjout ? -1 : 1));
  }
  return mots;
}

function echapperHTML(texte) {
  const div = document.createElement("div");
  div.textContent = texte;
  return div.innerHTML;
}

function badgeStatut(statut) {
  if (statut === "maitrise") return `<div class="badge-icone">${icons.iconeMaitrise()}</div>`;
  if (statut === "a_revoir") return `<div class="badge-icone etat-a-revoir">${icons.iconeARevoir()}</div>`;
  // non_teste : l'espace est réservé pour l'alignement, mais rien n'est dessiné —
  // l'absence de picto ne doit jamais se lire comme une information négative.
  return `<div class="badge-icone" style="background:transparent;"></div>`;
}

function ligneMotHTML(mot) {
  return `
    <div class="ligne-mot-wrapper" data-id="${mot.id}">
      <div class="ligne-mot-actions">
        <button type="button" class="modifier" data-role="modifier" aria-label="Modifier ce mot">${icons.iconeCrayon()}</button>
        <button type="button" class="supprimer" data-role="supprimer" aria-label="Supprimer ce mot">${icons.iconePoubelle()}</button>
      </div>
      <div class="ligne-mot">
        ${badgeStatut(mot.statut)}
        <div class="mot-texte">
          <div class="mot-anglais">${echapperHTML(mot.motAnglais)}</div>
          <div class="mot-francais">${echapperHTML(mot.traductionFrancais)}</div>
        </div>
        <button type="button" class="bouton-audio" data-role="audio" aria-label="Écouter la prononciation">
          ${icons.iconeHautParleur()}
        </button>
      </div>
    </div>
  `;
}

function renderListe() {
  const conteneur = document.getElementById("conteneur-liste");
  const mots = motsFiltres();

  conteneur.innerHTML =
    mots.map(ligneMotHTML).join("") ||
    `<div style="text-align:center;color:var(--text-muted);font-weight:600;font-size:13.5px;padding:16px;background:var(--bg-card);border-radius:var(--radius-md);">
      Aucun mot ne correspond à ta recherche.
    </div>`;

  wireLignes(conteneur);
}

function fermerLigneOuverte() {
  if (idLigneOuverte === null) return;
  const wrapper = document.querySelector(`.ligne-mot-wrapper[data-id="${idLigneOuverte}"]`);
  if (wrapper) wrapper.classList.remove("ouverte");
  idLigneOuverte = null;
}

function wireLignes(conteneur) {
  conteneur.querySelectorAll(".ligne-mot-wrapper").forEach((wrapper) => {
    const id = Number(wrapper.dataset.id);
    let depart = null;

    const ligne = wrapper.querySelector(".ligne-mot");
    ligne.addEventListener("touchstart", (e) => { depart = e.touches[0].clientX; }, { passive: true });
    ligne.addEventListener("touchmove", (e) => {
      if (depart === null) return;
      const delta = e.touches[0].clientX - depart;
      if (delta < -30) {
        if (idLigneOuverte !== id) fermerLigneOuverte();
        wrapper.classList.add("ouverte");
        idLigneOuverte = id;
      } else if (delta > 30) {
        wrapper.classList.remove("ouverte");
        if (idLigneOuverte === id) idLigneOuverte = null;
      }
    }, { passive: true });
    ligne.addEventListener("touchend", () => { depart = null; });

    ligne.addEventListener("click", () => {
      if (wrapper.classList.contains("ouverte")) fermerLigneOuverte();
    });

    wrapper.querySelector('[data-role="audio"]').addEventListener("click", (e) => {
      e.stopPropagation();
      const mot = dataStore.getMot(id);
      if (mot) audioEngine.prononcer(mot.motAnglais);
    });

    wrapper.querySelector('[data-role="modifier"]').addEventListener("click", () => {
      fermerLigneOuverte();
      const mot = dataStore.getMot(id);
      overlays.openFormMot(mot, ({ motAnglais, traductionFrancais }) => {
        dataStore.modifierMot(id, { motAnglais, traductionFrancais });
        renderCoquille();
      }, verifierDoublon(id));
    });

    wrapper.querySelector('[data-role="supprimer"]').addEventListener("click", () => {
      fermerLigneOuverte();
      const mot = dataStore.getMot(id);
      overlays.openConfirmation({
        titre: "Supprimer ce mot ?",
        message: `Le mot « ${echapperHTML(mot.motAnglais)} » sera définitivement supprimé de ta liste. Cette action est irréversible.`,
        texteConfirmer: "Supprimer",
        onConfirmer: () => {
          dataStore.supprimerMot(id);
          renderCoquille();
        }
      });
    });
  });
}

// options.messageTri : phrase de la mascotte à dire après un changement de tri.
function renderCoquille(options = {}) {
  clearTimeout(minuteurRetourInvite); // sinon un retour d'invite en attente écraserait ce rendu
  const mots = dataStore.getMots();
  const nbTous = mots.length;
  const nbMaitrises = mots.filter((m) => m.statut === "maitrise").length;
  const nbARevoir = mots.filter((m) => m.statut === "a_revoir").length;

  appShell.getView().innerHTML = `
    <div class="entete">
      <div class="entete-titre font-display">Mes Mots</div>
      <div style="display:flex;gap:8px;">
        <button type="button" class="bouton-icone" data-role="tri"
          aria-label="Changer le tri (actuellement : ${etatLocal.tri === "chronologique" ? "ordre d'ajout" : "alphabétique"})">
          ${etatLocal.tri === "chronologique" ? icons.iconeCalendrierTri() : icons.iconeAZTri()}
        </button>
        <button type="button" class="bouton-icone plus-rouge" data-role="ajouter" aria-label="Ajouter un mot">
          ${icons.iconePlus()}
        </button>
        <button type="button" class="bouton-icone" data-role="menu" aria-label="Options">
          ${icons.iconeMenuPoints()}
        </button>
      </div>
    </div>

    <div style="padding:8px 24px 0 24px;">
      <div class="carte carte-mascotte carte-recherche-mots">
        <div class="avatar-mascotte" id="avatar-mots">
          <img alt="" aria-hidden="true">
          <div class="repli">${icons.iconePatte()}</div>
        </div>
        <label for="wordsearch" class="visually-hidden">Rechercher un mot</label>
        <input id="wordsearch" type="search" placeholder="" value="${echapperHTML(etatLocal.recherche)}">
      </div>
    </div>

    <div class="segmented">
      <button type="button" data-filtre="tous" aria-current="${etatLocal.filtre === "tous"}">Tous ${nbTous}</button>
      <button type="button" data-filtre="maitrise" aria-current="${etatLocal.filtre === "maitrise"}">Maîtrisés ${nbMaitrises}</button>
      <button type="button" data-filtre="a_revoir" aria-current="${etatLocal.filtre === "a_revoir"}">À revoir ${nbARevoir}</button>
    </div>

    <div class="liste-mots" id="conteneur-liste"></div>

    <nav class="nav-basse" aria-label="Navigation principale">
      <button type="button" class="nav-item" data-role="nav-accueil">${icons.iconeMaison(false)}<span>Accueil</span></button>
      <button type="button" class="nav-item actif" aria-current="page">${icons.iconeLivre(true)}<span>Mes Mots</span></button>
      <button type="button" class="nav-item" data-role="nav-album">${icons.iconeAlbum(false)}<span>Mon Album</span></button>
    </nav>
  `;

  const vue = appShell.getView();

  characterEngine.lierElementCompagnon(
    vue.querySelector("#avatar-mots img"),
    vue.querySelector("#avatar-mots .repli")
  );

  vue.querySelector('[data-role="menu"]').addEventListener("click", () => {
    overlays.openMenuOptions({
      onExportComplet: () => dataStore.exporterSauvegardeComplete(),
      onImport: (fichier) => overlays.gererImportFichier(fichier),
      onExportVocabulaire: () => dataStore.exporterListeMotsSansProgression(),
      onResetComplet: () => { dataStore.remiseAZeroComplete(); renderCoquille(); },
      onResetEtoiles: () => { dataStore.reinitialiserEtoilesEtAchats(); renderCoquille(); }
    });
  });

  const champ = vue.querySelector("#wordsearch");
  const carteRecherche = vue.querySelector(".carte-recherche-mots");

  // La mascotte "écrit" l'invite dans le placeholder (effet Animal Crossing, §26) — elle
  // s'efface donc naturellement dès que l'enfant commence à taper. Après un changement de
  // tri, elle dit à la place la phrase du tri (puis l'invite revient) ; si le champ contient
  // déjà du texte, le placeholder est invisible : la phrase passe alors par le petit message
  // temporaire.
  if (options.messageTri && etatLocal.recherche.trim() === "") {
    parlerDansLeChamp(options.messageTri, DUREE_MESSAGE_TRI_MS);
  } else {
    appShell.ecrireTexte(champ, INVITE, { cible: "placeholder" });
    if (options.messageTri) appShell.afficherToast(options.messageTri);
  }

  // Toute la carte (avatar compris) ouvre le clavier, pas seulement le texte.
  carteRecherche.addEventListener("click", (e) => {
    if (e.target !== champ) champ.focus();
  });

  // Champ ouvert : plus d'indice, et l'invite normale remplace tout message en cours.
  champ.addEventListener("focus", () => {
    clearTimeout(minuteurIndice);
    clearTimeout(minuteurRetourInvite);
    appShell.arreterEcriture(champ);
    champ.placeholder = INVITE;
  });

  champ.addEventListener("input", (e) => {
    etatLocal.recherche = e.target.value;
    if (e.target.value.trim() !== "") dataStore.noterRechercheUtilisee();
    renderListe();
  });

  vue.querySelector('[data-role="tri"]').addEventListener("click", () => {
    etatLocal.tri = etatLocal.tri === "chronologique" ? "alphabetique" : "chronologique";
    renderCoquille({ messageTri: MESSAGES_TRI[etatLocal.tri] });
  });

  // Un toucher sur autre chose que la recherche remet le compteur de l'indice à zéro ; le
  // défilement, lui, ne le remet pas (défiler longtemps = chercher un mot).
  [".entete", ".segmented", "#conteneur-liste"].forEach((selecteur) => {
    vue.querySelector(selecteur).addEventListener("click", armerIndice);
  });

  vue.querySelectorAll("[data-filtre]").forEach((bouton) => {
    bouton.addEventListener("click", () => {
      etatLocal.filtre = bouton.dataset.filtre;
      renderCoquille();
    });
  });

  vue.querySelector('[data-role="ajouter"]').addEventListener("click", () => {
    overlays.openFormMot(null, ({ motAnglais, traductionFrancais }) => {
      dataStore.ajouterMot(motAnglais, traductionFrancais);
      renderCoquille();
    }, verifierDoublon(null));
  });

  vue.querySelector('[data-role="nav-accueil"]').addEventListener("click", () => router.naviguer("accueil"));
  vue.querySelector('[data-role="nav-album"]').addEventListener("click", () => router.naviguer("album"));

  const conteneurListe = vue.querySelector("#conteneur-liste");
  conteneurListe.addEventListener("scroll", () => characterEngine.signalerScroll(), { passive: true });

  renderListe();
  armerIndice();
}
