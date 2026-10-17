// Catalogue des 12 badges « hauts faits » de « Mon Album » (décision §5.53).
// Un badge par mascotte : `id` = identifiant de la mascotte, et l'ordre de ce tableau est
// l'ordre d'affichage (il suit celui des mascottes dans characters.config.js).
//
// gain     : étoiles reçues quand l'enfant épingle le badge (0 = offert, cosmétique).
// progres  : (optionnel) avancement montré dans la fenêtre du badge — jamais sur la tuile :
//            { type: "serie" | "bonnesReponses" | "joursDefi", cible }.
// image    : assets/badges/{id}.png (voir §5.53 : droits d'auteur à régler avant tout commit).
//
// Les conditions sont calculées par badgeEngine.js ; ici, seulement l'affichage.

// Interrupteur général de la fonction « Badges » (décision de l'utilisateur, 2026-10-16) : à `false`,
// tout est éteint — pas d'onglet « Badges » dans Mon Album, pas de pastille sur « Mon Album », aucun
// badge évalué, aucun compteur alimenté (série de jours, Défis réussis, questionnaires). Tout le code
// reste en place : repasser à `true` (et incrémenter CACHE_NAME) suffit à le rallumer. Les compteurs
// repartent alors de zéro (rien n'a été enregistré pendant l'extinction).
export const BADGES_ACTIFS = false;

export const BADGES_CONFIG = [
  { id: "tanuki",    titre: "Premiers pas",          condition: "Installer Studeo.",                                 gain: 0 },
  { id: "ducky",     titre: "Toujours à flot !",     condition: "Réussir une Révision sans erreur, sans rattrapage.", gain: 1 },
  { id: "beary",     titre: "Ça colle bien !",       condition: "Réussir un Défi de 20 mots sans se tromper.",       gain: 1 },
  { id: "chicken",   titre: "Dur à cuire",           condition: "Réussir un Défi sur 15 jours différents.",          gain: 2, progres: { type: "joursDefi", cible: 15 } },
  { id: "penguin",   titre: "Bien au chaud",         condition: "Maîtriser 25 mots.",                                gain: 1 },
  { id: "piggy",     titre: "Dans la poche !",       condition: "Maîtriser 75 mots.",                                gain: 2 },
  { id: "catty",     titre: "Suivre le fil",         condition: "Donner 500 bonnes réponses.",                       gain: 2, progres: { type: "bonnesReponses", cible: 500 } },
  { id: "bunny",     titre: "Ça pousse !",           condition: "Étudier 7 jours de suite.",                         gain: 1, progres: { type: "serie", cible: 7 } },
  { id: "deer-deer", titre: "Allez de l'Avent",     condition: "Étudier 24 jours de suite.",                        gain: 3, progres: { type: "serie", cible: 24 } },
  { id: "bones",     titre: "Ronger un os",          condition: "Réussir 15 questionnaires de Révision.",            gain: 1 },
  { id: "zombie",    titre: "Tous à table !",        condition: "Débloquer toutes les mascottes.",                   gain: 2 },
  { id: "slime",     titre: "Van Gogh",              condition: "Débloquer tous les fonds d'écran.",                 gain: 2 }
];

export function cheminImageBadge(id) {
  return `assets/badges/${id}.png`;
}
