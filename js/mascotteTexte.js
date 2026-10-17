// mascotteTexte.js — Unique responsabilité : les banques de phrases que la mascotte prononce
// pendant une session (question posée, réaction à la réponse). Piochées au hasard à chaque
// fois pour éviter la répétition — ne connaît rien du DOM ni de la logique de session.

function piocher(phrases) {
  return phrases[Math.floor(Math.random() * phrases.length)];
}

// ["a"] → "a" ; ["a", "b"] → "a ou b" ; ["a", "b", "c"] → "a, b ou c".
function listeAvecOu(formes) {
  if (formes.length <= 1) return formes[0] ?? "";
  return `${formes.slice(0, -1).join(", ")} ou ${formes[formes.length - 1]}`;
}

// Formulations groupées par moment de la session plutôt qu'une seule banque générique : on
// évite ainsi un "on est presque à la fin" à la 2ᵉ question sur 20.
// `precedenteCorrecte` : la réponse à la question d'avant était bonne — seules les phrases qui
// félicitent n'ont de sens qu'après une réussite.
export function phraseQuestion(motFrancais, position, total, precedenteCorrecte = false) {
  const restant = total - position + 1;
  // Un mot à formes multiples ("bien / en forme") est dit en entier, relié par « ou » : dire seulement
  // la première forme laissait l'ambiguïté (« bien » → l'enfant répondait « good » au lieu de « fine »).
  // Côté anglais, la bonne réponse affichée reste la première forme (quizEngine.js), et toutes les
  // formes sont acceptées.
  const mot = listeAvecOu(motFrancais.split(" / ").map((forme) => forme.trim()).filter(Boolean));
  // Un mot qui porte déjà sa ponctuation ("comment vas-tu ?") ne doit pas être suivi d'un second
  // signe de fin de phrase ("comment vas-tu ?." / "comment vas-tu ? ?").
  const fin = (ponctuation) => (/[?!]$/.test(mot) ? "" : ponctuation);

  if (position === 1) {
    return piocher([
      `Voici notre premier mot, tu dois trouver comment dire ${mot}${fin(".")}`,
      `On commence ! Comment dirais-tu ${mot}${fin(" ?")}`,
      `C'est parti ! Le premier mot à trouver : ${mot}${fin(".")}`
    ]);
  }

  if (restant === 1) {
    return piocher([
      `Dernier mot ! Trouve comment dire ${mot} et c'est terminé.`,
      `C'est le tout dernier : ${mot}${fin(" !")}`,
      `On termine avec celui-ci : comment dit-on ${mot}${fin(" ?")}`
    ]);
  }

  if (restant <= 3) {
    return piocher([
      `On est proche de la fin, plus que ${restant} mots. Celui-ci : ${mot}${fin(".")}`,
      `Presque terminé ! Il reste ${restant} mots, à commencer par ${mot}${fin(".")}`,
      `Plus que ${restant} mots après celui-ci. Trouve comment dire ${mot}${fin(".")}`
    ]);
  }

  // Un seul repère de mi-parcours, sans chiffre, quand la moitié des questions est faite. Le reste
  // du milieu de session n'annonce aucune position (décision §5.42).
  if (position - 1 === Math.floor(total / 2)) {
    return `On a déjà fait la moitié du chemin ! Comment dirais-tu ${mot}${fin(" ?")}`;
  }

  const phrases = [
    `Au suivant ! Comment dirais-tu ${mot}${fin(" ?")}`,
    `On enchaîne ! Le prochain mot : ${mot}${fin(".")}`,
    `On continue ! Comment dirais-tu ${mot}${fin(" ?")}`
  ];
  if (precedenteCorrecte) phrases.push(`Tu t'en sors bien ! Essaie avec celui-ci : ${mot}${fin(".")}`);
  return piocher(phrases);
}

export function phraseCorrecte() {
  return piocher([
    "Bravo ! Tu as trouvé !",
    "Exactement, bien joué !",
    "Oui, c'est ça !",
    "Parfait, continue comme ça !"
  ]);
}

export function phraseIncorrecte(bonneReponseAffichee) {
  return piocher([
    `Oops, ce n'est pas tout à fait ça ! C'était "${bonneReponseAffichee}".`,
    `Presque ! On disait "${bonneReponseAffichee}".`,
    `Pas cette fois — la réponse était "${bonneReponseAffichee}".`
  ]);
}

// ---------- Mon Sac (le cartable, décision §5.55) ----------
// Toutes ces phrases tiennent en 3 lignes au plus (≈ 70 caractères) : la carte de la mascotte garde ainsi
// sa hauteur (l'avatar de 72 px est plus haut que 3 lignes de texte). La mascotte parle au masculin.

// Phrase habituelle de la page, selon le nombre d'objectifs.
export function phraseSacHabituelle(nbObjectifs) {
  if (nbObjectifs === 0) return "Tu n'as pas d'objectif. Demande à ton parent d'en créer un avec toi.";
  return nbObjectifs > 1 ? "Verse des étoiles pour remplir tes objectifs." : "Verse des étoiles pour remplir ton objectif.";
}

// Un toucher sur une ligne : l'avancement s'il y a des étoiles (pas de chiffre quand l'objectif est
// plein : on demande un parent), sinon quoi faire.
export function phraseSacLigne(objectif) {
  if (objectif.versees >= objectif.cout) return "Objectif rempli ! Appelle un parent pour le valider ensemble.";
  if (objectif.versees > 0) {
    return `Pour cet objectif, tu as ${objectif.versees} étoile${objectif.versees > 1 ? "s" : ""}, et il t'en faut ${objectif.cout}.`;
  }
  return "Glisse la ligne vers la gauche pour verser des étoiles.";
}

// Demande du code parent (pour valider comme pour créer) : une phrase différente de la précédente.
const PHRASES_CODE_SAC = [
  "Il te faut ton code secret, j'espère que tu t'en souviens !",
  "C'est l'heure du code secret : ouvre grand tes souvenirs !",
  "Un petit code secret, s'il te plaît… Je ne regarde pas, promis !"
];
let dernierIndexCode = -1;
export function phraseSacCode() {
  let index;
  do { index = Math.floor(Math.random() * PHRASES_CODE_SAC.length); } while (index === dernierIndexCode);
  dernierIndexCode = index;
  return PHRASES_CODE_SAC[index];
}

export const PHRASES_SAC = {
  codeFaux: "Aïe, ce n'est pas le bon code. On réessaie ?",
  soldeNul: "Tu n'as pas une seule étoile en poche !",
  limite: "Quatre objectifs, c'est déjà un cartable bien rempli !",
  remplir: "Combien d'étoiles glisses-tu dans le cartable ?",
  confirmerRetrait: "Tu veux vraiment vider ton cartable ? Tu reprends tes étoiles, promis !",
  creer: "Crée un nouvel objectif.",
  objectifPlein: "Tu as rempli ton cartable : appelle ton parent pour le valider !",
  valide: "C'est validé. Maintenant, tiens ta parole !",
  ajoute: "Nouvel objectif dans le cartable !",
  vide: "C'est vidé ! Tes étoiles te sont rendues, comme promis.",
  retire: "Objectif retiré du cartable."
};
