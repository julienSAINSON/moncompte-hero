//====================================================
// game.js - Partie 1
//====================================================

class Game {

    constructor() {

        window.game = this;

        this.notes = [];

        this.running = false;

        this.animationFrame = null;

        this.playButton =
            document.getElementById("playButton");

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
this.chartInput =
    document.getElementById("chartFile");

this.recordButton =
    document.getElementById("recordButton");

this.recordButton.addEventListener(
    "click",
    () => this.startRecording()
);


this.mode = "play"; // play | record
this.recordedNotes = [];

    }

    //--------------------------------------------------
    // Démarrage
    //--------------------------------------------------

    start() {

        const file =
            this.fileInput.files[0];

        if (!file) {

            alert("Choisissez un MP3.");

            return;

        }

        renderer.hideEndScreen();

        renderer.clearNotes(this.notes);

        this.notes = [];

        scoreManager.reset();

        audioManager.load(file);

     this.prepareChart(() => {

    audioManager.play();

    this.running = true;

    this.loop();

});

    }




startRecording() {

    const file = this.fileInput.files[0];

    if (!file) {

        alert("Choisissez un MP3.");

        return;

    }

    this.mode = "record";

    this.recordedNotes = [];

    audioManager.load(file);

    audioManager.play();

    this.running = true;

    this.loop();

}

    //--------------------------------------------------
    // Génération des notes
    //--------------------------------------------------

prepareChart(callback) {

    const file =
        this.chartInput.files[0];

    if (!file) {

        alert("Choisissez une partition.");

        return;

    }

    const reader =
        new FileReader();

    reader.onload = (e) => {

        const json =
            JSON.parse(e.target.result);

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

        callback();

    };

    reader.readAsText(file);

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

    }

}

//====================================================
// Création du jeu
//====================================================

window.game = new Game();

