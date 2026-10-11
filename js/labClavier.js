// labClavier.js — TEMPORAIRE (à supprimer une fois le bon correctif trouvé, comme le laboratoire d'affichage
// du §5.44). Sur iPhone en mode application, l'apparition du clavier fait remonter toute la page (≈ 60 pt :
// le bouton ✕ passe sous l'heure). Ce module propose, au choix depuis le menu ⋮ (ligne grise du bas), plusieurs
// correctifs candidats appliqués à chaud, et affiche une ligne de mesures en direct près du haut de l'écran.
//
//   mode 0 : comportement actuel
//   mode 1 : défilement du document bloqué (overflow: hidden sur html et body)
//   mode 2 : mode 1 + le document est remis en haut (scrollTo 0,0) dès que le clavier ou le focus le déplace
//   mode 3 : la coquille est décalée de ce dont iOS a fait glisser la page (visualViewport.pageTop), pour que
//            tout reste visuellement à sa place
//   mode 4 : body en position fixe + overflow bloqué

const NOMS = ["actuel", "document bloqué", "bloqué + remis en haut", "coquille compensée", "body fixe"];
const MODES = NOMS.length;

let mode = 0;
let lecture = null;
let nettoyages = [];

function mesures() {
  const vv = window.visualViewport;
  const racine = document.documentElement;
  return [
    `m${mode}`,
    `ih ${window.innerHeight}`,
    vv ? `vv ${Math.round(vv.height)}` : "vv -",
    vv ? `top ${Math.round(vv.offsetTop)}` : "top -",
    vv ? `pt ${Math.round(vv.pageTop)}` : "pt -",
    `sy ${Math.round(window.scrollY)}`,
    `sh ${racine.scrollHeight}`
  ].join(" · ");
}

function majLecture() {
  if (lecture) lecture.textContent = mesures();
}

function creerLecture() {
  if (lecture && lecture.isConnected) return;
  lecture = document.createElement("div");
  lecture.id = "lab-clavier-lecture";
  lecture.style.cssText = [
    "position:fixed", "left:50%", "top:50px", "transform:translateX(-50%)", "z-index:99999",
    "background:rgba(255,255,255,0.92)", "color:#4A3439", "font:700 10px/1.2 monospace",
    "padding:3px 8px", "border-radius:999px", "pointer-events:none", "white-space:nowrap"
  ].join(";");
  document.body.appendChild(lecture);
}

function ecouter(cible, evenement, fonction) {
  cible.addEventListener(evenement, fonction);
  nettoyages.push(() => cible.removeEventListener(evenement, fonction));
}

function appliquer() {
  nettoyages.forEach((f) => f());
  nettoyages = [];

  const racine = document.documentElement;
  const coquille = document.getElementById("app-shell");
  racine.dataset.labClavier = String(mode);
  if (coquille) coquille.style.transform = "";
  creerLecture();

  const vv = window.visualViewport;
  if (vv) {
    ecouter(vv, "resize", majLecture);
    ecouter(vv, "scroll", majLecture);
  }
  ecouter(window, "scroll", majLecture);
  ecouter(document, "focusin", () => { majLecture(); setTimeout(majLecture, 400); });
  ecouter(document, "focusout", () => setTimeout(majLecture, 400));

  if (mode === 2) {
    const remonter = () => { if (window.scrollY !== 0 || window.pageYOffset !== 0) window.scrollTo(0, 0); };
    if (vv) { ecouter(vv, "resize", remonter); ecouter(vv, "scroll", remonter); }
    ecouter(window, "scroll", remonter);
    ecouter(document, "focusin", () => { [0, 60, 200, 450].forEach((d) => setTimeout(remonter, d)); });
  }

  if (mode === 3 && vv && coquille) {
    const compenser = () => { coquille.style.transform = `translateY(${vv.pageTop}px)`; majLecture(); };
    ecouter(vv, "resize", compenser);
    ecouter(vv, "scroll", compenser);
    ecouter(window, "scroll", compenser);
    ecouter(document, "focusin", () => { [0, 60, 200, 450].forEach((d) => setTimeout(compenser, d)); });
    compenser();
  }

  majLecture();
}

export function libelle() {
  return `Lab clavier : mode ${mode} (${NOMS[mode]})`;
}

// Passe au mode suivant et renvoie le libellé à afficher.
export function suivant() {
  mode = (mode + 1) % MODES;
  appliquer();
  return libelle();
}
