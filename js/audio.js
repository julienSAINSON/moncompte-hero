class AudioManager {

    constructor() {

        this.audio = null;
        this.file = null;

        this.started = false;
    }

    load(file) {

        this.file = file;

        if (this.audio) {
            this.audio.pause();
        }

        this.audio = new Audio(URL.createObjectURL(file));

        this.audio.preload = "auto";

        this.audio.addEventListener("ended", () => {

            if (window.game) {
                window.game.onSongFinished();
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