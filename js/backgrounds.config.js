// Catalogue des fonds d'écran déblocables.
// "aucun" est un état permanent hors collection : toujours disponible, jamais compté parmi
// les 20 à débloquer. Il garantit que le système de récompense ne soit jamais punitif — sans
// lui, un enfant qui n'a encore rien débloqué se retrouverait avec un fond par défaut imposé.
//
// coutEtoiles: 0 = disponible dès le départ. focal: point de recadrage CSS (object-position)
// utilisé pour les vignettes carrées de "Mon Album" — "center" par défaut, à ajuster au cas
// par cas si un visuel précis rend mal une fois recadré en carré (aucun nouveau fichier
// image n'est nécessaire pour ça, juste cette valeur).
//
// Format attendu pour chaque image : 1080×2400px, WebP, ~150–200 Ko.

export const BACKGROUND_NONE_ID = "aucun";

// Pas de "bg01" : la position 1 est le fond "aucun" (Épuré), qui n'a pas d'image propre.
// Le pool réel va donc de bg02 à bg21 (20 fonds), correspondance directe avec la position
// dans le pack source (voir décision §5.23 de CLAUDE.md). L'ordre d'affichage dans "Mon Album"
// suit la numérotation des fichiers/id.
export const BACKGROUNDS_CONFIG = [
  { id: "aucun", nom: "Épuré", coutEtoiles: 0, image: null, focal: "center" },
  { id: "bg02", nom: "Castle", coutEtoiles: 3, image: "assets/backgrounds/bg02.webp", focal: "50% 62%" },
  { id: "bg03", nom: "Starry Night", coutEtoiles: 3, image: "assets/backgrounds/bg03.webp", focal: "50% 21%" },
  { id: "bg04", nom: "Daytime Forest", coutEtoiles: 3, image: "assets/backgrounds/bg04.webp", focal: "bottom" },
  { id: "bg05", nom: "Mushroom Woods", coutEtoiles: 3, image: "assets/backgrounds/bg05.webp", focal: "bottom" },
  { id: "bg06", nom: "Fairy Tree", coutEtoiles: 3, image: "assets/backgrounds/bg06.webp", focal: "center" },
  { id: "bg07", nom: "Mountain", coutEtoiles: 3, image: "assets/backgrounds/bg07.webp", focal: "50% 56%" },
  { id: "bg08", nom: "Rocky Peak", coutEtoiles: 3, image: "assets/backgrounds/bg08.webp", focal: "center" },
  { id: "bg09", nom: "Waterfall", coutEtoiles: 3, image: "assets/backgrounds/bg09.webp", focal: "center" },
  { id: "bg10", nom: "Spring", coutEtoiles: 3, image: "assets/backgrounds/bg10.webp", focal: "bottom" },
  { id: "bg11", nom: "Summer", coutEtoiles: 3, image: "assets/backgrounds/bg11.webp", focal: "center" },
  { id: "bg12", nom: "Autumn", coutEtoiles: 3, image: "assets/backgrounds/bg12.webp", focal: "center" },
  { id: "bg13", nom: "Winter", coutEtoiles: 3, image: "assets/backgrounds/bg13.webp", focal: "top" },
  { id: "bg14", nom: "Christmas", coutEtoiles: 3, image: "assets/backgrounds/bg14.webp", focal: "center" },
  { id: "bg15", nom: "Halloween", coutEtoiles: 3, image: "assets/backgrounds/bg15.webp", focal: "bottom" },
  { id: "bg16", nom: "Cake", coutEtoiles: 3, image: "assets/backgrounds/bg16.webp", focal: "center" },
  { id: "bg17", nom: "Cheese", coutEtoiles: 3, image: "assets/backgrounds/bg17.webp", focal: "50% 85%" },
  { id: "bg18", nom: "Sakura", coutEtoiles: 3, image: "assets/backgrounds/bg18.webp", focal: "top" },
  { id: "bg19", nom: "Tanjiro", coutEtoiles: 3, image: "assets/backgrounds/bg19.webp", focal: "center" },
  { id: "bg20", nom: "Nezuko", coutEtoiles: 3, image: "assets/backgrounds/bg20.webp", focal: "center" },
  { id: "bg21", nom: "Shinobu", coutEtoiles: 3, image: "assets/backgrounds/bg21.webp", focal: "center" }
];
