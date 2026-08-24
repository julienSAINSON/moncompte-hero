class Renderer {

    constructor() {

        this.playfield = document.getElementById("playfield");

        this.progressBar = document.getElementById("progressBar");

        this.endScreen = document.getElementById("endScreen");

        this.finalScore = document.getElementById("finalScore");

        this.endTitle = document.getElementById("endTitle");

        this.endMessage = document.getElementById("endMessage");

        this.shareScoreButton =
            document.getElementById("shareScoreButton");

        this.shareStatus =
            document.getElementById("shareStatus");

        this.shareScoreButton.addEventListener(
            "click",
            () => this.shareScore()
        );

        this.hitLineY = 0;
        this.pixelsPerSecond = 0;
        this.lookaheadSeconds = 2;
        this._updateLayoutCache();

        window.addEventListener("resize", () => this._updateLayoutCache());

    }

    _updateLayoutCache() {

        this.hitLineY = this.playfield.clientHeight - 100;
        this.pixelsPerSecond =
            this.hitLineY / this.lookaheadSeconds;

    }
showJudgement(text){

    const div =
        document.createElement("div");

    div.className =
        "floatingText " + text;

    div.textContent =
        text.toUpperCase();

    this.playfield.appendChild(div);

    setTimeout(()=>{

        div.remove();

    },500);

}

showHitEffect(type) {

    const effect =
        document.getElementById("hitEffect");

    effect.className = "";

    effect.classList.add(type);
    effect.classList.add("show");

    setTimeout(() => {

        effect.className = "";

    },180);

}

    updateProgress(currentTime, duration) {

        if (duration <= 0) {

            this.progressBar.style.width = "0%";
            return;

        }

        const percent = (currentTime / duration) * 100;

        this.progressBar.style.width = percent + "%";

    }

    renderNotes(notes, currentTime) {

        for (const note of notes) {

            if (!note.hit) {

                note.update(currentTime);

            }

        }

    }

    showEndScreen(title = "Fin de la partie", message = "") {

        this.endTitle.textContent = title;

        this.finalScore.textContent =
            "Score final : " + window.scoreManager.score;

        this.endMessage.textContent = message;

        this.shareStatus.textContent = "";

        this.endScreen.classList.remove("hidden");

    }

    hideEndScreen() {

        this.endScreen.classList.add("hidden");
        this.shareStatus.textContent = "";

    }

    getShareText() {

        const score = window.scoreManager;

        return "Mon score OpenRhythm : " + score.score +
            " points | Precision : " +
            score.accuracy.toFixed(2) + "% | Meilleur combo : " +
            score.bestCombo;

    }

    async shareScore() {

        const text = this.getShareText();

        try {
            if (navigator.share) {
                await navigator.share({
                    title: "Mon score OpenRhythm",
                    text
                });
                this.shareStatus.textContent = "Score partage.";
                return;
            }

            await navigator.clipboard.writeText(text);
            this.shareStatus.textContent =
                "Score copie dans le presse-papiers.";
        } catch (error) {
            if (error.name !== "AbortError") {
                this.shareStatus.textContent =
                    "Le partage n'est pas disponible sur cet appareil.";
            }
        }

    }

    clearNotes(notes) {

        for (const note of notes) {

            note.destroy();

        }

    }

}

window.renderer = new Renderer();