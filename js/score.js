class ScoreManager {

    constructor() {

        this.reset();

    }

    getComboMultiplier(combo) {

        if (combo >= 50) return 4;
        if (combo >= 25) return 3;
        if (combo >= 10) return 2;

        return 1;

    }

    reset() {

        this.score = 0;
        this.combo = 0;
        this.consecutiveMisses = 0;

        this.perfect = 0;
        this.great = 0;
        this.good = 0;
        this.miss = 0;
        this.bestCombo = 0;

        this.accuracy = 100;

        // multiplicateur affiche a l'ecran suite au dernier jugement (null = rien a afficher)
        this.lastMultiplierChange = null;

        this.updateHUD();

    }

    addJudgement(judgement) {

        const multiplierBefore = this.getComboMultiplier(this.combo);

        this.lastMultiplierChange = null;

        switch (judgement) {

            case "perfect":
                this.combo++;
                this.consecutiveMisses = 0;
                this.score += 300 * this.getComboMultiplier(this.combo);
if (this.combo > this.bestCombo) {
    this.bestCombo = this.combo;
}
                this.perfect++;
                break;

            case "great":
                this.combo++;
                this.consecutiveMisses = 0;
                this.score += 200 * this.getComboMultiplier(this.combo);
if (this.combo > this.bestCombo) {
    this.bestCombo = this.combo;
}
                this.great++;
                break;

            case "good":
                this.combo++;
                this.consecutiveMisses = 0;
                this.score += 100 * this.getComboMultiplier(this.combo);
if (this.combo > this.bestCombo) {
    this.bestCombo = this.combo;
}
                this.good++;
                break;

            case "miss":
                this.combo = 0;
                this.consecutiveMisses++;
                this.miss++;
                break;

        }

        const multiplierAfter = this.getComboMultiplier(this.combo);

        if (judgement === "miss") {

            // signale le retour a x1 uniquement si un multiplicateur etait actif
            if (multiplierBefore !== 1) {
                this.lastMultiplierChange = 1;
            }

        } else if (multiplierAfter !== multiplierBefore) {

            this.lastMultiplierChange = multiplierAfter;

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