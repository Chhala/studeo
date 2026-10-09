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
