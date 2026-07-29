class ScoreManager {

    constructor() {

        this.reset();

    }

    reset() {

        this.score = 0;
        this.combo = 0;

        this.perfect = 0;
        this.great = 0;
        this.good = 0;
        this.miss = 0;
        this.bestCombo = 0;

        this.accuracy = 100;

        this.updateHUD();

    }

    addJudgement(judgement) {

        switch (judgement) {

            case "perfect":
                this.score += 300;
                this.combo++;
if (this.combo > this.bestCombo) {
    this.bestCombo = this.combo;
}
                this.perfect++;
                break;

            case "great":
                this.score += 200;
                this.combo++;
if (this.combo > this.bestCombo) {
    this.bestCombo = this.combo;
}
                this.great++;
                break;

            case "good":
                this.score += 100;
                this.combo++;
if (this.combo > this.bestCombo) {
    this.bestCombo = this.combo;
}
                this.good++;
                break;

            case "miss":
                this.combo = 0;
                this.miss++;
                break;

        }

        this.computeAccuracy();
        this.updateHUD();

    }

    computeAccuracy() {

        const total =
            this.perfect +
            this.great +
            this.good +
            this.miss;

        if (total === 0) {

            this.accuracy = 100;
            return;

        }

        const points =
            this.perfect * 300 +
            this.great * 200 +
            this.good * 100;

        this.accuracy =
            (points / (total * 300)) * 100;

    }

    updateHUD() {

        document.getElementById("score").textContent =
            "Score : " + this.score;

        document.getElementById("combo").textContent =
            "Combo : " + this.combo;

document.getElementById("bestCombo").textContent =
    "Meilleur combo : " + this.bestCombo;

        document.getElementById("accuracy").textContent =
            this.accuracy.toFixed(2) + " %";

    }

}

window.scoreManager = new ScoreManager();