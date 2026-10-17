// sacOverlays.js — Unique responsabilité : les fenêtres de « Mon Sac » (remplir d'étoiles, retirer, code
// parent du cartable, nouvel objectif), décision §5.55. Aucune écriture de données : chaque fenêtre rend
// la main à la vue par un callback. Le voile ne couvre que ce qui est sous la carte de la mascotte, qui
// reste claire et PARLE pendant la fenêtre (phrases fournies par `contexte.parler`).

import * as appShell from "./appShell.js";
import * as icons from "./icons.js";
import * as sons from "./sons.js";
import * as characterEngine from "./characterEngine.js";
import { plafondVersement, dureeEstimee } from "./cartableEngine.js";
import { CARTABLE_MAX_ETOILES, CARTABLE_LIBELLE_MAX } from "./dataStore.js";
import { PHRASES_SAC, phraseSacCode } from "./mascotteTexte.js";

// 2ᵉ code parent, propre au cartable (option C, décision du 2026-10-17) : distinct du code de réglage du
// solde. En dur comme lui (pas une vraie protection : un frein pour un enfant de 10 ans).
const CODE_CARTABLE = "3783";

// contexte : { sousElement, parler(texte), revenir() }.
function ouvrirVoile(html, position, contexte) {
  return appShell.montrerVoile(html, { position, sousElement: contexte.sousElement, surFermeture: contexte.revenir });
}

// Ferme la fenêtre parce qu'une action a été confirmée : la vue parle ensuite elle-même (pas de retour à la
// phrase habituelle qui écraserait sa phrase).
function fermerApresAction(voile) {
  voile._surFermeture = null;
  appShell.fermerVoile(voile);
}

// ---------- Remplir d'étoiles ----------
// onConfirmer(n) : n étoiles à verser (jamais plus que le plafond, calculé ici).
export function ouvrirRemplir({ objectif, solde, contexte, onConfirmer }) {
  const plafond = plafondVersement(objectif, solde);
  if (plafond <= 0) return;
  let valeur = 1;

  const voile = ouvrirVoile(`
    <div class="feuille" role="dialog" aria-labelledby="remplir-titre">
      <div class="poignee"></div>
      <div class="boite-dialogue-titre" id="remplir-titre" style="text-align:left;margin-bottom:4px;">Remplir d'étoiles</div>
      <div class="sous-titre-feuille" data-role="libelle"></div>
      <div class="stepper">
        <button type="button" data-role="moins" data-sans-tap aria-label="Moins">−</button>
        <div class="valeur" data-role="valeur" aria-live="polite">1</div>
        <button type="button" data-role="plus" data-sans-tap aria-label="Plus">+</button>
      </div>
      <button type="button" class="bouton-cta principal" data-role="ok" data-sans-tap style="width:100%;justify-content:center;">
        <span class="font-display">Remplir</span>
      </button>
    </div>
  `, "bas", contexte);

  voile.querySelector('[data-role="libelle"]').textContent = objectif.libelle;
  contexte.parler(PHRASES_SAC.remplir);

  const moins = voile.querySelector('[data-role="moins"]');
  const plus = voile.querySelector('[data-role="plus"]');
  const afficher = () => {
    voile.querySelector('[data-role="valeur"]').textContent = valeur;
    moins.disabled = valeur <= 1;
    plus.disabled = valeur >= plafond;
  };
  afficher();

  // Un tap = un pas ; un appui long répète en accélérant. Chaque pas monte d'un demi-ton.
  const brancherPas = (bouton, delta) => {
    let attente = null;
    let boucle = null;
    let pas = 0;
    const faire = () => {
      const suivante = Math.max(1, Math.min(plafond, valeur + delta));
      if (suivante === valeur) return false;
      valeur = suivante;
      afficher();
      sons.pasStepper(valeur);
      return true;
    };
    const arreter = () => { clearTimeout(attente); clearTimeout(boucle); };
    const repeter = () => {
      if (!faire()) return;
      pas += 1;
      boucle = setTimeout(repeter, pas > 8 ? 55 : pas > 3 ? 90 : 140);
    };
    bouton.addEventListener("pointerdown", (evenement) => {
      evenement.preventDefault();
      if (bouton.disabled) return;
      faire();
      attente = setTimeout(repeter, 380);
    });
    ["pointerup", "pointerleave", "pointercancel"].forEach((nom) => bouton.addEventListener(nom, arreter));
  };
  brancherPas(moins, -1);
  brancherPas(plus, +1);

  voile.querySelector('[data-role="ok"]').addEventListener("click", () => {
    fermerApresAction(voile);
    onConfirmer(valeur);
  });
}

// ---------- Retirer du cartable ----------
export function ouvrirRetirer({ objectif, contexte, onConfirmer }) {
  const voile = ouvrirVoile(`
    <div class="boite-dialogue" role="alertdialog" aria-labelledby="retirer-titre">
      <div class="boite-dialogue-icone">${icons.iconeRetirer()}</div>
      <div class="boite-dialogue-titre" id="retirer-titre">Retirer du cartable ?</div>
      <div class="boite-dialogue-message" data-role="message"></div>
      <div class="boite-dialogue-actions">
        <button type="button" class="bouton-dialogue annuler" data-role="annuler">Annuler</button>
        <button type="button" class="bouton-dialogue confirmer-danger" data-role="ok" data-sans-tap>Retirer</button>
      </div>
    </div>
  `, "centre", contexte);

  voile.querySelector('[data-role="message"]').textContent = `Vider complètement « ${objectif.libelle} » du cartable.`;
  contexte.parler(PHRASES_SAC.confirmerRetrait);

  voile.querySelector('[data-role="annuler"]').addEventListener("click", () => appShell.fermerVoile(voile));
  voile.querySelector('[data-role="ok"]').addEventListener("click", () => {
    fermerApresAction(voile);
    onConfirmer();
  });
}

// ---------- Code parent du cartable ----------
// Sert à valider un objectif plein et à en créer un. `message` dit pourquoi le code est demandé.
export function ouvrirCode({ message, contexte, onOk }) {
  const voile = ouvrirVoile(`
    <div class="boite-dialogue" role="dialog" aria-labelledby="code-sac-titre">
      <div class="boite-dialogue-icone achat">${icons.iconeCadenas()}</div>
      <div class="boite-dialogue-titre" id="code-sac-titre">Code parent</div>
      <div class="boite-dialogue-message" data-role="message" style="margin-bottom:14px;"></div>
      <div class="champ-formulaire champ-code">
        <label for="champ-code-sac" class="visually-hidden">Code secret</label>
        <input id="champ-code-sac" type="tel" inputmode="numeric" autocomplete="off" placeholder="Code secret">
      </div>
      <div class="boite-dialogue-actions">
        <button type="button" class="bouton-dialogue annuler" data-role="annuler">Annuler</button>
        <button type="button" class="bouton-dialogue confirmer" data-role="ok" data-sans-tap>Valider</button>
      </div>
    </div>
  `, "centre", contexte);

  voile.querySelector('[data-role="message"]').textContent = message;
  contexte.parler(phraseSacCode());

  const champ = voile.querySelector("input");
  champ.focus();
  sons.brancherFrappe(champ);

  const valider = () => {
    if (champ.value.trim() === CODE_CARTABLE) {
      fermerApresAction(voile);
      onOk();
      return;
    }
    champ.value = "";
    champ.classList.remove("secoue");
    void champ.offsetWidth;
    champ.classList.add("secoue");
    sons.mauvaiseReponse();
    characterEngine.jouerAnimation("hurt");
    setTimeout(() => characterEngine.jouerAnimation("idle"), 900);
    contexte.parler(PHRASES_SAC.codeFaux);
  };
  voile.querySelector('[data-role="ok"]').addEventListener("click", valider);
  champ.addEventListener("keydown", (evenement) => { if (evenement.key === "Enter") valider(); });
  voile.querySelector('[data-role="annuler"]').addEventListener("click", () => appShell.fermerVoile(voile));
}

// ---------- Nouvel objectif ----------
// dernierRetire : { libelle, cout } ou null (« Recréer » le propose). onAjouter(libelle, cout) est appelée
// avec des valeurs déjà contrôlées (libellé non vide, nombre entier de 1 à 150).
export function ouvrirFormulaire({ dernierRetire, contexte, onAjouter }) {
  const voile = ouvrirVoile(`
    <div class="feuille" role="dialog" aria-labelledby="objectif-titre">
      <div class="poignee"></div>
      <div class="boite-dialogue-titre" id="objectif-titre" style="text-align:left;margin-bottom:14px;">Nouvel objectif du cartable</div>
      ${dernierRetire ? `<button type="button" class="suggestion" data-role="recreer" data-sans-tap>${icons.iconeRecreer()}<span data-role="recreer-texte"></span>${icons.iconeEtoile()}<span data-role="recreer-cout"></span></button>` : ""}
      <form id="form-objectif" novalidate>
        <div class="champ-formulaire">
          <label for="champ-objectif">Objectif</label>
          <input id="champ-objectif" type="text" lang="fr" maxlength="${CARTABLE_LIBELLE_MAX}" autocomplete="off" spellcheck="true" placeholder="Par exemple : aller à la boutique de bonbons">
        </div>
        <div class="champ-formulaire">
          <label for="champ-cout">Nombre d'étoiles à mettre dans le cartable</label>
          <input id="champ-cout" type="number" min="1" max="${CARTABLE_MAX_ETOILES}" step="1" inputmode="numeric" autocomplete="off">
        </div>
        <div class="indication" data-role="indication"></div>
        <div class="erreur-formulaire" data-role="erreur" role="alert"></div>
        <button type="submit" class="bouton-cta principal" data-role="ok" style="width:100%;justify-content:center;">Annuler</button>
      </form>
    </div>
  `, "bas", contexte);

  contexte.parler(PHRASES_SAC.creer);

  const champLibelle = voile.querySelector("#champ-objectif");
  const champCout = voile.querySelector("#champ-cout");
  const bouton = voile.querySelector('[data-role="ok"]');
  const indication = voile.querySelector('[data-role="indication"]');
  const erreur = voile.querySelector('[data-role="erreur"]');
  sons.brancherFrappe(champLibelle);
  sons.brancherFrappe(champCout);

  // Comme pour les mots (§5.46) : deux champs vides + valider = annuler, et le bouton le dit.
  const majEtat = () => {
    const cout = parseInt(champCout.value, 10);
    bouton.textContent = champLibelle.value.trim() === "" && champCout.value === "" ? "Annuler" : "Ajouter";
    indication.innerHTML = cout >= 1 ? `${icons.iconeHorloge()}<span>${dureeEstimee(Math.min(cout, CARTABLE_MAX_ETOILES))}</span>` : "";
    erreur.textContent = "";
  };
  champLibelle.addEventListener("input", majEtat);
  champCout.addEventListener("input", majEtat);

  if (dernierRetire) {
    voile.querySelector('[data-role="recreer-texte"]').textContent = `Recréer « ${dernierRetire.libelle} »`;
    voile.querySelector('[data-role="recreer-cout"]').textContent = dernierRetire.cout;
    voile.querySelector('[data-role="recreer"]').addEventListener("click", () => {
      champLibelle.value = dernierRetire.libelle;
      champCout.value = dernierRetire.cout;
      majEtat();
    });
  }

  voile.querySelector("#form-objectif").addEventListener("submit", (evenement) => {
    evenement.preventDefault();
    const libelle = champLibelle.value.trim();
    const cout = parseInt(champCout.value, 10);
    if (libelle === "" && champCout.value === "") { appShell.fermerVoile(voile); return; }
    if (libelle === "") { erreur.textContent = "Il faut un objectif."; champLibelle.focus(); return; }
    if (!(cout >= 1 && cout <= CARTABLE_MAX_ETOILES)) {
      erreur.textContent = `Entre un nombre d'étoiles de 1 à ${CARTABLE_MAX_ETOILES}.`;
      champCout.focus();
      return;
    }
    fermerApresAction(voile);
    onAjouter(libelle, cout);
  });
}
