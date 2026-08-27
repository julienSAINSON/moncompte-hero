const CACHE_NAME = "moncompte-hero-v67";
const APP_SHELL = [
    "./",
    "index.html",
    "style.css",
    "manifest.webmanifest",
    "assets/icons/icon.svg",
    "js/audio.js",
    "js/chart.js",
    "js/note.js",
    "js/score.js",
    "js/input.js",
    "js/renderer.js",
    "js/battle.js",
    "js/song-menu.js",
    "js/recording.js",
    "js/game.js",
    "assets/songs/manifest.json",
    "assets/songs/saisis-ton-sciforma/chart.json",
    "assets/songs/saisis-ton-sciforma/music.mp3"
];

self.addEventListener("install", (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
    );
    self.skipWaiting();
});

self.addEventListener("activate", (event) => {
    event.waitUntil(
        caches.keys().then((keys) => Promise.all(
            keys
                .filter((key) => key !== CACHE_NAME)
                .map((key) => caches.delete(key))
        ))
    );
    self.clients.claim();
});

self.addEventListener("fetch", (event) => {
    if (event.request.method !== "GET") {
        return;
    }

    const url = new URL(event.request.url);

    if (url.origin !== self.location.origin) {
        return;
    }

    // En dev, les partitions et le manifest de chansons changent souvent:
    // on privilegie le reseau pour eviter de rejouer une ancienne version.
    if (
        url.pathname.endsWith("/assets/songs/manifest.json") ||
        /\/assets\/songs\/[^/]+\/chart\.json$/.test(url.pathname)
    ) {
        event.respondWith(networkFirst(event.request));
        return;
    }

    event.respondWith(cacheFirst(event.request));
});

async function networkFirst(request) {
    try {
        const response = await fetch(request);
        const cache = await caches.open(CACHE_NAME);
        cache.put(request, response.clone());
        return response;
    } catch (_) {
        const cachedResponse = await caches.match(request);
        return cachedResponse || Response.error();
    }
}

async function cacheFirst(request) {
    const cachedResponse = await caches.match(request);

    if (cachedResponse) {
        return cachedResponse;
    }

    const response = await fetch(request);

    if (response.ok) {
        const cache = await caches.open(CACHE_NAME);
        cache.put(request, response.clone());
    }

    return response;
}