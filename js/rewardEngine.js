// rewardEngine.js — Unique responsabilité : la règle de déblocage par étoiles, indifféremment
// du type de collectible (personnage ou fond d'écran). Ni characterEngine ni themeEngine ne
// réimplémentent cette logique — ils l'appellent.

import * as dataStore from "./dataStore.js";

// Renvoie { ok: true } si débloqué (déjà possédé, gratuit, ou achat réussi),
// ou { ok: false, manque: n } avec le nombre d'étoiles manquantes.
export function essayerDebloquer(type, id, coutEtoiles) {
  if (coutEtoiles === 0 || dataStore.estDebloque(type, id)) {
    dataStore.debloquer(type, id); // idempotent : garantit que les items gratuits sont bien enregistrés
    return { ok: true };
  }

  const solde = dataStore.getTotalEtoiles();
  if (solde < coutEtoiles) {
    return { ok: false, manque: coutEtoiles - solde };
  }

  dataStore.debiterEtoiles(coutEtoiles);
  dataStore.debloquer(type, id);
  return { ok: true };
}
