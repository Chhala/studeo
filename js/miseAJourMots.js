// miseAJourMots.js — Unique responsabilité : aller chercher la dernière liste de mots publiée avec l'app
// (words.seed.js, sur GitHub Pages) et l'intégrer à l'état de l'appareil via dataStore (décision §5.56).
//
// Le fichier est re-téléchargé en l'important comme module avec une adresse unique (`?maj=…`) : cela
// contourne le cache du navigateur (GitHub Pages garde ses fichiers 10 minutes) ; le service worker laisse
// passer ces requêtes sans les mettre en cache (voir service-worker.js). Rien n'est envoyé : c'est une simple
// lecture d'un fichier du même site.

import * as dataStore from "./dataStore.js";

const DELAI_MAX_MS = 10000;

// Renvoie { statut: "ok", ajoutes, corriges } ou { statut: "erreur" } (hors connexion, site injoignable, fichier
// illisible ou délai dépassé). Ne lève jamais d'exception.
export async function mettreAJour() {
  if (navigator.onLine === false) return { statut: "erreur" };
  try {
    const adresse = new URL(`./words.seed.js?maj=${Date.now()}`, import.meta.url).href;
    const delai = new Promise((_, rejeter) => setTimeout(() => rejeter(new Error("délai dépassé")), DELAI_MAX_MS));
    const module = await Promise.race([import(adresse), delai]);
    if (!Array.isArray(module.WORDS_SEED) || !Number.isInteger(module.VERSION_MOTS)) return { statut: "erreur" };

    const resultat = dataStore.appliquerMiseAJourMots({
      version: module.VERSION_MOTS,
      mots: module.WORDS_SEED,
      corrections: Array.isArray(module.CORRECTIONS_MOTS) ? module.CORRECTIONS_MOTS : []
    });
    return { statut: "ok", ...resultat };
  } catch (erreur) {
    return { statut: "erreur" };
  }
}
