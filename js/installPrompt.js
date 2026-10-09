// installPrompt.js — Unique responsabilité : proposer l'ajout à l'écran d'accueil, avec le
// bon mécanisme selon la plateforme (Android sait le déclencher, iOS doit être guidé).

let evenementInstallDiffere = null;

function estIOS() {
  return /iPhone|iPad|iPod/.test(navigator.userAgent) && !window.MSStream;
}

function dejaInstallee() {
  return window.matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;
}

export function init({ onAndroidInstallable, onIOSInstructions }) {
  if (dejaInstallee()) return;

  window.addEventListener("beforeinstallprompt", (evenement) => {
    evenement.preventDefault();
    evenementInstallDiffere = evenement;
    if (onAndroidInstallable) onAndroidInstallable();
  });

  if (estIOS() && onIOSInstructions) {
    onIOSInstructions();
  }
}

export async function declencherInstallationAndroid() {
  if (!evenementInstallDiffere) return false;
  evenementInstallDiffere.prompt();
  const { outcome } = await evenementInstallDiffere.userChoice;
  evenementInstallDiffere = null;
  return outcome === "accepted";
}
