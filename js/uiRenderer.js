// uiRenderer.js — Unique responsabilité : faire correspondre une route à la vue qui doit
// s'afficher. Ne contient aucun markup ni logique métier lui-même.

import * as overlays from "./overlays.js";
import * as characterEngine from "./characterEngine.js";
import * as vieMascottes from "./vieMascottes.js";
import * as accueilView from "./views/accueilView.js";
import * as mesMotsView from "./views/mesMotsView.js";
import * as albumView from "./views/albumView.js";
import * as sessionView from "./views/sessionView.js";

export function afficherRoute({ route, sousRoute, params }) {
  overlays.fermerToutesLesVoiles();
  // Les animations autonomes de la vue précédente (épisodes de l'accueil, personnages de la
  // boutique) s'arrêtent avant d'en afficher une autre.
  characterEngine.arreterVieAleatoire();
  vieMascottes.arreter();

  switch (route) {
    case "mots":
      mesMotsView.render(params.get("filtre"));
      break;
    case "album":
      albumView.render();
      break;
    case "session":
      sessionView.render(sousRoute === "defi" ? "defi" : "revision");
      break;
    case "accueil":
    default:
      accueilView.render();
  }
}
