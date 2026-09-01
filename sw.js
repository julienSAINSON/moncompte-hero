const CACHE_NAME = "moncompte-hero-v99";
const APP_SHELL = [
    "./",
    "index.html",
    "style.css",
    "manifest.webmanifest",
    "assets/icons/icon.svg",
    "assets/avatars/1.png",
    "assets/avatars/2.png",
    "assets/avatars/3.png",
    "assets/avatars/4.png",
    "assets/avatars/5.png",
    "assets/avatars/6.png",
    "assets/avatars/7.png",
    "assets/avatars/8.png",
    "assets/avatars/9.png",
    "assets/avatars/10.png",
    "assets/avatars/11.png",
    "assets/avatars/12.png",
    "assets/avatars/13.png",
    "assets/avatars/14.png",
    "assets/avatars/15.png",
    "assets/avatars/16.png",
    "assets/avatars/17.png",
    "assets/avatars/18.png",
    "assets/avatars/19.png",
    "assets/avatars/20.png",
    "assets/avatars/21.png",
    "assets/avatars/22.png",
    "assets/avatars/23.png",
    "assets/avatars/24.png",
    "assets/avatars/25.png",
    "assets/avatars/26.png",
    "assets/avatars/27.png",
    "assets/avatars/28.png",
    "assets/avatars/29.png",
    "assets/avatars/30.png",
    "assets/avatars/31.png",
    "assets/avatars/32.png",
    "assets/avatars/33.png",
    "assets/avatars/34.png",
    "assets/avatars/35.png",
    "assets/avatars/36.png",
    "assets/avatars/37.png",
    "assets/avatars/38.png",
    "assets/avatars/39.png",
    "assets/avatars/40.png",
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
    "assets/songs/saisis-ton-sciforma/charts/normal.json",
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