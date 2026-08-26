function setInputFiles(el, files) {
    Object.defineProperty(el, "files", {
        value: files,
        configurable: true
    });
}

function createRecordingFixture() {
    document.body.insertAdjacentHTML(
        "beforeend",
        "<input id=\"musicFile\" />" +
        "<input id=\"chartFile\" />" +
        "<button id=\"recordButton\"></button>" +
        "<button id=\"testChartButton\"></button>" +
        "<button id=\"pauseButton\"></button>" +
        "<button id=\"stopButton\"></button>"
    );

    const game = {
        running: false,
        mode: "play",
        animationFrame: null,
        resetRunStateCalled: false,
        loadChartNotesArg: null,
        loopCalled: false,
        resetRunState() {
            this.resetRunStateCalled = true;
        },
        loadChartNotes(arg) {
            this.loadChartNotesArg = arg;
        },
        loop() {
            this.loopCalled = true;
        }
    };

    const calls = {
        load: 0,
        play: 0,
        pause: 0,
        stop: 0,
        release: 0,
        showEnd: 0,
        alertText: ""
    };

    window.audioManager = {
        load() { calls.load++; },
        play() { calls.play++; },
        pause() { calls.pause++; },
        stop() { calls.stop++; },
        getCurrentTime() { return 10; }
    };

    window.inputManager = {
        releaseAllInputs() { calls.release++; }
    };

    window.renderer = {
        showEndScreen() { calls.showEnd++; }
    };

    const originalAlert = window.alert;
    window.alert = function (text) {
        calls.alertText = text;
    };

    const recorder = new ChartRecorder(game);

    return {
        game: game,
        recorder: recorder,
        calls: calls,
        restore() {
            window.alert = originalAlert;
            [
                "musicFile",
                "chartFile",
                "recordButton",
                "testChartButton",
                "pauseButton",
                "stopButton"
            ].forEach((id) => {
                const el = document.getElementById(id);
                if (el) {
                    el.remove();
                }
            });
        }
    };
}

test("ChartRecorder startRecording demarre en mode record", function () {
    const fx = createRecordingFixture();

    const musicInput = document.getElementById("musicFile");
    setInputFiles(musicInput, [{ name: "music.mp3" }]);

    fx.recorder.startRecording();

    assert.equal(fx.game.mode, "record");
    assert.equal(fx.game.running, true);
    assert.equal(fx.game.resetRunStateCalled, true);
    assert.equal(fx.game.loopCalled, true);
    assert.equal(fx.calls.load, 1);
    assert.equal(fx.calls.play, 1);

    fx.restore();
});

test("ChartRecorder togglePause alterne pause et reprise", function () {
    const fx = createRecordingFixture();

    fx.game.mode = "record";
    fx.game.running = true;

    fx.recorder.togglePause();
    assert.equal(fx.recorder.isRecordingPaused, true);
    assert.equal(fx.calls.pause, 1);
    assert.equal(fx.calls.release, 1);

    fx.recorder.togglePause();
    assert.equal(fx.recorder.isRecordingPaused, false);
    assert.equal(fx.calls.play, 1);

    fx.restore();
});

test("ChartRecorder recordNote gere holdDuration et toLane", function () {
    const fx = createRecordingFixture();

    fx.recorder.recordNote(0, 1.23456, 0.2, 2);
    fx.recorder.recordNote(1, 2.34567, 0.1, 3);

    assert.deepEqual(fx.recorder.recordedNotes[0], {
        lane: 0,
        hitTime: 1.235,
        holdDuration: 0.2,
        toLane: 2
    });

    assert.deepEqual(fx.recorder.recordedNotes[1], {
        lane: 1,
        hitTime: 2.346
    });

    fx.restore();
});

test("ChartRecorder startCustomPlay charge une partition valide", async function () {
    const fx = createRecordingFixture();

    const musicInput = document.getElementById("musicFile");
    const chartInput = document.getElementById("chartFile");

    setInputFiles(musicInput, [{ name: "music.mp3" }]);
    setInputFiles(chartInput, [{
        text: async function () {
            return JSON.stringify({ notes: [{ lane: 0, hitTime: 1 }] });
        }
    }]);

    await fx.recorder.startCustomPlay();

    assert.equal(fx.game.mode, "play");
    assert.equal(fx.game.running, true);
    assert.equal(Array.isArray(fx.game.loadChartNotesArg.notes), true);
    assert.equal(fx.game.loopCalled, true);

    fx.restore();
});
