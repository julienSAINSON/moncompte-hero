//====================================================
// song-menu.js - Gestion du menu de selection des morceaux
//====================================================

class SongMenu {

    constructor(options) {

        this.overlay = options.overlay;
        this.listEl = options.listEl;
        this.infoEl = options.infoEl;
        this.onSelect = options.onSelect;

        this.songs = null;

    }

    async ensureSongsLoaded() {

        if (Array.isArray(this.songs)) {
            return true;
        }

        try {
            const response = await fetch("assets/songs/manifest.json", {
                cache: "no-store"
            });

            if (!response.ok) {
                throw new Error("Manifest inaccessible");
            }

            const manifest = await response.json();

            // Compatibilite: ancien format [{...}] et nouveau format { songs: [...] }
            const songs = Array.isArray(manifest)
                ? manifest
                : manifest?.songs;

            if (!Array.isArray(songs)) {
                throw new Error("Manifest invalide");
            }

            this.songs = songs;
            return true;
        } catch (error) {
            console.warn("Impossible de charger le manifest des chansons", error);
            return false;
        }

    }

    async resolveSongById(songId) {

        const loaded = await this.ensureSongsLoaded();

        if (!loaded) {
            return null;
        }

        return this.songs.find((song) => song.id === songId) || null;

    }

    async resolveDefaultSong() {

        const loaded = await this.ensureSongsLoaded();

        if (!loaded) {
            return null;
        }

        return this.songs.find((song) => song.default === true) || null;

    }

    getAvailableDifficulties(song) {

        if (song?.charts && typeof song.charts === "object") {
            return Object.keys(song.charts);
        }

        return song?.chart ? ["normal"] : [];

    }

    resolveDifficulty(song, requestedDifficulty = null) {

        const difficulties = this.getAvailableDifficulties(song);

        if (requestedDifficulty && difficulties.includes(requestedDifficulty)) {
            return requestedDifficulty;
        }

        if (
            song?.defaultDifficulty &&
            difficulties.includes(song.defaultDifficulty)
        ) {
            return song.defaultDifficulty;
        }

        return difficulties[0] || null;

    }

    resolveChart(song, requestedDifficulty = null) {

        const difficulty = this.resolveDifficulty(song, requestedDifficulty);

        if (!difficulty) {
            return null;
        }

        return {
            difficulty,
            path: song.charts?.[difficulty] || song.chart
        };

    }

    async open(currentSongId = null) {

        const loaded = await this.ensureSongsLoaded();

        if (!loaded) {
            alert("Impossible de charger la liste des chansons.");
            return;
        }

        this.render(currentSongId);
        this.overlay.classList.remove("hidden");

    }

    close() {
        this.overlay.classList.add("hidden");
    }

    render(currentSongId = null) {

        this.listEl.innerHTML = "";

        this.songs.forEach((song) => {
            const item = document.createElement("li");
            const button = document.createElement("button");
            button.type = "button";
            button.className = "songListItem";

            if (song.id === currentSongId) {
                button.classList.add("selected");
            }

            button.innerHTML = "<strong>" + song.title + "</strong>";

            if (song.artist) {
                const artist = document.createElement("span");
                artist.textContent = song.artist;
                button.appendChild(artist);
            }

            button.addEventListener("click", () => this.select(song));
            item.appendChild(button);
            this.listEl.appendChild(item);
        });

    }

    select(song) {

        this.onSelect(song);

        this.infoEl.textContent =
            "Musique selectionnee : " + song.title;

        this.close();

    }

}

window.SongMenu = SongMenu;
