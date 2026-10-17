// cartableEngine.js — Unique responsabilité : les règles d'affichage et de calcul du cartable (« Mon Sac »,
// décision §5.55) : ordre des objectifs, pourcentage, plafond d'un versement, durée estimée.
// Aucune écriture : les modifications passent par dataStore.js. Aucun DOM.

// Rythme habituel pour l'indication de durée du formulaire : ≈ 1,5 ⭐ par jour (Défi + Révision), soit
// ≈ 10 ⭐ par semaine. Une estimation, pas une promesse (l'app ne garde aucun historique du rythme réel).
const ETOILES_PAR_JOUR = 1.5;

export function pourcentage(objectif) {
  return Math.round((objectif.versees / objectif.cout) * 100);
}

export function estPlein(objectif) {
  return objectif.versees >= objectif.cout;
}

// La ligne la plus avancée en haut (une ligne pleine tout en haut) ; à égalité, l'ordre de création.
export function ordonner(objectifs) {
  return [...objectifs].sort((a, b) => (b.versees / b.cout) - (a.versees / a.cout) || a.id - b.id);
}

// Plus grand versement possible : jamais plus que le solde ni que ce qui reste à verser.
export function plafondVersement(objectif, solde) {
  return Math.max(0, Math.min(solde, objectif.cout - objectif.versees));
}

// « ≈ 4 jours … » jusqu'à 10 jours, puis en semaines.
export function dureeEstimee(cout) {
  const jours = Math.ceil(cout / ETOILES_PAR_JOUR);
  if (jours <= 10) return `≈ ${jours} jour${jours > 1 ? "s" : ""} à ton rythme habituel`;
  const semaines = Math.round(jours / 7);
  return `≈ ${semaines} semaine${semaines > 1 ? "s" : ""} à ton rythme habituel`;
}
