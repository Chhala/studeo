// router.js — Unique responsabilité : traduire l'URL (#/accueil, #/mots?filtre=maitrise...)
// en un appel à uiRenderer. Le hash routing donne gratuitement la gestion du bouton retour
// Android : chaque navigation empile une entrée d'historique, "retour" dépile normalement
// au lieu de fermer l'application.

let gestionnaireRoute = null;

export function definirGestionnaire(fonction) {
  gestionnaireRoute = fonction;
}

function analyserHash() {
  const brut = window.location.hash.replace(/^#\/?/, "") || "accueil";
  const [chemin, requete] = brut.split("?");
  const params = new URLSearchParams(requete || "");
  const segments = chemin.split("/").filter(Boolean);
  return { route: segments[0] || "accueil", sousRoute: segments[1] || null, params };
}

// ---------- Garde de sortie ----------
// Un écran (ex. session de jeu en cours) peut demander à être averti avant qu'on ne le
// quitte — utile pour confirmer un abandon plutôt que de perdre silencieusement la
// progression sur un retour arrière Android. La navigation (y compris le bouton retour) est
// annulée silencieusement (history.replaceState, qui ne déclenche pas de hashchange), et
// c'est à `garde` de décider — via le callback `procederNavigation` — si elle doit
// finalement avoir lieu.
let garde = null;
let hashPrecedent = null;

export function activerGarde(fonction) {
  garde = fonction;
}

export function desactiverGarde() {
  garde = null;
}

function traiterNavigation() {
  const hashActuel = window.location.hash;

  if (garde && hashActuel !== hashPrecedent) {
    const cible = hashActuel;
    const gardeActuelle = garde;
    history.replaceState(null, "", hashPrecedent);
    gardeActuelle(() => {
      garde = null;
      window.location.hash = cible;
    });
    return;
  }

  hashPrecedent = hashActuel;
  if (!gestionnaireRoute) return;
  gestionnaireRoute(analyserHash());
}

export function naviguer(chemin) {
  window.location.hash = chemin;
}

export function init() {
  window.addEventListener("hashchange", traiterNavigation);
  traiterNavigation();
}
