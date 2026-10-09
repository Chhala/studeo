// spriteAnimator.js — Unique responsabilité : faire défiler les frames PNG d'une animation
// sur un élément <img> donné. Ne sait rien des personnages, des mots ou du reste de l'app.

import { CHARACTER_ANIMATIONS, choisirVariante, cheminSprite, echelleSprite, decalageYSprite, aRebond } from "./characters.config.js";

export class SpriteAnimator {
  constructor(imgEl, fallbackEl) {
    this.imgEl = imgEl;
    this.fallbackEl = fallbackEl; // élément affiché si les images n'existent pas encore
    this.characterId = null;
    this.animationCourante = null;
    this.frameIndex = 0;
    this.intervalId = null;
    this.imageManquante = false;

    // Si une frame ne charge pas (assets pas encore fournis), on bascule sur le repli
    // une seule fois plutôt que de tenter frame après frame.
    this.imgEl.addEventListener("error", () => {
      this.imageManquante = true;
      this._basculerVersRepli();
    });
  }

  _basculerVersRepli() {
    if (this.fallbackEl) {
      this.imgEl.style.display = "none";
      this.fallbackEl.style.display = "flex";
    }
  }

  _basculerVersImage() {
    if (this.fallbackEl) {
      this.imgEl.style.display = "block";
      this.fallbackEl.style.display = "none";
    }
  }

  definirPersonnage(characterId) {
    this.characterId = characterId;
    this.imageManquante = false;
    this.imgEl.style.setProperty("--echelle-sprite", echelleSprite(characterId));
    this.imgEl.style.setProperty("--decalage-y-sprite", decalageYSprite(characterId));
    this._basculerVersImage();
  }

  jouer(animation) {
    if (!this.characterId) return;
    const reglages = CHARACTER_ANIMATIONS[animation];
    let variante = choisirVariante(this.characterId, animation);
    if (!reglages || !variante) return;

    this.arreter();
    this.animationCourante = animation;
    this.frameIndex = 0;
    // Rebond CSS qui accompagne l'animation pour certains personnages (voir `rebond` dans la config).
    this.imgEl.classList.toggle("glisse", aRebond(this.characterId, animation));

    const dessinerFrame = () => {
      if (this.imageManquante) return;
      this.frameIndex += 1;

      if (this.frameIndex > variante.frames) {
        if (!reglages.loop) {
          this.arreter();
          // Les images de "saut" montrent le personnage déjà en l'air, à hauteur constante :
          // sans retour immédiat à l'attente, il resterait suspendu sur la dernière image.
          if (reglages.retourIdle) this.jouer("idle");
          return;
        }
        // Une boucle qui redémarre est l'occasion de retirer au sort une nouvelle
        // variante (ex. clin d'œil occasionnel), plutôt que de rester figé sur celle
        // tirée au tout début tant que l'animation ne change pas.
        variante = choisirVariante(this.characterId, animation);
        this.frameIndex = 1;
      }

      this.imgEl.src = cheminSprite(this.characterId, animation, variante.index, this.frameIndex);
    };

    dessinerFrame();
    // Une variante peut imposer sa propre vitesse (ex. une danse plus lente qu'un saut).
    this.intervalId = setInterval(dessinerFrame, 1000 / (variante.fps || reglages.fps));
  }

  arreter() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.imgEl.classList.remove("glisse");
  }
}
