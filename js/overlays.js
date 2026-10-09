// overlays.js — Unique responsabilité : les composants qui se superposent à l'écran courant.
// Un seul composant de confirmation, réutilisé pour les trois cas destructifs de l'app.

import * as appShell from "./appShell.js";
import * as dataStore from "./dataStore.js";
import * as characterEngine from "./characterEngine.js";
import * as icons from "./icons.js";

// ---------- Boîte de confirmation générique ----------
// gravite: "fort" (destructeur, icône alerte rouge) ou "achat" (icône étoile, bouton accent).
export function openConfirmation({ titre, message, texteConfirmer, gravite = "fort", onConfirmer }) {
  const estAchat = gravite === "achat";
  const html = `
    <div class="boite-dialogue" role="alertdialog" aria-labelledby="dlg-titre">
      <div class="boite-dialogue-icone${estAchat ? " achat" : ""}">${estAchat ? icons.iconeEtoile() : icons.iconeAlerteTriangle()}</div>
      <div class="boite-dialogue-titre" id="dlg-titre">${titre}</div>
      <div class="boite-dialogue-message">${message}</div>
      <div class="boite-dialogue-actions">
        <button type="button" class="bouton-dialogue annuler" data-role="annuler">Annuler</button>
        <button type="button" class="bouton-dialogue ${estAchat ? "confirmer" : "confirmer-danger"}" data-role="confirmer">${texteConfirmer}</button>
      </div>
    </div>
  `;
  const voile = appShell.montrerVoile(html, { position: "centre" });
  voile.querySelector('[data-role="annuler"]').addEventListener("click", () => appShell.fermerVoile(voile));
  voile.querySelector('[data-role="confirmer"]').addEventListener("click", () => {
    appShell.fermerVoile(voile);
    onConfirmer();
  });
}

// ---------- Aide "comment gagner des étoiles" + accès parent caché ----------
// Racourci volontairement discret : 5 taps rapides sur la fenêtre d'aide ouvrent un code
// parent (voir décision §5.24) menant à un réglage manuel du solde d'étoiles. Un enfant qui
// tombe dessus par hasard n'a pas le code ; ce n'est pas une vraie protection, juste un
// frein suffisant pour la cible (un enfant de 10 ans), pas un dispositif de sécurité.
const CODE_PARENT = "15535";
const DELAI_RESET_TAPS_MS = 1500;
const NB_TAPS_SECRET = 5;

let compteurTaps = 0;
let minuteurTaps = null;

export function openAideEtoiles() {
  const html = `
    <div class="boite-dialogue" role="dialog" aria-labelledby="aide-etoiles-titre">
      <div class="avatar-mascotte" id="avatar-aide-etoiles" style="width:72px;height:72px;margin:0 auto 14px;">
        <img alt="" aria-hidden="true">
        <div class="repli">${icons.iconePatte()}</div>
      </div>
      <div class="boite-dialogue-titre" id="aide-etoiles-titre">Comment gagner des étoiles ?</div>
      <div class="boite-dialogue-message" style="text-align:left;">
        <strong>Révision</strong> réussie sans aucune erreur : 1 ⭐ par jour.<br><br>
        <strong>Défi</strong> réussi avec au moins 80% de bonnes réponses : 1 ⭐ par jour.<br><br>
        <em>Astuce : un indice se cache parfois dans ce que te dit ta mascotte avant un Défi...</em><br><br>
        Reviens chaque jour pour ne pas en manquer !
      </div>
      <div class="boite-dialogue-actions">
        <button type="button" class="bouton-dialogue confirmer" data-role="fermer" style="flex:none;width:100%;">Compris</button>
      </div>
    </div>
  `;
  const voile = appShell.montrerVoile(html, { position: "centre" });
  const boite = voile.querySelector(".boite-dialogue");

  characterEngine.lierElementCompagnon(
    voile.querySelector("#avatar-aide-etoiles img"),
    voile.querySelector("#avatar-aide-etoiles .repli")
  );

  compteurTaps = 0;
  boite.addEventListener("click", (evenement) => {
    if (evenement.target.closest('[data-role="fermer"]')) return;

    compteurTaps += 1;
    clearTimeout(minuteurTaps);
    minuteurTaps = setTimeout(() => { compteurTaps = 0; }, DELAI_RESET_TAPS_MS);

    if (compteurTaps >= NB_TAPS_SECRET) {
      compteurTaps = 0;
      appShell.fermerVoile(voile);
      openCodeParent();
    }
  });

  voile.querySelector('[data-role="fermer"]').addEventListener("click", () => appShell.fermerVoile(voile));
}

function openCodeParent() {
  const html = `
    <div class="boite-dialogue" role="dialog" aria-labelledby="code-parent-titre">
      <div class="boite-dialogue-titre" id="code-parent-titre">Code parent</div>
      <div class="champ-formulaire" style="text-align:left;margin-bottom:18px;">
        <label for="champ-code-parent" class="visually-hidden">Code secret</label>
        <input id="champ-code-parent" type="tel" inputmode="numeric" autocomplete="off" placeholder="Code secret">
      </div>
      <div class="boite-dialogue-actions">
        <button type="button" class="bouton-dialogue annuler" data-role="annuler">Annuler</button>
        <button type="button" class="bouton-dialogue confirmer" data-role="valider">Valider</button>
      </div>
    </div>
  `;
  const voile = appShell.montrerVoile(html, { position: "centre" });
  const champ = voile.querySelector("#champ-code-parent");
  champ.focus();

  voile.querySelector('[data-role="annuler"]').addEventListener("click", () => appShell.fermerVoile(voile));
  voile.querySelector('[data-role="valider"]').addEventListener("click", () => {
    if (champ.value.trim() === CODE_PARENT) {
      appShell.fermerVoile(voile);
      openReglageEtoiles();
    } else {
      appShell.afficherToast("Code incorrect.");
    }
  });
}

function openReglageEtoiles() {
  const html = `
    <div class="feuille" role="dialog" aria-labelledby="reglage-etoiles-titre">
      <div class="poignee"></div>
      <div class="boite-dialogue-titre" id="reglage-etoiles-titre" style="text-align:left;margin-bottom:16px;">
        Régler le solde d'étoiles
      </div>
      <div class="champ-formulaire">
        <label for="champ-etoiles">Nombre d'étoiles</label>
        <input id="champ-etoiles" type="number" min="0" step="1" value="${dataStore.getTotalEtoiles()}">
      </div>
      <button type="button" class="bouton-cta principal" data-role="valider" style="width:100%;justify-content:center;margin-top:16px;">
        <span class="font-display">Enregistrer</span>
      </button>
    </div>
  `;
  const voile = appShell.montrerVoile(html, { position: "bas" });

  voile.querySelector('[data-role="valider"]').addEventListener("click", () => {
    const valeur = parseInt(voile.querySelector("#champ-etoiles").value, 10);
    dataStore.definirTotalEtoiles(Number.isFinite(valeur) ? valeur : 0);
    appShell.fermerVoile(voile);
    window.location.reload();
  });
}

// ---------- Aperçu plein écran d'un fond d'écran (achat / sélection) ----------
// pas de double confirmation sur "Acheter"/"Choisir" : l'action est immédiate, la
// prévisualisation plein écran fait déjà office d'étape de confirmation visuelle.
export function openApercuFond(fond, onValider) {
  // Le coût n'est plus écrit sur le bouton : il est dit une fois par onglet dans l'album.
  const boutonLabel = fond.debloque ? "Choisir ce fond" : "Débloquer";

  const html = `
    <div class="apercu-fond" style="background-image:url('${fond.image ?? ""}'); background-position:${fond.focal || "center"};">
      <div class="apercu-fond-bas">
        <div class="apercu-fond-nom">${fond.nom}</div>
        <div class="apercu-fond-actions">
          <button type="button" class="bouton-dialogue annuler" data-role="annuler">Annuler</button>
          <button type="button" class="bouton-dialogue confirmer" data-role="valider">${boutonLabel}</button>
        </div>
      </div>
    </div>
  `;
  const voile = appShell.montrerVoile(html, { position: "plein" });
  voile.querySelector('[data-role="annuler"]').addEventListener("click", () => appShell.fermerVoile(voile));
  voile.querySelector('[data-role="valider"]').addEventListener("click", () => {
    const resultat = onValider();
    if (resultat.ok) {
      appShell.fermerVoile(voile);
    } else {
      appShell.afficherToast(`Il te manque ${resultat.manque} étoile${resultat.manque > 1 ? "s" : ""}`);
    }
  });
}

// ---------- Menu options (⋮) ----------
export function openMenuOptions({ onExportComplet, onImport, onExportVocabulaire, onResetComplet, onResetEtoiles }) {
  const html = `
    <div class="feuille" role="menu">
      <div class="poignee"></div>

      <div class="groupe-label">Sauvegarde de l'appareil</div>
      <button type="button" class="ligne-action" data-role="export-complet">
        <span class="icone-cercle">${icons.iconeTelecharger()}</span>
        Effectuer une sauvegarde complète
      </button>
      <button type="button" class="ligne-action" data-role="import">
        <span class="icone-cercle">${icons.iconeImporter()}</span>
        Importer une sauvegarde
      </button>

      <div class="separateur"></div>
      <div class="groupe-label">Partage du vocabulaire</div>
      <button type="button" class="ligne-action" data-role="export-vocabulaire">
        <span class="icone-cercle">${icons.iconeListe()}</span>
        Exporter uniquement la liste de mots
      </button>

      <div class="separateur"></div>
      <div class="groupe-label">Réinitialisation</div>
      <button type="button" class="ligne-action danger-fort" data-role="reset-complet">
        <span class="icone-cercle danger-fort">${icons.iconeAlerteTriangle()}</span>
        Remise à zéro complète
      </button>
      <button type="button" class="ligne-action danger-modere" data-role="reset-etoiles">
        <span class="icone-cercle danger-modere">${icons.iconeEtoileContour()}</span>
        Réinitialiser étoiles &amp; achats
      </button>

      <input type="file" id="input-import-fichier" accept="application/json" class="visually-hidden">
      <div id="info-version" style="margin-top:14px;text-align:center;font-size:10.5px;font-weight:600;color:var(--text-muted);opacity:.75;"></div>
    </div>
  `;
  const voile = appShell.montrerVoile(html, { position: "bas" });
  const fermer = () => appShell.fermerVoile(voile);

  // Ligne de diagnostic discrète : version de l'app réellement chargée (nom du cache du service
  // worker) et tailles mesurées — utile pour vérifier qu'un téléphone a bien reçu la dernière
  // version, et pour comprendre un défaut d'affichage propre à un appareil.
  const remplirVersion = (nomCache) => {
    const shell = document.getElementById("app-shell").getBoundingClientRect();
    voile.querySelector("#info-version").textContent =
      `${nomCache} · fenêtre ${window.innerWidth}×${window.innerHeight} · app ${Math.round(shell.width)}×${Math.round(shell.height)} · écran ${screen.width}×${screen.height} · ${window.__diagCoquille || "mesures ?"}`;
  };
  if (window.caches) {
    caches.keys().then((noms) => remplirVersion(noms.filter((n) => n.startsWith("studeo-")).join(", ") || "sans cache")).catch(() => remplirVersion("version ?"));
  } else {
    remplirVersion("version ?");
  }

  voile.querySelector('[data-role="export-complet"]').addEventListener("click", () => { fermer(); onExportComplet(); });
  voile.querySelector('[data-role="export-vocabulaire"]').addEventListener("click", () => { fermer(); onExportVocabulaire(); });

  const inputFichier = voile.querySelector("#input-import-fichier");
  voile.querySelector('[data-role="import"]').addEventListener("click", () => inputFichier.click());
  inputFichier.addEventListener("change", (evenement) => {
    const fichier = evenement.target.files[0];
    if (!fichier) return;
    fermer();
    onImport(fichier);
  });

  voile.querySelector('[data-role="reset-complet"]').addEventListener("click", () => {
    fermer();
    openConfirmation({
      titre: "Remise à zéro complète ?",
      message: "Les statuts des mots, les étoiles et les mascottes/fonds débloqués repartent à zéro. Ta liste de mots reste intacte. Cette action est irréversible.",
      texteConfirmer: "Réinitialiser",
      onConfirmer: onResetComplet
    });
  });

  voile.querySelector('[data-role="reset-etoiles"]').addEventListener("click", () => {
    fermer();
    openConfirmation({
      titre: "Réinitialiser étoiles & achats ?",
      message: "Le solde d'étoiles et les mascottes/fonds débloqués repartent à zéro. Les mots et leur statut ne sont pas concernés. Cette action est irréversible.",
      texteConfirmer: "Réinitialiser",
      onConfirmer: onResetEtoiles
    });
  });
}

// ---------- Formulaire d'ajout / modification de mot ----------
// `verifier` (optionnel) : fonction ({ motAnglais, traductionFrancais }) → message d'erreur
// (chaîne) ou null. Si elle renvoie un message, il s'affiche dans le formulaire, qui reste
// ouvert avec ce que l'enfant a tapé (ex. "Ce mot est déjà dans ta liste !").
export function openFormMot(motExistant, onEnregistrer, verifier = null) {
  const estModification = Boolean(motExistant);
  const html = `
    <div class="feuille" role="dialog" aria-labelledby="form-titre">
      <div class="poignee"></div>
      <div class="boite-dialogue-titre" id="form-titre" style="text-align:left;margin-bottom:16px;">
        ${estModification ? "Modifier le mot" : "Ajouter un mot"}
      </div>
      <form id="form-mot">
        <div class="champ-formulaire">
          <label for="champ-anglais">Mot en anglais</label>
          <input id="champ-anglais" type="text" required lang="en" spellcheck="true" autocomplete="off" autocapitalize="none" autocorrect="on">
        </div>
        <div class="champ-formulaire">
          <label for="champ-francais">Traduction en français</label>
          <input id="champ-francais" type="text" required lang="fr" spellcheck="true" autocomplete="off" autocapitalize="none" autocorrect="on">
        </div>
        <div id="erreur-form" class="erreur-formulaire" role="alert"></div>
        <button type="submit" class="bouton-cta principal" style="width:100%;justify-content:center;">
          ${estModification ? "Enregistrer" : "Ajouter"}
        </button>
      </form>
    </div>
  `;
  const voile = appShell.montrerVoile(html, { position: "bas" });
  const formulaire = voile.querySelector("#form-mot");
  formulaire.addEventListener("input", () => { voile.querySelector("#erreur-form").textContent = ""; });
  // Valeurs injectées via .value (et non dans le gabarit HTML) : un mot contenant un
  // guillemet ou un "&" ne peut ainsi pas casser le champ.
  if (estModification) {
    voile.querySelector("#champ-anglais").value = motExistant.motAnglais;
    voile.querySelector("#champ-francais").value = motExistant.traductionFrancais;
  }
  formulaire.addEventListener("submit", (evenement) => {
    evenement.preventDefault();
    const motAnglais = voile.querySelector("#champ-anglais").value.trim();
    const traductionFrancais = voile.querySelector("#champ-francais").value.trim();
    if (!motAnglais || !traductionFrancais) return;
    const erreur = verifier ? verifier({ motAnglais, traductionFrancais }) : null;
    if (erreur) {
      voile.querySelector("#erreur-form").textContent = erreur;
      return;
    }
    appShell.fermerVoile(voile);
    onEnregistrer({ motAnglais, traductionFrancais });
  });
}

export function fermerToutesLesVoiles() {
  document.querySelectorAll(".voile").forEach((v) => v.remove());
}

// Petits raccourcis d'export/import branchés directement sur dataStore, pour ne pas
// dupliquer cette logique dans chaque vue qui ouvre le menu options.
export function gererImportFichier(fichier) {
  const lecteur = new FileReader();
  lecteur.onload = () => {
    try {
      dataStore.importerSauvegarde(lecteur.result);
      appShell.afficherToast("Sauvegarde importée avec succès.");
      window.location.reload();
    } catch (erreur) {
      appShell.afficherToast("Ce fichier n'est pas une sauvegarde Studeo valide.");
    }
  };
  lecteur.readAsText(fichier);
}
