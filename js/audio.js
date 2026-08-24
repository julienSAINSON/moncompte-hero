class AudioManager {

    constructor() {

        this.audio = null;
        this.file = null;
        this.objectUrl = null;
        this.beepContext = null;

        this.started = false;
    }
    playRecordingStartBeep() {

        const AudioContextClass =
            window.AudioContext || window.webkitAudioContext;

        if (!AudioContextClass) {
            return;
        }

        this.beepContext ??= new AudioContextClass();

        const oscillator = this.beepContext.createOscillator();
        const gain = this.beepContext.createGain();
        const startTime = this.beepContext.currentTime;

        oscillator.frequency.setValueAtTime(880, startTime);
        gain.gain.setValueAtTime(0.0001, startTime);
        gain.gain.exponentialRampToValueAtTime(0.15, startTime + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.16);

        oscillator.connect(gain);
        gain.connect(this.beepContext.destination);
        oscillator.start(startTime);
        oscillator.stop(startTime + 0.17);
    }

    attachEndedListener() {

        this.audio.addEventListener("ended", () => {

            if (window.game) {
                window.game.onSongFinished();
            }

        });

    }

    releaseObjectURL() {

        if (this.objectUrl) {
            URL.revokeObjectURL(this.objectUrl);
            this.objectUrl = null;
        }

    }

    load(file, playStartBeep = false) {

        this.file = file;

        if (this.audio) {
            this.audio.pause();
        }

        this.releaseObjectURL();

        this.objectUrl = URL.createObjectURL(file);

        this.audio = new Audio(this.objectUrl);

        this.audio.preload = "auto";

        this.attachEndedListener();

        if (playStartBeep) {
            this.playRecordingStartBeep();
        }

    }

    async loadFromURL(url) {

        this.file = null;

        if (this.audio) {
            this.audio.pause();
        }

        this.releaseObjectURL();

        this.audio = new Audio(url);

        this.audio.preload = "auto";

        this.attachEndedListener();

        try {
            await this.audio.load();
        } catch (_) {
            // no-op: load() can be sync depending on browser
        }

        return new Promise((resolve) => {

            const onCanPlay = () => {
                cleanup();
                resolve(true);
            };

            const onError = () => {
                cleanup();
                resolve(false);
            };

            const cleanup = () => {
                this.audio.removeEventListener("canplaythrough", onCanPlay);
                this.audio.removeEventListener("error", onError);
            };

            this.audio.addEventListener("canplaythrough", onCanPlay);
            this.audio.addEventListener("error", onError);

            if (this.audio.readyState >= 3) {
                cleanup();
                resolve(true);
            }

        });

    }

    play() {

        if (!this.audio) {
            return;
        }

        this.started = true;

        this.audio.play();

    }

    pause() {

        if (!this.audio) {
            return;
        }

        this.audio.pause();

    }

    stop() {

        if (!this.audio) {
            return;
        }

        this.audio.pause();
        this.audio.currentTime = 0;

        this.started = false;

    }

    getCurrentTime() {

        if (!this.audio) {
            return 0;
        }

        return this.audio.currentTime;

    }

    getDuration() {

        if (!this.audio) {
            return 0;
        }

        return this.audio.duration || 0;

    }

    isPlaying() {

        if (!this.audio) {
            return false;
        }

        return !this.audio.paused;

    }

}

window.audioManager = new AudioManager();