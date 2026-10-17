// navigation.js — Unique responsabilité : la barre de navigation du bas (4 menus : Accueil, Mes Mots,
// Mon Album, Mon Sac), partagée par toutes les vues pour ne plus la recopier dans chacune.

import * as icons from "./icons.js";
import * as router from "./router.js";
import * as badgeEngine from "./badgeEngine.js";

const MENUS = [
  { id: "accueil", route: "accueil", libelle: "Accueil", icone: icons.iconeMaison },
  { id: "mots", route: "mots", libelle: "Mes Mots", icone: icons.iconeLivre },
  { id: "album", route: "album", libelle: "Mon Album", icone: icons.iconeAlbum },
  { id: "sac", route: "sac", libelle: "Mon Sac", icone: icons.iconeSac }
];

// Le HTML de la barre, `actif` étant l'id du menu de la page affichée.
export function html(actif) {
  const boutons = MENUS.map((menu) => {
    const estActif = menu.id === actif;
    // La pastille « un badge attend » (désactivée tant que les badges le sont) reste sur « Mon Album ».
    const pastille = menu.id === "album" && badgeEngine.aBadgeEnAttente() ? '<i class="pastille-nav"></i>' : "";
    const classes = ["nav-item", estActif ? "actif" : "", menu.id === "album" ? "nav-album" : ""].filter(Boolean).join(" ");
    const attributs = estActif ? 'aria-current="page"' : `data-role="nav-${menu.id}"`;
    return `<button type="button" class="${classes}" ${attributs}>${menu.icone(estActif)}<span>${menu.libelle}</span>${pastille}</button>`;
  }).join("");
  return `<nav class="nav-basse" aria-label="Navigation principale">${boutons}</nav>`;
}

// À appeler une fois la vue dessinée : relie chaque menu inactif à sa route.
export function brancher(vue) {
  MENUS.forEach((menu) => {
    const bouton = vue.querySelector(`[data-role="nav-${menu.id}"]`);
    if (bouton) bouton.addEventListener("click", () => router.naviguer(menu.route));
  });
}
