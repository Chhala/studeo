// Catalogue des personnages sélectionnables comme mascotte compagnon.
// coutEtoiles: 0 = disponible dès le premier lancement, sans déblocage.
//
// Convention de nommage des fichiers sprite (à respecter lors de l'export de tes packs) :
//   assets/characters/{id}/{animation}/v{n}/frame-01.png ... frame-NN.png
// Chaque personnage déclare, pour chacune des 4 animations logiques (idle/walk/jump/hurt),
// une liste de variantes ({ frames: N }) : la variante 0 est la "base", jouée la plupart du
// temps ; les variantes suivantes sont piochées occasionnellement au hasard pour donner du
// dynamisme (ex. clin d'œil, marche joyeuse). Le nombre de frames peut varier d'un
// personnage et d'une variante à l'autre — rien n'est figé à 10.
//
// Cas particuliers (aucun code moteur à adapter : c'est uniquement du mapping, ici) :
//  - bones et zombie n'ont pas d'animation "hurt" ni "jump" au sens propre dans leur pack : on
//    réutilise leur animation "Dead" pour hurt et leur animation "Throw"/"Attack" pour jump.
//  - bunny et catty : leur jump est TOUJOURS leur danse (Idle_Dance, 12 frames, à vitesse
//    normale) ; leur saut simple (Jump_Up) a été supprimé.
//  - tanuki, chicken, ducky, penguin, piggy, deer-deer : leur jump est la variante avec le
//    balancement de bras (8 frames) ; le saut simple (5 frames) a été supprimé. Beary garde deux
//    variantes avec le bras : balancement (8 frames, base) et bras tendu (5 frames, 1 fois sur 5).
//    Raison : les images de "saut" des packs montrent le personnage en l'air à hauteur constante,
//    et le balancement de bras est l'animation préférée (décision §5.36).
//  - slime : "Move" sert de walk ET de jump (les images de jump sont une copie de celles de
//    walk) : son "Attack" est un bond vers l'avant qui ne plaît pas. Le rebond vers le haut
//    vient du CSS (`rebond`, ci-dessous) ; ses frames ont été recadrées (voir `echelle`).
//
// `rebond` (optionnel) : liste d'animations pendant lesquelles le sprite reçoit la classe CSS
// "glisse" (petit rebond vers le haut, voir style.css) — pour un personnage sans pieds qui
// n'a pas de vraie marche. Appliqué par SpriteAnimator, donc partout (accueil, boutique, liste,
// victoire).
//
// Une variante peut aussi préciser son propre `fps` : { frames: 12, fps: 12 }.
//
// `echelle` (optionnel, 1 par défaut) : agrandissement CSS du sprite dans son cadre, pour un
// personnage dont l'emprise réelle est petite par rapport à son canevas (slime : son attaque
// s'étire loin vers la gauche, ce qui impose un canevas large où le corps reste petit).
//
// `decalageY` (optionnel, 0 par défaut, en % de la hauteur du cadre) : descend le sprite pour
// que sa base repose sur la même "ligne de sol" que les autres (pieds vers 85-89 % de la
// hauteur du cadre). Utile pour un personnage sans pieds ni jambes (slime, comme un escargot),
// que le centrage par défaut ferait flotter au milieu du cadre.
//
// `reactionBoutique` (optionnel, "jump" par défaut) : animation jouée quand on touche le
// personnage dans "Mon Album". Pour deer-deer le saut (qui le fait monter nettement) est
// réservé à la victoire : il réagit donc par quelques pas ("walk").
//
// Pour ajouter, retirer ou changer un personnage : modifie uniquement ce tableau.
// La grille de "Mon Album" et le sélecteur de mascotte s'adaptent automatiquement.
// L'ordre du tableau est l'ordre d'affichage.

export const CHARACTERS_CONFIG = [
  {
    id: "tanuki", nom: "Tanuki", coutEtoiles: 0,
    animations: {
      idle: [{ frames: 12 }],
      walk: [{ frames: 12 }, { frames: 12 }],
      jump: [{ frames: 8 }], // variante avec le balancement de bras (le saut simple a été supprimé)
      hurt: [{ frames: 6 }, { frames: 10 }]
    }
  },
  {
    id: "chicken", nom: "Chicken", coutEtoiles: 7,
    animations: {
      idle: [{ frames: 11 }, { frames: 12 }],
      walk: [{ frames: 12 }],
      jump: [{ frames: 8 }], // variante avec le balancement de bras (le saut simple a été supprimé)
      hurt: [{ frames: 6 }, { frames: 10 }]
    }
  },
  {
    id: "beary", nom: "Beary", coutEtoiles: 7,
    animations: {
      idle: [{ frames: 12 }, { frames: 12 }],
      walk: [{ frames: 12 }, { frames: 12 }],
      jump: [{ frames: 8 }, { frames: 5 }], // balancement du bras (base, 4 fois sur 5) ; bras tendu (1 fois sur 5)
      hurt: [{ frames: 6 }, { frames: 10 }]
    }
  },
  {
    id: "ducky", nom: "Ducky", coutEtoiles: 7,
    animations: {
      idle: [{ frames: 12 }, { frames: 12 }],
      walk: [{ frames: 12 }],
      jump: [{ frames: 8 }], // variante avec le balancement de bras (le saut simple a été supprimé)
      hurt: [{ frames: 6 }, { frames: 10 }]
    }
  },
  {
    id: "penguin", nom: "Penguin", coutEtoiles: 7,
    animations: {
      idle: [{ frames: 12 }, { frames: 12 }],
      walk: [{ frames: 12 }],
      jump: [{ frames: 8 }], // variante avec le balancement de bras (le saut simple a été supprimé)
      hurt: [{ frames: 6 }, { frames: 10 }]
    }
  },
  {
    id: "piggy", nom: "Piggy", coutEtoiles: 7,
    animations: {
      idle: [{ frames: 12 }, { frames: 12 }, { frames: 12 }],
      walk: [{ frames: 12 }, { frames: 12 }],
      jump: [{ frames: 8 }], // variante avec le balancement de bras (le saut simple a été supprimé)
      hurt: [{ frames: 6 }, { frames: 10 }]
    }
  },
  {
    id: "catty", nom: "Catty", coutEtoiles: 7,
    animations: {
      idle: [{ frames: 12 }, { frames: 12 }],
      walk: [{ frames: 12 }, { frames: 12 }],
      jump: [{ frames: 12, fps: 12 }], // toujours la danse (Idle_Dance, vitesse normale) ; le saut simple a été supprimé
      hurt: [{ frames: 6 }, { frames: 10 }]
    }
  },
  {
    id: "bunny", nom: "Bunny", coutEtoiles: 7,
    animations: {
      idle: [{ frames: 12 }, { frames: 12 }],
      walk: [{ frames: 12 }, { frames: 12 }],
      jump: [{ frames: 12, fps: 12 }], // toujours la danse (Idle_Dance, vitesse normale) ; le saut simple a été supprimé
      hurt: [{ frames: 6 }, { frames: 10 }]
    }
  },
  {
    id: "deer-deer", nom: "Deer-Deer", coutEtoiles: 7, echelle: 1.2, decalageY: 4, reactionBoutique: "walk",
    animations: {
      idle: [{ frames: 12 }, { frames: 12 }],
      walk: [{ frames: 12 }, { frames: 12 }],
      jump: [{ frames: 8 }], // variante avec le balancement de bras (le saut simple a été supprimé)
      hurt: [{ frames: 6 }, { frames: 10 }]
    }
  },
  {
    id: "bones", nom: "Bones", coutEtoiles: 7,
    animations: {
      idle: [{ frames: 12 }],
      walk: [{ frames: 12 }],
      jump: [{ frames: 8 }],  // substitut : animation "Throw"
      hurt: [{ frames: 10 }] // substitut : animation "Dead"
    }
  },
  {
    id: "zombie", nom: "Zombie", coutEtoiles: 7, decalageY: 4,
    animations: {
      idle: [{ frames: 12 }],
      walk: [{ frames: 12 }],
      jump: [{ frames: 8 }],  // substitut : animation "Attack"
      hurt: [{ frames: 10 }] // substitut : animation "Dead"
    }
  },
  {
    id: "slime", nom: "Slime", coutEtoiles: 7, echelle: 1.3, decalageY: 12, rebond: ["walk", "jump"],
    animations: {
      idle: [{ frames: 12 }],
      walk: [{ frames: 10 }], // substitut : animation "Move"
      jump: [{ frames: 10 }], // mêmes images que "Move" (copie), avec le rebond vers le haut
      hurt: [{ frames: 6 }]
    }
  }
];

export const CHARACTER_DEFAULT_ID = "tanuki";

// Réglages d'affichage par animation, communs à tous les personnages (vitesse, bouclage).
// Le nombre de frames, lui, dépend du personnage et de la variante (voir CHARACTERS_CONFIG).
// jump : rapide (le personnage est en l'air sur toutes ses images) et retour immédiat à
// l'attente à la fin — voir décision §5.35.
export const CHARACTER_ANIMATIONS = {
  idle: { fps: 6, loop: true },
  jump: { fps: 18, loop: false, retourIdle: true },
  hurt: { fps: 10, loop: false },
  walk: { fps: 10, loop: true }
};

// Choisit une variante à jouer pour une animation donnée : la base (index 0) la plupart du
// temps, une variante alternative de temps en temps pour le dynamisme (clin d'œil, etc.).
const PROBABILITE_VARIANTE_ALTERNATIVE = 0.2;

export function choisirVariante(characterId, animation) {
  const perso = CHARACTERS_CONFIG.find((p) => p.id === characterId);
  const variantes = perso && perso.animations[animation];
  if (!variantes || variantes.length === 0) return null;

  if (variantes.length === 1 || Math.random() >= PROBABILITE_VARIANTE_ALTERNATIVE) {
    return { index: 0, frames: variantes[0].frames, fps: variantes[0].fps };
  }
  const index = 1 + Math.floor(Math.random() * (variantes.length - 1));
  return { index, frames: variantes[index].frames, fps: variantes[index].fps };
}

export function cheminSprite(characterId, animation, variantIndex, frameIndex) {
  const frame = String(frameIndex).padStart(2, "0");
  return `assets/characters/${characterId}/${animation}/v${variantIndex + 1}/frame-${frame}.png`;
}

// Agrandissement CSS d'un personnage (voir `echelle` ci-dessus) ; 1 si non précisé.
export function echelleSprite(characterId) {
  const perso = CHARACTERS_CONFIG.find((p) => p.id === characterId);
  return (perso && perso.echelle) || 1;
}

// Animation jouée quand on touche un personnage dans la boutique (voir `reactionBoutique`).
export function reactionBoutique(characterId) {
  const perso = CHARACTERS_CONFIG.find((p) => p.id === characterId);
  return (perso && perso.reactionBoutique) || "jump";
}

// Durée en millisecondes d'un cycle de la variante de base d'une animation (frames / fps).
export function dureeAnimationMs(characterId, animation) {
  const perso = CHARACTERS_CONFIG.find((p) => p.id === characterId);
  const variantes = perso && perso.animations[animation];
  if (!variantes || variantes.length === 0) return 1000;
  return (variantes[0].frames / (variantes[0].fps || CHARACTER_ANIMATIONS[animation].fps)) * 1000;
}

// Ce personnage a-t-il un rebond CSS (classe "glisse") pendant cette animation ? (voir `rebond`)
export function aRebond(characterId, animation) {
  const perso = CHARACTERS_CONFIG.find((p) => p.id === characterId);
  return Boolean(perso && perso.rebond && perso.rebond.includes(animation));
}

// Descente CSS d'un personnage, en % de la hauteur du cadre (voir `decalageY`) ; 0% si non précisé.
export function decalageYSprite(characterId) {
  const perso = CHARACTERS_CONFIG.find((p) => p.id === characterId);
  return `${(perso && perso.decalageY) || 0}%`;
}
