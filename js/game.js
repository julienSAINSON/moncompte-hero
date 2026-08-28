//====================================================
// game.js - Partie 1
//====================================================

const MAX_CONSECUTIVE_MISSES = 5;

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

        this.arenaCreateScreen =
            document.getElementById("arenaCreateScreen");

        this.arenaRoomRequiredScreen =
            document.getElementById("arenaRoomRequiredScreen");

        this.arenaCreateButton =
            document.getElementById("arenaCreateButton");

        this.arenaCreateButton.addEventListener(
            "click",
            async () => {
                const { error } = await arenaManager.createAndEnterRoom();
                if (error) {
                    alert(error);
                }
            }
        );

        this.arenaJoinScreen =
            document.getElementById("arenaJoinScreen");

        this.arenaRoomLabel =
            document.getElementById("arenaRoomLabel");

        this.arenaNameInput =
            document.getElementById("arenaNameInput");

        this.arenaJoinButton =
            document.getElementById("arenaJoinButton");

        this.arenaJoinStatus =
            document.getElementById("arenaJoinStatus");

        this.arenaJoinButton.addEventListener(
            "click",
            () => this.joinArenaRoom()
        );

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
        this.selectedDifficulty = "normal";
        this.songMenu = new SongMenu({
            overlay: this.songListOverlay,
            listEl: this.songListEl,
            infoEl: this.selectedSongInfo,
            onSelect: (song) => this.selectSong(song)
        });

        this.difficultySelector =
            document.getElementById("difficultySelector");

        this.difficultySelector.querySelectorAll("button").forEach((button) => {
            button.addEventListener("click", () => {
                this.selectDifficulty(button.dataset.difficulty);
            });
        });

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

        this.recorder = new ChartRecorder(this);

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

        // Le mode edition n'est visible que via le parametre d'URL ?mode=1
        const urlParams = new URLSearchParams(window.location.search);
        const requestedMode = urlParams.get("mode") || "3";
        this.developerMode = requestedMode === "1";
        this.canEditCharts = this.developerMode && urlParams.get("gm") === "1";

        // Le mode bataille (2 joueurs) se lance via le parametre d'URL ?mode=2
        this.battleMode = requestedMode === "2";

        document.getElementById("battleBonusControls")
            .classList.toggle("hidden", !this.battleMode);

        // L'Arena est le mode par defaut.
        this.arenaMode = requestedMode === "3";

        if (this.arenaMode && arenaManager.isActive()) {
            this.arenaRoomLabel.textContent = "Salle : " + arenaManager.roomId;
            this.arenaJoinScreen.classList.remove("hidden");

            // le panneau (image + classement) reste visible tout au long du mode Arena
            document.getElementById("arenaSidePanel")
                .classList.remove("hidden");

            if (arenaManager.isGameMaster) {
                this.setupArenaShareSection();
            }

        } else if (this.arenaMode && arenaManager.isGameMaster) {
            this.arenaCreateScreen.classList.remove("hidden");
        } else if (this.arenaMode) {
            this.arenaRoomRequiredScreen.classList.remove("hidden");
        }

        this.modeSelector.classList.toggle(
            "developerHidden",
            !this.canEditCharts
        );

        this.modeInfo.classList.toggle(
            "developerHidden",
            !this.canEditCharts
        );

        if (this.battleMode) {
            this.playButton.textContent = "Start (Bataille)";
            document.getElementById("shareScoreButton")
                .classList.add("hidden");
        } else if (this.arenaMode) {
            // en Battle Arena, seul le maitre du jeu choisit la musique via le menu
            this.playButton.textContent = "Start (Arena)";
            document.getElementById("shareScoreButton")
                .classList.add("hidden");
        }

        this.setAppMode("play");
        this.loadDefaultSong();

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

        this.recorder.updateControls();

        this.modeInfo.textContent = isPlayMode
            ? "Mode Play : chargement automatique des fichiers par defaut."
            : "Mode Edition : choisis un MP3 puis appuie sur Demarrer l'edition pour generer le JSON.";

        this.updatePlaySelectionUI();

        this.restart();

    }

    async loadDefaultSong() {

        if (this.battleMode || this.arenaMode || this.selectedSong) {
            return;
        }

        const song = await this.songMenu.resolveDefaultSong();

        if (!song) {
            console.warn("Aucune chanson par defaut dans le manifest.");
            return;
        }

        this.selectedSong = song;
        this.selectedDifficulty = this.songMenu.resolveDifficulty(song);
        this.updatePlaySelectionUI();

    }

    //--------------------------------------------------
    // Selection d'une musique (menu)
    //--------------------------------------------------

    updatePlaySelectionUI() {

        if (this.arenaMode && !arenaManager.isGameMaster) {
            // en Battle Arena, seul le maitre du jeu a la main sur la selection/lancement
            this.menuButton.classList.add("hidden");
            this.playButton.classList.add("hidden");
            this.selectedSongInfo.classList.add("hidden");
            this.difficultySelector.classList.add("hidden");
            return;
        }

        if (
            !this.battleMode &&
            !this.arenaMode &&
            this.appMode !== "play" &&
            !this.canEditCharts
        ) {
            this.menuButton.classList.add("hidden");
            this.playButton.classList.add("hidden");
            this.selectedSongInfo.classList.add("hidden");
            this.difficultySelector.classList.add("hidden");
            return;
        }

        const hasSong = !!this.selectedSong;
        const showsMenu = this.battleMode || this.arenaMode || this.developerMode;

        // le bouton "Musiques" n'est propose qu'en mode bataille/arena
        this.menuButton.classList.toggle("hidden", !showsMenu);
        this.playButton.classList.toggle("hidden", !hasSong);
        this.selectedSongInfo.classList.toggle("hidden", !hasSong || !showsMenu);
        this.difficultySelector.classList.toggle("hidden", !hasSong);
        this.renderDifficultySelector();

    }

    renderDifficultySelector() {

        if (!this.selectedSong) {
            return;
        }

        const available = this.songMenu.getAvailableDifficulties(this.selectedSong);

        this.difficultySelector.querySelectorAll("button").forEach((button) => {
            const difficulty = button.dataset.difficulty;
            const isAvailable = available.includes(difficulty);

            button.disabled = !isAvailable;
            button.classList.toggle(
                "active",
                difficulty === this.selectedDifficulty
            );
        });

    }

    selectDifficulty(difficulty) {

        if (!this.selectedSong) {
            return;
        }

        const resolved = this.songMenu.resolveDifficulty(
            this.selectedSong,
            difficulty
        );

        if (!resolved) {
            return;
        }

        this.selectedDifficulty = resolved;
        this.renderDifficultySelector();

    }

    getSelectedChartPath() {

        const chart = this.songMenu.resolveChart(
            this.selectedSong,
            this.selectedDifficulty
        );

        if (!chart) {
            return null;
        }

        this.selectedDifficulty = chart.difficulty;

        return encodeURI(this.selectedSong.folder + "/" + chart.path);

    }

    //--------------------------------------------------
    // Battle Arena (salle multijoueur en ligne)
    //--------------------------------------------------

    setupArenaShareSection() {

        const shareSection = document.getElementById("arenaShareSection");
        const copyButton = document.getElementById("arenaCopyLinkButton");
        const copyStatus = document.getElementById("arenaCopyStatus");
        const qrContainer = document.getElementById("arenaQrCode");

        const playerUrl = new URL(window.location.href);
        playerUrl.searchParams.delete("gm");
        const playerUrlString = playerUrl.toString();

        shareSection.classList.remove("hidden");

        copyButton.addEventListener("click", async () => {

            try {
                await navigator.clipboard.writeText(playerUrlString);
                copyStatus.textContent = "Lien copie !";
            } catch (error) {
                copyStatus.textContent = "Copie impossible sur cet appareil.";
            }

        });

        if (window.QRCode) {

            new window.QRCode(qrContainer, {
                text: playerUrlString,
                width: 180,
                height: 180
            });

        }

    }

    async joinArenaRoom() {

        this.arenaJoinButton.disabled = true;
        this.arenaJoinStatus.textContent = "Connexion...";

        const { error } = await arenaManager.joinRoom(
            this.arenaNameInput.value
        );

        this.arenaJoinButton.disabled = false;

        if (error) {
            this.arenaJoinStatus.textContent = error;
            return;
        }

        this.arenaJoinScreen.classList.add("hidden");

        if (!arenaManager.isGameMaster) {
            document.getElementById("arenaWaitingScreen")
                .classList.remove("hidden");
            this.pollArenaRoomStart();
        }

    }

    pollArenaRoomStart() {

        this.arenaPollTimer = setInterval(async () => {

            const { data, error } = await arenaManager.getRoomStatus();

            if (error || !data || data.status !== "playing") {
                return;
            }

            clearInterval(this.arenaPollTimer);

            document.getElementById("arenaWaitingScreen")
                .classList.add("hidden");

            await this.startAsArenaPlayer(data.song_id, data.difficulty);

        }, 1000);

    }

    async resolveSongById(songId) {

        return this.songMenu.resolveSongById(songId);

    }

    async startAsArenaPlayer(songId, difficulty) {

        const song = await this.resolveSongById(songId);

        if (!song) {
            alert("Musique introuvable pour cette salle.");
            return;
        }

        this.selectedSong = song;
        this.selectedDifficulty = this.songMenu.resolveDifficulty(song, difficulty);

        this.start();

    }

    async openSongList() {

        await this.songMenu.open(this.selectedSong?.id || null);

    }

    renderSongList() {

        this.songMenu.render(this.selectedSong?.id || null);

    }

    selectSong(song) {

        this.selectedSong = song;
        this.selectedDifficulty = this.songMenu.resolveDifficulty(song);
        this.updatePlaySelectionUI();

    }

    closeSongList() {

        this.songMenu.close();

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

        if (!this.selectedSong && !this.battleMode && !this.arenaMode) {
            await this.loadDefaultSong();
        }

        if (!this.selectedSong) {
            return;
        }

        if (this.arenaMode && arenaManager.isGameMaster) {
            // signale aux autres joueurs que la partie demarre
            const { error } = await arenaManager.startRoom(
                this.selectedSong.id,
                this.selectedDifficulty
            );

            if (error) {
                alert(error);
                return;
            }
        }

        this.mode = "play";

        this.resetRunState();

        // masque les notes des leur creation, avant meme la fin du chargement de l'audio
        this.playfield.classList.add("countdown-active");

        const chartPath = this.getSelectedChartPath();

        if (!chartPath) {
            alert("Aucune partition disponible pour cette difficulte.");
            return;
        }

        const musicPath =
            encodeURI(this.selectedSong.folder + "/" + this.selectedSong.music);

        let chartLoaded =
            await this.prepareChartFromURL(chartPath);

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

        this.startArenaScorePush();

        this.startCountdown(() => this.startPreRoll());
        this.loop();

    }

    startArenaScorePush() {

        if (!this.arenaMode) {
            return;
        }

        this.stopArenaScorePush();

        this.arenaPushTimer = setInterval(() => {
            arenaManager.pushScore(
                scoreManager.score,
                scoreManager.combo,
                scoreManager.accuracy
            );
        }, 1500);

        this.arenaPrevRank = null;

        this.refreshArenaLeaderboard();

        this.arenaLeaderboardTimer = setInterval(
            () => this.refreshArenaLeaderboard(),
            2000
        );

    }

    async refreshArenaLeaderboard() {

        const top = await arenaManager.fetchLeaderboard(10);

        const listEl = document.getElementById("arenaLeaderboardList");
        const ownRankEl = document.getElementById("arenaOwnRank");

        listEl.innerHTML = "";
        ownRankEl.textContent = "";
        ownRankEl.classList.remove("arenaOwnEntry");

        let isInTop = false;
        let currentRank = null;
        let targetEl = null;

        top.forEach((entry, index) => {

            const item = document.createElement("li");
            const playerName = document.createElement("strong");
            const score = document.createElement("span");

            playerName.className = "arenaPlayerName";
            playerName.textContent = entry.player_name;
            score.className = "arenaPlayerScore";
            score.textContent = entry.score;
            item.append(playerName, score);

            if (entry.player_name === arenaManager.playerName) {
                item.classList.add("arenaOwnEntry");
                isInTop = true;
                currentRank = index + 1;
                targetEl = item;
            }

            listEl.appendChild(item);

        });

        if (!isInTop) {

            currentRank = await arenaManager.getPlayerRank(scoreManager.score);

            if (currentRank) {
                const rank = document.createElement("span");
                const playerName = document.createElement("strong");
                const score = document.createElement("span");

                rank.className = "arenaOwnPosition";
                rank.textContent = "#" + currentRank;
                playerName.className = "arenaPlayerName";
                playerName.textContent = arenaManager.playerName;
                score.className = "arenaPlayerScore";
                score.textContent = scoreManager.score;
                ownRankEl.replaceChildren(rank, playerName, score);
            }
            ownRankEl.classList.add("arenaOwnEntry");
            targetEl = ownRankEl;

        }

        if (
            targetEl &&
            currentRank !== null &&
            this.arenaPrevRank !== null &&
            currentRank !== this.arenaPrevRank
        ) {

            const improved = currentRank < this.arenaPrevRank;
            const flashClass = improved ? "arenaRankUp" : "arenaRankDown";

            targetEl.classList.remove("arenaRankUp", "arenaRankDown");
            void targetEl.offsetWidth; // force le redemarrage de l'animation
            targetEl.classList.add(flashClass);

            setTimeout(() => {
                targetEl.classList.remove("arenaRankUp", "arenaRankDown");
            }, 1000);

            const screenFlash = document.getElementById("arenaRankFlash");
            screenFlash.classList.remove("arenaRankUp", "arenaRankDown");
            void screenFlash.offsetWidth; // force le redemarrage de l'animation
            screenFlash.classList.add(flashClass);

            this.showArenaRankOverlay(currentRank, flashClass);

            setTimeout(() => {
                screenFlash.classList.remove("arenaRankUp", "arenaRankDown");
            }, 1000);

        }

        this.arenaPrevRank = currentRank;

    }

    showArenaRankOverlay(rank, flashClass) {

        const overlay = document.getElementById("arenaRankOverlay");

        if (!overlay) {
            return;
        }

        overlay.textContent = "#" + rank;
        overlay.classList.remove("show", "arenaRankUp", "arenaRankDown");
        overlay.classList.add(flashClass);
        void overlay.offsetWidth;
        overlay.classList.add("show");

        setTimeout(() => {
            overlay.classList.remove("show", "arenaRankUp", "arenaRankDown");
        }, 1200);

    }

    async showArenaFinalRanking() {

        const section = document.getElementById("arenaFinalRanking");
        const listEl = document.getElementById("arenaFinalRankingList");

        section.classList.remove("hidden");
        listEl.innerHTML = "<li>Chargement...</li>";

        const scores = await arenaManager.fetchLeaderboard(50);

        listEl.innerHTML = "";

        scores.forEach((entry) => {

            const item = document.createElement("li");

            item.textContent = entry.player_name + " - " + entry.score;

            if (entry.player_name === arenaManager.playerName) {
                item.style.color = "#00ff88";
                item.style.fontWeight = "bold";
            }

            listEl.appendChild(item);

        });

    }

    stopArenaScorePush() {

        if (this.arenaPushTimer) {
            clearInterval(this.arenaPushTimer);
            this.arenaPushTimer = null;
        }

        if (this.arenaLeaderboardTimer) {
            clearInterval(this.arenaLeaderboardTimer);
            this.arenaLeaderboardTimer = null;
        }

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
        document.getElementById("menu").classList.add("hidden");

        renderer.hideEndScreen();

        const chartPath = this.getSelectedChartPath();

        if (!chartPath) {
            return;
        }

        const musicPath =
            this.selectedSong.folder + "/" + this.selectedSong.music;

        const started = await battleGame.start(chartPath, musicPath);

        if (!started) {
            document.getElementById("hud").classList.remove("hidden");
            document.getElementById("game").classList.remove("hidden");
            document.getElementById("progressContainer")
                .classList.remove("hidden");
            document.getElementById("menu").classList.remove("hidden");
        }

    }

    restartBattle() {

        battleGame.reset();

        document.getElementById("battlefield").classList.add("hidden");
        document.getElementById("menu").classList.remove("hidden");

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



    //--------------------------------------------------
    // Génération des notes
    //--------------------------------------------------

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

        // recalcule la ligne de hit/echelle sur la taille reelle actuelle
        // (le cache peut etre perime si aucun evenement "resize" ne s'est declenche)
        renderer._updateLayoutCache();

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

                if (scoreManager.lastMultiplierChange !== null) {
                    renderer.showMultiplierEffect(
                        note.lane,
                        scoreManager.lastMultiplierChange
                    );
                }

                if (
                    !this.arenaMode &&
                    scoreManager.consecutiveMisses >=
                    this.maxConsecutiveMisses
                ) {
                    this.endForConsecutiveMisses();
                    return;
                }


            }

        }

    }

//--------------------------------------------------
// Gestion des touches
//--------------------------------------------------

    pressLane(lane) {
    if (this.mode === "record") {

        if (!this.running || this.recorder.isRecordingPaused) {
            return;
        }

        this.recorder.startNote(lane);

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

        if (scoreManager.lastMultiplierChange !== null) {
            renderer.showMultiplierEffect(
                bestNote.lane,
                scoreManager.lastMultiplierChange
            );
        }

    }

    releaseLane(lane, endLane = lane, requireExactLane = false) {

        if (this.mode === "record") {
                if (!this.running || this.recorder.isRecordingPaused) {
                    return;
                }

                this.recorder.finishNote(lane, endLane);
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

        if (scoreManager.lastMultiplierChange !== null) {
            renderer.showMultiplierEffect(
                heldNote.lane,
                scoreManager.lastMultiplierChange
            );
        }

    }

    hitLane(lane) {

        this.pressLane(lane);

    }


    //--------------------------------------------------
    // Fin de chanson
    //--------------------------------------------------

    onSongFinished() {
if (this.mode === "record") {

        this.recorder.downloadChart();
        this.recorder.isRecordingPaused = false;

}

        this.running = false;

        if (this.animationFrame) {

            cancelAnimationFrame(
                this.animationFrame
            );

        }

        this.stopArenaScorePush();

            this.recorder.updateControls();

        renderer.showEndScreen();

        if (this.arenaMode) {
            this.showArenaFinalRanking();
        } else if (this.mode === "play") {
            this.prepareLeaderboardUI();
        }

    }

    endForConsecutiveMisses() {

        this.running = false;

        audioManager.pause();

        this.stopArenaScorePush();

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

        this.stopArenaScorePush();

        audioManager.stop();

        renderer.clearNotes(
            this.notes
        );

        this.notes = [];

        scoreManager.reset();

        renderer.hideEndScreen();

        this.mode = "play";
            this.recorder.isRecordingPaused = false;
            this.recorder.recordingStarts.clear();
            this.recorder.updateControls();

    }

}

//====================================================
// Création du jeu
//====================================================

window.game = new Game();

