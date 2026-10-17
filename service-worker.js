// service-worker.js — Cache-first, résilient aux assets manquants (personnages/fonds pas
// encore fournis). Volontairement en script classique (pas de "type: module") : le support
// des service workers ES modules reste inégal sur Safari iOS.
//
// Duplication assumée : les identifiants ci-dessous reprennent characters.config.js et
// backgrounds.config.js. En modifier un, penser à répercuter ici et à incrémenter CACHE_NAME.

const CACHE_NAME = "studeo-cache-v86";

const CHARACTER_ANIMATIONS_FRAMES = {
  tanuki: { idle: [12], walk: [12, 12], jump: [8], hurt: [6, 10] },
  chicken: { idle: [11, 12], walk: [12], jump: [8], hurt: [6, 10] },
  beary: { idle: [12, 12], walk: [12, 12], jump: [8, 5], hurt: [6, 10] },
  ducky: { idle: [12, 12], walk: [12], jump: [8], hurt: [6, 10] },
  penguin: { idle: [12, 12], walk: [12], jump: [8], hurt: [6, 10] },
  piggy: { idle: [12, 12, 12], walk: [12, 12], jump: [8], hurt: [6, 10] },
  catty: { idle: [12, 12], walk: [12, 12], jump: [12], hurt: [6, 10] },
  bunny: { idle: [12, 12], walk: [12, 12], jump: [12], hurt: [6, 10] },
  "deer-deer": { idle: [12, 12], walk: [12, 12], jump: [8], hurt: [6, 10] },
  bones: { idle: [12], walk: [12], jump: [8], hurt: [10] },
  zombie: { idle: [12], walk: [12], jump: [8], hurt: [10] },
  slime: { idle: [12], walk: [10], jump: [10], hurt: [6] }
};
const BACKGROUND_IDS = Array.from({ length: 20 }, (_, i) => `bg${String(i + 2).padStart(2, "0")}`);
// Visuels des badges : un par mascotte (voir badges.config.js). Ils ne sont pas encore déployés (droits
// d'auteur à régler, CLAUDE.md §5.53) : le précache résilient ignore simplement leur absence.
const BADGE_IDS = Object.keys(CHARACTER_ANIMATIONS_FRAMES);

const FICHIERS_COQUILLE = [
  "./",
  "./index.html",
  "./manifest.json",
  "./css/style.css",
  "./js/app.js",
  "./js/appShell.js",
  "./js/audioEngine.js",
  "./js/backgrounds.config.js",
  "./js/badgeEngine.js",
  "./js/badges.config.js",
  "./js/cartableEngine.js",
  "./js/characterEngine.js",
  "./js/characters.config.js",
  "./js/dataStore.js",
  "./js/icons.js",
  "./js/installPrompt.js",
  "./js/navigation.js",
  "./js/mascotteTexte.js",
  "./js/miseAJourMots.js",
  "./js/overlays.js",
  "./js/quizEngine.js",
  "./js/rewardEngine.js",
  "./js/router.js",
  "./js/sacEffets.js",
  "./js/sacOverlays.js",
  "./js/sons.js",
  "./js/spriteAnimator.js",
  "./js/themeEngine.js",
  "./js/uiRenderer.js",
  "./js/vieMascottes.js",
  "./js/words.seed.js",
  "./js/views/accueilView.js",
  "./js/views/mesMotsView.js",
  "./js/views/albumView.js",
  "./js/views/sacView.js",
  "./js/views/sessionView.js",
  "./assets/sac-a-etoiles.png",
  "./assets/icons/icon-192.png",
  "./assets/icons/icon-512.png",
  "./assets/icons/icon-maskable-512.png",
  "./assets/fonts/baloo2-latin.woff2",
  "./assets/fonts/nunito-latin.woff2"
];

function cheminsSprites() {
  const chemins = [];
  for (const [id, animations] of Object.entries(CHARACTER_ANIMATIONS_FRAMES)) {
    for (const [animation, variantes] of Object.entries(animations)) {
      variantes.forEach((frameCount, variantIndex) => {
        for (let i = 1; i <= frameCount; i++) {
          chemins.push(`./assets/characters/${id}/${animation}/v${variantIndex + 1}/frame-${String(i).padStart(2, "0")}.png`);
        }
      });
    }
  }
  return chemins;
}

function cheminsFonds() {
  return BACKGROUND_IDS.map((id) => `./assets/backgrounds/${id}.webp`);
}

function cheminsBadges() {
  return BADGE_IDS.map((id) => `./assets/badges/${id}.png`);
}

// Met en cache chaque ressource indépendamment : une image pas encore fournie (404) ne fait
// jamais échouer l'installation du service worker ni le cache des autres fichiers.
//
// `forcerReseau` : ignore le cache HTTP du navigateur. GitHub Pages sert les fichiers avec
// "Cache-Control: max-age=600" : sans cela, une mise à jour installée dans les 10 minutes suivant
// la dernière visite recopiait dans le nouveau cache les ANCIENS fichiers (CSS/JS) encore dans le
// cache HTTP, et l'appareil restait sur l'ancienne version.
async function precacherResilient(cache, urls, { forcerReseau = false } = {}) {
  await Promise.allSettled(
    urls.map(async (url) => {
      try {
        const reponse = await fetch(url, forcerReseau ? { cache: "reload" } : undefined);
        if (reponse.ok) await cache.put(url, reponse);
      } catch (erreur) {
        // Asset absent pour l'instant (pack pas encore fourni) : on l'ignore silencieusement,
        // l'app utilisera son repli visuel (voir spriteAnimator.js / themeEngine.js).
      }
    })
  );
}

self.addEventListener("install", (evenement) => {
  evenement.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      await precacherResilient(cache, FICHIERS_COQUILLE, { forcerReseau: true });
      await precacherResilient(cache, cheminsSprites());
      await precacherResilient(cache, cheminsFonds());
      await precacherResilient(cache, cheminsBadges());
      self.skipWaiting();
    })()
  );
});

self.addEventListener("activate", (evenement) => {
  evenement.waitUntil(
    (async () => {
      const noms = await caches.keys();
      await Promise.all(noms.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n)));
      self.clients.claim();
    })()
  );
});

self.addEventListener("fetch", (evenement) => {
  if (evenement.request.method !== "GET") return;

  // « Mettre à jour la liste de mots » (miseAJourMots.js) : le fichier est redemandé avec `?maj=…`. Ces requêtes
  // vont toujours au réseau (jamais servies par le cache, jamais mises en cache) : sinon l'app répondrait « déjà
  // à jour » avec l'ancienne liste. Hors connexion, la requête échoue et l'app l'annonce.
  if (new URL(evenement.request.url).searchParams.has("maj")) {
    evenement.respondWith(fetch(evenement.request, { cache: "no-store" }));
    return;
  }

  evenement.respondWith(
    (async () => {
      const enCache = await caches.match(evenement.request);
      if (enCache) return enCache;

      try {
        const reponseReseau = await fetch(evenement.request);
        if (reponseReseau.ok) {
          const cache = await caches.open(CACHE_NAME);
          cache.put(evenement.request, reponseReseau.clone());
        }
        return reponseReseau;
      } catch (erreur) {
        // Hors-ligne et pas en cache : rien de mieux à renvoyer pour un asset non essentiel.
        return new Response("", { status: 504, statusText: "Hors ligne" });
      }
    })()
  );
});
