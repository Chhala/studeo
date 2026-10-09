// albumView.js — Unique responsabilité : afficher et faire vivre l'écran "Mon Album".

import * as appShell from "../appShell.js";
import * as dataStore from "../dataStore.js";
import * as characterEngine from "../characterEngine.js";
import * as themeEngine from "../themeEngine.js";
import * as router from "../router.js";
import * as icons from "../icons.js";
import * as overlays from "../overlays.js";
import * as vieMascottes from "../vieMascottes.js";

let ongletActif = "personnages";

export function render() {
  ongletActif = "personnages";
  renderCoquille();
}

function tuileHTML(item, type) {
  const classeEtat = item.actif ? "actif" : item.debloque ? "" : "verrouille";
  const imgAlt = item.debloque ? item.nom : "";
  const classeFond = type === "background" ? " tuile-fond" : "";
  const stylePosition = type === "background"
    ? ` style="object-position:${item.focal || "center"};"`
    : ` style="--echelle-sprite:${item.echelle || 1}; --decalage-y-sprite:${item.decalageY || 0}%;"`;

  const repliIcone = type === "character" ? icons.iconePatte() : icons.iconeImagePlaceholder();
  const repliIconeVerrouille = type === "character" ? icons.iconePatte("#D9B8B4") : icons.iconeImagePlaceholder();

  const visuel = item.debloque
    ? `
      <div class="tuile-visuel${classeFond}">
        <img src="${item.image ?? ""}" alt="${imgAlt}"${stylePosition}
             onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
        <div class="repli" style="display:none;align-items:center;justify-content:center;width:100%;height:100%;">
          ${repliIcone}
        </div>
        ${item.actif ? `<div class="badge-coche">${icons.iconeCoche()}</div>` : ""}
      </div>
    `
    : `
      <div class="tuile-visuel verrouille${classeFond}">
        <img src="${item.image ?? ""}" alt=""${stylePosition}
             onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
        <div class="repli" style="display:none;align-items:center;justify-content:center;width:100%;height:100%;">
          ${repliIconeVerrouille}
        </div>
        <div class="voile-cadenas">${icons.iconeCadenas()}</div>
      </div>
    `;

  return `
    <div class="tuile-collectible ${classeEtat}" data-id="${item.id}">
      ${visuel}
      <div class="etiquette"><div class="tuile-nom">${item.nom}</div></div>
    </div>
  `;
}

function renderGrille() {
  const conteneur = document.getElementById("conteneur-grille");
  const catalogue = ongletActif === "personnages" ? characterEngine.getCatalogue() : themeEngine.getCatalogue();
  const type = ongletActif === "personnages" ? "character" : "background";

  conteneur.innerHTML = catalogue.map((item) => tuileHTML(item, type)).join("");

  // Le compteur d'étoiles suit chaque déblocage (il restait sur l'ancienne valeur jusqu'à ce
  // qu'on quitte l'écran).
  document.getElementById("chiffre-etoiles").textContent = dataStore.getTotalEtoiles();

  // Le coût est dit une seule fois par onglet (il est le même pour tous les items du type) ; la
  // ligne disparaît quand tout est débloqué.
  const note = document.getElementById("note-prix");
  const couts = catalogue.filter((item) => !item.debloque && item.coutEtoiles > 0).map((item) => item.coutEtoiles);
  note.hidden = couts.length === 0;
  if (couts.length > 0) {
    const cout = Math.min(...couts);
    const prefixe = couts.some((c) => c !== cout) ? "dès " : "";
    note.innerHTML = `${icons.iconeEtoile()}<span>${prefixe}${cout} pour débloquer ${ongletActif === "personnages" ? "une mascotte" : "un fond"}</span>`;
  }

  // Les personnages débloqués prennent vie ; les fonds d'écran et les personnages verrouillés
  // restent figés.
  if (type === "character") {
    vieMascottes.demarrer(conteneur, catalogue.filter((p) => p.debloque).map((p) => p.id));
  } else {
    vieMascottes.arreter();
  }

  conteneur.querySelectorAll(".tuile-collectible").forEach((tuile) => {
    tuile.addEventListener("click", () => {
      const id = tuile.dataset.id;

      if (ongletActif === "personnages") {
        const tenterSelection = () => {
          const resultat = characterEngine.essayerSelectionner(id);
          if (resultat.ok) {
            renderGrille();
            vieMascottes.reagir(id); // après le rendu : la grille vient d'être recréée
          } else {
            appShell.afficherToast(`Il te manque ${resultat.manque} étoile${resultat.manque > 1 ? "s" : ""}`);
          }
        };

        const personnage = catalogue.find((p) => p.id === id);
        if (personnage.debloque) {
          tenterSelection();
        } else if (dataStore.getTotalEtoiles() < personnage.coutEtoiles) {
          // Pas assez d'étoiles : inutile de demander une confirmation qui échouerait.
          const manque = personnage.coutEtoiles - dataStore.getTotalEtoiles();
          appShell.afficherToast(`Il te manque ${manque} étoile${manque > 1 ? "s" : ""}`);
        } else {
          // Le coût n'est plus répété ici : il est affiché une fois par onglet (décision §5.43).
          overlays.openConfirmation({
            titre: `Débloquer ${personnage.nom} ?`,
            message: "C'est définitif : cette mascotte sera à toi pour toujours !",
            texteConfirmer: "Débloquer",
            gravite: "achat",
            onConfirmer: tenterSelection
          });
        }
        return;
      }

      const fond = catalogue.find((f) => f.id === id);

      // "Épuré" n'a pas de photo à prévisualiser : sélection directe, comme avant.
      if (!fond.image) {
        themeEngine.essayerSelectionner(id);
        renderGrille();
        return;
      }

      overlays.openApercuFond(fond, () => {
        const resultat = themeEngine.essayerSelectionner(id);
        if (resultat.ok) renderGrille();
        return resultat;
      });
    });
  });
}

function renderCoquille() {
  const etoiles = dataStore.getTotalEtoiles();

  appShell.getView().innerHTML = `
    <div class="entete">
      <div class="entete-titre font-display">Mon Album</div>
      <div class="chip-etoiles">${icons.iconeEtoile()}<span id="chiffre-etoiles">${etoiles}</span></div>
    </div>

    <div class="segmented">
      <button type="button" data-onglet="personnages" aria-current="${ongletActif === "personnages"}">Mascottes</button>
      <button type="button" data-onglet="fonds" aria-current="${ongletActif === "fonds"}">Fonds d'écran</button>
    </div>

    <div class="note-prix" id="note-prix" hidden></div>

    <div class="grille-album" id="conteneur-grille"></div>

    <nav class="nav-basse" aria-label="Navigation principale">
      <button type="button" class="nav-item" data-role="nav-accueil">${icons.iconeMaison(false)}<span>Accueil</span></button>
      <button type="button" class="nav-item" data-role="nav-mots">${icons.iconeLivre(false)}<span>Mes Mots</span></button>
      <button type="button" class="nav-item actif" aria-current="page">${icons.iconeAlbum(true)}<span>Mon Album</span></button>
    </nav>
  `;

  const vue = appShell.getView();

  vue.querySelectorAll("[data-onglet]").forEach((bouton) => {
    bouton.addEventListener("click", () => {
      ongletActif = bouton.dataset.onglet;
      renderCoquille();
    });
  });

  vue.querySelector('[data-role="nav-accueil"]').addEventListener("click", () => router.naviguer("accueil"));
  vue.querySelector('[data-role="nav-mots"]').addEventListener("click", () => router.naviguer("mots"));

  renderGrille();
}
