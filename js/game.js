//====================================================
// game.js - Partie 1
//====================================================

const DEFAULT_PLAY_MP3 = "assets/default/saisis ton sciforma.mp3";
const DEFAULT_PLAY_CHART = "assets/default/partition.json";
const MAX_CONSECUTIVE_MISSES = 5;

class Game {

    constructor() {

        window.game = this;

        this.notes = [];

        this.running = false;

        this.maxConsecutiveMisses = MAX_CONSECUTIVE_MISSES;

        this.animationFrame = null;

        this.playButton =
            document.getElementById("playButton");

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

        this.restartButton =
            document.getElementById("restartButton");

        this.playButton.addEventListener(
            "click",
            () => this.start()
        );

        this.restartButton.addEventListener(
            "click",
            () => this.restart()
        );

        this.recordButton =
            document.getElementById("recordButton");

        this.recordButton.addEventListener(
            "click",
            () => this.startRecording()
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

        this.playButton.classList.toggle(
            "hidden",
            !isPlayMode
        );

        this.modeInfo.textContent = isPlayMode
            ? "Mode Play : chargement automatique des fichiers par defaut."
            : "Mode Edition : choisis un MP3 puis appuie sur Demarrer l'edition pour generer le JSON.";

        this.restart();

    }

    //--------------------------------------------------
    // Démarrage
    //--------------------------------------------------

    async start() {

        if (this.running) {
            return;
        }

        this.mode = "play";

        this.resetRunState();

        const chartLoaded =
            this.loadDefaultChartData() ||
            await this.prepareChartFromURL(
                encodeURI(DEFAULT_PLAY_CHART)
            );

        if (!chartLoaded) {
            alert(
                "Impossible de charger la partition par defaut: " +
                DEFAULT_PLAY_CHART
            );
            return;
        }

        const audioLoaded =
            await audioManager.loadFromURL(
                encodeURI(DEFAULT_PLAY_MP3)
            );

        if (!audioLoaded) {
            alert(
                "Impossible de charger le MP3 par defaut: " +
                DEFAULT_PLAY_MP3
            );
            return;
        }

        audioManager.play();

        this.running = true;

        this.loop();

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

    audioManager.load(file);

    audioManager.play();

    this.running = true;

    this.loop();

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

            const response = await fetch(path);

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
                    n.hitTime
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

        const currentTime =
            audioManager.getCurrentTime();

        const duration =
            audioManager.getDuration();

        renderer.renderNotes(
            this.notes,
            currentTime
        );

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

recordNote(lane) {

    this.recordedNotes.push({

        lane: lane,

        hitTime: Number(
            audioManager
                .getCurrentTime()
                .toFixed(3)
        )

    });

    console.log(this.recordedNotes);

}

//--------------------------------------------------
// Gestion des touches
//--------------------------------------------------

    hitLane(lane) {
if (this.mode === "record") {

    this.recordNote(lane);

    return;

}

        if (!this.running)
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

        const judgement =
            bestNote.judge(currentTime);

        bestNote.hit = true;
        bestNote.judged = true;
        bestNote.destroy();
        scoreManager.addJudgement(
            judgement
        );
renderer.showHitEffect(judgement);
renderer.showJudgement(judgement);

    }


downloadChart() {

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

}

        this.running = false;

        if (this.animationFrame) {

            cancelAnimationFrame(
                this.animationFrame
            );

        }

        renderer.showEndScreen();

    }

    endForConsecutiveMisses() {

        this.running = false;

        audioManager.pause();

        renderer.showEndScreen(
            "Echec de la partie",
            "Tu as enchaine " + this.maxConsecutiveMisses +
            " fautes. Recommence et ameliore-toi !"
        );

    }

    //--------------------------------------------------
    // Rejouer
    //--------------------------------------------------

    restart() {

        this.running = false;

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

    }

}

//====================================================
// Création du jeu
//====================================================

window.game = new Game();

