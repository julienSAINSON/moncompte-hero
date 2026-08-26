//====================================================
// game.js - Partie 1
//====================================================

const DEFAULT_PLAY_MP3 = "assets/default/saisis ton sciforma.mp3";
const DEFAULT_PLAY_CHART = "assets/default/partition.json";
const MAX_CONSECUTIVE_MISSES = 5;
const MIN_HOLD_DURATION = 0.15;

class Game {

    constructor() {

        window.game = this;

        this.notes = [];

        this.running = false;

        this.maxConsecutiveMisses = MAX_CONSECUTIVE_MISSES;

        this.animationFrame = null;
        this.countdownTimer = null;
        this.isCountdownActive = false;
        this.preRollEndsAt = null;
        this.preRollDuration = 0;

        this.countdownElement =
            document.getElementById("countdown");

        this.playfield =
            document.getElementById("playfield");

        this.playButton =
            document.getElementById("playButton");

        this.menuButton =
            document.getElementById("menuButton");

        this.songListOverlay =
            document.getElementById("songListOverlay");

        this.songListEl =
            document.getElementById("songList");

        this.closeSongListButton =
            document.getElementById("closeSongListButton");

        this.selectedSongInfo =
            document.getElementById("selectedSongInfo");

        this.selectedSong = null;
        this.songs = [];

        this.modeSelector =
            document.getElementById("modeSelector");

        this.modePlayButton =
            document.getElementById("modePlayButton");

        this.modeEditionButton =
            document.getElementById("modeEditionButton");

        this.modeInfo =
            document.getElementById("modeInfo");

        this.editionControls =
            document.getElementById("editionControls");

        this.fileInput =
            document.getElementById("musicFile");

        this.chartFileInput =
            document.getElementById("chartFile");

        this.restartButton =
            document.getElementById("restartButton");

        this.playerNameInput =
            document.getElementById("playerNameInput");

        this.saveScoreButton =
            document.getElementById("saveScoreButton");

        this.saveScoreStatus =
            document.getElementById("saveScoreStatus");

        this.leaderboardList =
            document.getElementById("leaderboardList");

        this.saveScoreButton.addEventListener(
            "click",
            () => this.saveScore()
        );

        this.playButton.addEventListener(
            "click",
            () => this.start()
        );

        this.menuButton.addEventListener(
            "click",
            () => this.openSongList()
        );

        this.closeSongListButton.addEventListener(
            "click",
            () => this.closeSongList()
        );

        this.restartButton.addEventListener(
            "click",
            () => {
                if (this.battleMode) {
                    this.restartBattle();
                    return;
                }
                this.restart();
            }
        );

        this.recordButton =
            document.getElementById("recordButton");

        this.testChartButton =
            document.getElementById("testChartButton");

        this.pauseButton =
            document.getElementById("pauseButton");

        this.stopButton =
            document.getElementById("stopButton");

        this.recordButton.addEventListener(
            "click",
            () => this.startRecording()
        );

        this.testChartButton.addEventListener(
            "click",
            () => this.startCustomPlay()
        );

        this.pauseButton.addEventListener(
            "click",
            () => this.toggleRecordingPause()
        );

        this.stopButton.addEventListener(
            "click",
            () => this.stopRecording()
        );

        this.modePlayButton.addEventListener(
            "click",
            () => this.setAppMode("play")
        );

        this.modeEditionButton.addEventListener(
            "click",
            () => this.setAppMode("edition")
        );

        this.mode = "play"; // play | record
        this.appMode = "play"; // play | edition
        this.recordedNotes = [];
        this.recordingStarts = new Map();
        this.isRecordingPaused = false;

        // Le mode edition n'est visible que via le parametre d'URL ?mode=1
        const urlParams = new URLSearchParams(window.location.search);
        this.developerMode = urlParams.get("mode") === "1";

        // Le mode bataille (2 joueurs) se lance via le parametre d'URL ?mode=2
        this.battleMode = urlParams.get("mode") === "2";

        this.modeSelector.classList.toggle(
            "developerHidden",
            !this.developerMode
        );

        this.modeInfo.classList.toggle(
            "developerHidden",
            !this.developerMode
        );

        if (this.battleMode) {
            this.playButton.textContent = "Start (Bataille)";
            document.getElementById("shareScoreButton")
                .classList.add("hidden");
        } else {
            // en mode 0/1, la selection via le menu "Musiques" est reservee au mode bataille :
            // on charge directement la musique par defaut, comme avant l'ajout du menu.
            this.selectedSong = {
                id: "default",
                title: "Musique par defaut",
                folder: "assets/default",
                music: "saisis ton sciforma.mp3",
                chart: "partition.json"
            };
        }

        this.setAppMode("play");

    }

    setAppMode(mode) {

        this.appMode = mode;

        const isPlayMode = mode === "play";

        this.modePlayButton.classList.toggle(
            "active",
            isPlayMode
        );

        this.modeEditionButton.classList.toggle(
            "active",
            !isPlayMode
        );

        this.editionControls.classList.toggle(
            "hidden",
            isPlayMode
        );

        this.updateRecordingControls();

        this.modeInfo.textContent = isPlayMode
            ? "Mode Play : chargement automatique des fichiers par defaut."
            : "Mode Edition : choisis un MP3 puis appuie sur Demarrer l'edition pour generer le JSON.";

        this.updatePlaySelectionUI();

        this.restart();

    }

    //--------------------------------------------------
    // Selection d'une musique (menu)
    //--------------------------------------------------

    updatePlaySelectionUI() {

        if (!this.battleMode && this.appMode !== "play") {
            this.menuButton.classList.add("hidden");
            this.playButton.classList.add("hidden");
            this.selectedSongInfo.classList.add("hidden");
            return;
        }

        const hasSong = !!this.selectedSong;

        // le bouton "Musiques" n'est propose qu'en mode bataille
        this.menuButton.classList.toggle("hidden", !this.battleMode);
        this.playButton.classList.toggle("hidden", !hasSong);
        this.selectedSongInfo.classList.toggle("hidden", !hasSong || !this.battleMode);

    }

    async openSongList() {

        if (this.songs.length === 0) {

            try {

                const response = await fetch(
                    "assets/songs/manifest.json",
                    { cache: "no-store" }
                );

                this.songs = response.ok ? await response.json() : [];

            } catch (error) {

                console.error(error);
                this.songs = [];

            }

        }

        if (this.songs.length === 0) {
            alert("Aucune musique disponible dans assets/songs/manifest.json");
            return;
        }

        this.renderSongList();
        this.songListOverlay.classList.remove("hidden");

    }

    renderSongList() {

        this.songListEl.innerHTML = "";

        for (const song of this.songs) {

            const item = document.createElement("li");

            const button = document.createElement("button");
            button.type = "button";
            button.className = "songListItem";
            button.textContent = song.title;

            button.classList.toggle(
                "selected",
                this.selectedSong?.id === song.id
            );

            button.addEventListener(
                "click",
                () => this.selectSong(song)
            );

            item.appendChild(button);
            this.songListEl.appendChild(item);

        }

    }

    selectSong(song) {

        this.selectedSong = song;

        this.selectedSongInfo.textContent =
            "Musique selectionnee : " + song.title;

        this.closeSongList();
        this.updatePlaySelectionUI();

    }

    closeSongList() {

        this.songListOverlay.classList.add("hidden");

    }

    //--------------------------------------------------
    // Démarrage
    //--------------------------------------------------

    async start() {

        if (this.battleMode) {
            this.startBattle();
            return;
        }

        if (this.running) {
            return;
        }

        if (!this.selectedSong) {
            return;
        }

        this.mode = "play";

        this.resetRunState();

        // masque les notes des leur creation, avant meme la fin du chargement de l'audio
        this.playfield.classList.add("countdown-active");

        const chartPath =
            encodeURI(this.selectedSong.folder + "/" + this.selectedSong.chart);

        const musicPath =
            encodeURI(this.selectedSong.folder + "/" + this.selectedSong.music);

        let chartLoaded =
            await this.prepareChartFromURL(chartPath);

        if (!chartLoaded) {
            // Secours si fetch() echoue (ex: page ouverte en file://)
            chartLoaded = this.loadDefaultChartData();
        }

        if (!chartLoaded) {
            alert(
                "Impossible de charger la partition selectionnee: " +
                chartPath
            );
            this.playfield.classList.remove("countdown-active");
            return;
        }

        const audioLoaded =
            await audioManager.loadFromURL(musicPath);

        if (!audioLoaded) {
            alert(
                "Impossible de charger le MP3 selectionne: " +
                musicPath
            );
            this.playfield.classList.remove("countdown-active");
            return;
        }

        this.preRollDuration = this.getPreRollDuration();
        this.running = true;

        this.startCountdown(() => this.startPreRoll());
        this.loop();

    }

    async startBattle() {

        if (battleGame.running) {
            return;
        }

        if (!this.selectedSong) {
            return;
        }

        document.getElementById("hud").classList.add("hidden");
        document.getElementById("game").classList.add("hidden");
        document.getElementById("progressContainer").classList.add("hidden");

        renderer.hideEndScreen();

        const chartPath =
            encodeURI(this.selectedSong.folder + "/" + this.selectedSong.chart);

        const musicPath =
            this.selectedSong.folder + "/" + this.selectedSong.music;

        const started = await battleGame.start(chartPath, musicPath);

        if (!started) {
            document.getElementById("hud").classList.remove("hidden");
            document.getElementById("game").classList.remove("hidden");
            document.getElementById("progressContainer")
                .classList.remove("hidden");
        }

    }

    restartBattle() {

        battleGame.reset();

        document.getElementById("battlefield").classList.add("hidden");

        renderer.hideEndScreen();

    }

    startCountdown(onComplete) {

        this.clearCountdown();

        let remaining = 3;
        this.isCountdownActive = true;
        this.playfield.classList.add("countdown-active");
        this.countdownElement.textContent = remaining;
        this.countdownElement.classList.remove("hidden");

        this.countdownTimer = setInterval(() => {

            remaining--;

            if (remaining > 0) {
                this.countdownElement.textContent = remaining;
                return;
            }

            this.clearCountdown();
            onComplete();

        }, 1000);

    }

    clearCountdown() {

        if (this.countdownTimer) {
            clearInterval(this.countdownTimer);
            this.countdownTimer = null;
        }

        this.isCountdownActive = false;
        this.playfield.classList.remove("countdown-active");
        this.countdownElement.classList.add("hidden");

    }

    getPreRollDuration() {

        const firstNote = this.notes[0];

        if (!firstNote) {
            return 0;
        }

        return Math.max(
            0,
            renderer.lookaheadSeconds - firstNote.hitTime
        );

    }

    startPreRoll() {

        if (this.preRollDuration <= 0) {
            audioManager.play();
            return;
        }

        this.preRollEndsAt =
            performance.now() + this.preRollDuration * 1000;

    }

    getGameTime() {

        if (!this.preRollEndsAt) {
            return audioManager.getCurrentTime();
        }

        const remaining = this.preRollEndsAt - performance.now();

        if (remaining > 0) {
            return -remaining / 1000;
        }

        this.preRollEndsAt = null;
        audioManager.play();

        return audioManager.getCurrentTime();

    }



    startRecording() {

        if (this.running) {
            return;
        }

    const file = this.fileInput.files[0];

    if (!file) {

        alert("Choisissez un MP3.");

        return;

    }

    this.mode = "record";

    this.resetRunState();

    this.recordedNotes = [];
    this.recordingStarts.clear();
    this.isRecordingPaused = false;

    audioManager.load(file, true);

    audioManager.play();

    this.running = true;

    this.updateRecordingControls();

    this.loop();

}

    async startCustomPlay() {

        if (this.running) {
            return;
        }

        const musicFile = this.fileInput.files[0];
        const chartFile = this.chartFileInput.files[0];

        if (!musicFile || !chartFile) {
            alert("Choisissez un MP3 et une partition JSON.");
            return;
        }

        let chartData;

        try {
            chartData = JSON.parse(await chartFile.text());
        } catch (_) {
            alert("Le fichier de partition n'est pas un JSON valide.");
            return;
        }

        if (!Array.isArray(chartData.notes)) {
            alert("La partition ne contient aucune liste de notes valide.");
            return;
        }

        this.mode = "play";
        this.resetRunState();
        this.loadChartNotes(chartData);

        audioManager.load(musicFile);
        audioManager.play();

        this.running = true;
        this.updateRecordingControls();
        this.loop();

    }

    updateRecordingControls() {

        const canControlRecording =
            this.mode === "record" && this.running;

        this.pauseButton.disabled = !canControlRecording;
        this.stopButton.disabled = !canControlRecording;
        this.pauseButton.textContent = this.isRecordingPaused
            ? "Reprendre"
            : "Pause";

    }

    toggleRecordingPause() {

        if (this.mode !== "record" || !this.running) {
            return;
        }

        if (this.isRecordingPaused) {
            audioManager.play();
            this.isRecordingPaused = false;
        } else {
            inputManager.releaseAllInputs();
            audioManager.pause();
            this.isRecordingPaused = true;
        }

        this.updateRecordingControls();

    }

    stopRecording() {

        if (this.mode !== "record" || !this.running) {
            return;
        }

        inputManager.releaseAllInputs();
        this.running = false;
        this.isRecordingPaused = false;

        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
        }

        audioManager.stop();
        this.downloadChart();
        this.updateRecordingControls();

        renderer.showEndScreen(
            "Edition arretee",
            "La partition incomplete a ete telechargee."
        );

    }

    //--------------------------------------------------
    // Génération des notes
    //--------------------------------------------------

    loadDefaultChartData() {

        if (!window.DEFAULT_PLAY_CHART_DATA) {
            return false;
        }

        this.loadChartNotes(
            window.DEFAULT_PLAY_CHART_DATA
        );

        return true;

    }

    async prepareChartFromURL(path) {

        try {

            const response = await fetch(path, {
                cache: "no-store"
            });

            if (!response.ok) {
                return false;
            }

            const json =
                await response.json();

            this.loadChartNotes(json);

            return true;

        } catch (error) {

            console.error(error);

            return false;

        }

    }

    loadChartNotes(json) {

        chart.loadFromJSON(json);

        this.notes = [];

        for (const n of chart.getNotes()) {

            this.notes.push(
                new Note(
                    n.lane,
                    n.hitTime,
                    n.holdDuration,
                    n.toLane
                )
            );

        }

    }

    resetRunState() {

        renderer.hideEndScreen();

        renderer.clearNotes(this.notes);

        this.notes = [];

        scoreManager.reset();

        renderer.updateProgress(0, 1);

    }
    //--------------------------------------------------
    // Boucle principale
    //--------------------------------------------------

    loop() {

        if (!this.running)
            return;

        const currentTime = this.getGameTime();

        const duration =
            audioManager.getDuration();

        if (!this.isCountdownActive) {
            renderer.renderNotes(
                this.notes,
                currentTime
            );
        }

        renderer.updateProgress(
            currentTime,
            duration
        );

        this.checkMisses(
            currentTime
        );

        if (!this.running) {
            return;
        }

        this.animationFrame =
            requestAnimationFrame(
                () => this.loop()
            );

    }

    //--------------------------------------------------
    // Détection des MISS
    //--------------------------------------------------

    checkMisses(currentTime) {

        for (const note of this.notes) {

            if (note.judged)
                continue;

            if (note.isMissed(currentTime)) {

                note.judged = true;

                note.hit = true;
                note.destroy();
                scoreManager.addJudgement(
                    "miss"
                );
renderer.showHitEffect("miss");

                if (
                    scoreManager.consecutiveMisses >=
                    this.maxConsecutiveMisses
                ) {
                    this.endForConsecutiveMisses();
                    return;
                }


            }

        }

    }

startRecordingNote(lane) {

    if (this.recordingStarts.has(lane)) {
        return;
    }

    this.recordingStarts.set(
        lane,
        audioManager.getCurrentTime()
    );

}

finishRecordingNote(lane, endLane = lane) {

    const hitTime = this.recordingStarts.get(lane);

    if (hitTime === undefined) {
        return;
    }

    this.recordingStarts.delete(lane);

    const holdDuration = Math.max(
        0,
        audioManager.getCurrentTime() - hitTime
    );

    this.recordNote(lane, hitTime, holdDuration, endLane);

}

recordNote(lane, hitTime, holdDuration = 0, toLane = lane) {

    const note = {
        lane: lane,
        hitTime: Number(hitTime.toFixed(3))
    };

    if (holdDuration >= MIN_HOLD_DURATION) {
        note.holdDuration = Number(holdDuration.toFixed(3));

        if (toLane !== lane) {
            note.toLane = toLane;
        }
    }

    this.recordedNotes.push(note);

    console.log(this.recordedNotes);

}

//--------------------------------------------------
// Gestion des touches
//--------------------------------------------------

    pressLane(lane) {
if (this.mode === "record") {

    if (!this.running || this.isRecordingPaused) {
        return;
    }

    this.startRecordingNote(lane);

    return;

}

        if (!this.running || this.isCountdownActive)
            return;

        const currentTime =
            audioManager.getCurrentTime();

        let bestNote = null;

        let bestDelta = Infinity;

        for (const note of this.notes) {

            if (note.judged)
                continue;

            if (note.lane !== lane)
                continue;

            const delta =
                Math.abs(
                    note.hitTime -
                    currentTime
                );

            if (delta < bestDelta) {

                bestDelta = delta;

                bestNote = note;

            }

        }

        if (!bestNote)
            return;

        if (!bestNote.canBeHit(currentTime))
            return;

        if (bestNote.isHoldNote()) {

            bestNote.holding = true;
            bestNote.element.classList.add("holding");
            return;

        }

        const judgement = bestNote.judge(currentTime);

        bestNote.hit = true;
        bestNote.judged = true;
        bestNote.destroy();
        scoreManager.addJudgement(
            judgement
        );
renderer.showHitEffect(judgement);
renderer.showJudgement(judgement);

    }

    releaseLane(lane, endLane = lane, requireExactLane = false) {

        if (this.mode === "record") {
            if (!this.running || this.isRecordingPaused) {
                return;
            }

            this.finishRecordingNote(lane, endLane);
            return;
        }

        if (
            !this.running ||
            this.mode !== "play" ||
            this.isCountdownActive
        ) {
            return;
        }

        // au clavier (pas de glissement possible), la diagonale reste cosmetique :
        // on valide avec la touche de depart. Au tactile, la colonne d'arrivee reelle est exigee.
        const heldNote = this.notes.find((note) =>
            note.holding && !note.judged &&
            (requireExactLane ? note.toLane === endLane : note.lane === lane)
        );

        if (!heldNote) {
            return;
        }

        const currentTime = audioManager.getCurrentTime();
        const judgement = heldNote.canBeReleased(currentTime)
            ? heldNote.judge(currentTime)
            : "miss";

        heldNote.hit = true;
        heldNote.judged = true;
        heldNote.destroy();
        scoreManager.addJudgement(judgement);
        renderer.showHitEffect(judgement);
        renderer.showJudgement(judgement);

    }

    hitLane(lane) {

        this.pressLane(lane);

    }


downloadChart() {

    for (const lane of this.recordingStarts.keys()) {
        this.finishRecordingNote(lane);
    }

    this.recordedNotes.sort(
        (firstNote, secondNote) => firstNote.hitTime - secondNote.hitTime
    );

    const chart = {

        title: this.fileInput.files[0].name,

        notes: this.recordedNotes

    };

    const json =
        JSON.stringify(chart, null, 4);

    const blob =
        new Blob([json], {
            type: "application/json"
        });

    const url =
        URL.createObjectURL(blob);

    const a =
        document.createElement("a");

    a.href = url;

    a.download = "partition.json";

    a.click();

    URL.revokeObjectURL(url);

}

    //--------------------------------------------------
    // Fin de chanson
    //--------------------------------------------------

    onSongFinished() {
if (this.mode === "record") {

    this.downloadChart();
    this.isRecordingPaused = false;

}

        this.running = false;

        if (this.animationFrame) {

            cancelAnimationFrame(
                this.animationFrame
            );

        }

        this.updateRecordingControls();

        renderer.showEndScreen();

        if (this.mode === "play") {
            this.prepareLeaderboardUI();
        }

    }

    endForConsecutiveMisses() {

        this.running = false;

        audioManager.pause();

        renderer.showEndScreen(
            "Echec de la partie",
            "Tu as enchaine " + this.maxConsecutiveMisses +
            " fautes. Recommence et ameliore-toi !"
        );

        // le score ne peut etre enregistre que si la musique va au bout
        document.getElementById("leaderboardSection")
            .classList.add("hidden");

    }

    //--------------------------------------------------
    // Classement (Supabase)
    //--------------------------------------------------

    prepareLeaderboardUI() {

        const available =
            !!this.selectedSong && leaderboardManager.isAvailable();

        document.getElementById("leaderboardSection")
            .classList.toggle("hidden", !this.selectedSong);

        this.playerNameInput.value = "";
        this.saveScoreStatus.textContent = available
            ? ""
            : "Classement indisponible (pas de connexion).";
        this.saveScoreButton.disabled = !available;

        this.refreshLeaderboard();

    }

    async saveScore() {

        if (!this.selectedSong || !leaderboardManager.isAvailable()) {
            return;
        }

        const name = this.playerNameInput.value.trim();

        if (!name) {
            this.saveScoreStatus.textContent = "Entre un pseudo d'abord.";
            return;
        }

        this.saveScoreButton.disabled = true;
        this.saveScoreStatus.textContent = "Enregistrement...";

        const { error } = await leaderboardManager.submitScore(
            this.selectedSong.id,
            name,
            scoreManager.score,
            scoreManager.accuracy,
            scoreManager.bestCombo
        );

        this.saveScoreButton.disabled = false;

        if (error) {
            this.saveScoreStatus.textContent = "Erreur : " + error;
            return;
        }

        this.saveScoreStatus.textContent = "Score enregistre !";

        this.refreshLeaderboard();

    }

    async refreshLeaderboard() {

        this.leaderboardList.innerHTML = "";

        if (!this.selectedSong || !leaderboardManager.isAvailable()) {
            return;
        }

        const scores = await leaderboardManager.fetchTopScores(
            this.selectedSong.id,
            10
        );

        for (const entry of scores) {

            const item = document.createElement("li");

            item.textContent =
                entry.player_name + " - " + entry.score + " pts (" +
                Number(entry.accuracy).toFixed(2) + "%, combo " +
                entry.best_combo + ")";

            this.leaderboardList.appendChild(item);

        }

    }

    //--------------------------------------------------
    // Rejouer
    //--------------------------------------------------

    restart() {

        this.running = false;
        this.clearCountdown();
        this.preRollEndsAt = null;

        if (this.animationFrame) {

            cancelAnimationFrame(
                this.animationFrame
            );

        }

        audioManager.stop();

        renderer.clearNotes(
            this.notes
        );

        this.notes = [];

        scoreManager.reset();

        renderer.hideEndScreen();

        this.mode = "play";
        this.isRecordingPaused = false;
        this.recordingStarts.clear();
        this.updateRecordingControls();

    }

}

//====================================================
// Création du jeu
//====================================================

window.game = new Game();

