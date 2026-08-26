//====================================================
// recording.js - Enregistrement et lecture de partitions
// personnalisees (mode Edition)
//====================================================

const MIN_HOLD_DURATION = 0.15;

class ChartRecorder {

    constructor(game) {

        this.game = game;

        this.recordedNotes = [];
        this.recordingStarts = new Map();
        this.isRecordingPaused = false;

        this.fileInput =
            document.getElementById("musicFile");

        this.chartFileInput =
            document.getElementById("chartFile");

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
            () => this.togglePause()
        );

        this.stopButton.addEventListener(
            "click",
            () => this.stopRecording()
        );

    }

    startRecording() {

        if (this.game.running) {
            return;
        }

        const file = this.fileInput.files[0];

        if (!file) {
            alert("Choisissez un MP3.");
            return;
        }

        this.game.mode = "record";

        this.game.resetRunState();

        this.recordedNotes = [];
        this.recordingStarts.clear();
        this.isRecordingPaused = false;

        audioManager.load(file, true);

        audioManager.play();

        this.game.running = true;

        this.updateControls();

        this.game.loop();

    }

    async startCustomPlay() {

        if (this.game.running) {
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

        this.game.mode = "play";
        this.game.resetRunState();
        this.game.loadChartNotes(chartData);

        audioManager.load(musicFile);
        audioManager.play();

        this.game.running = true;
        this.updateControls();
        this.game.loop();

    }

    updateControls() {

        const canControlRecording =
            this.game.mode === "record" && this.game.running;

        this.pauseButton.disabled = !canControlRecording;
        this.stopButton.disabled = !canControlRecording;
        this.pauseButton.textContent = this.isRecordingPaused
            ? "Reprendre"
            : "Pause";

    }

    togglePause() {

        if (this.game.mode !== "record" || !this.game.running) {
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

        this.updateControls();

    }

    stopRecording() {

        if (this.game.mode !== "record" || !this.game.running) {
            return;
        }

        inputManager.releaseAllInputs();
        this.game.running = false;
        this.isRecordingPaused = false;

        if (this.game.animationFrame) {
            cancelAnimationFrame(this.game.animationFrame);
        }

        audioManager.stop();
        this.downloadChart();
        this.updateControls();

        renderer.showEndScreen(
            "Edition arretee",
            "La partition incomplete a ete telechargee."
        );

    }

    startNote(lane) {

        if (this.recordingStarts.has(lane)) {
            return;
        }

        this.recordingStarts.set(
            lane,
            audioManager.getCurrentTime()
        );

    }

    finishNote(lane, endLane = lane) {

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

    }

    downloadChart() {

        for (const lane of this.recordingStarts.keys()) {
            this.finishNote(lane);
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

}

window.ChartRecorder = ChartRecorder;
