class Renderer {

    constructor() {

        this.playfield = document.getElementById("playfield");

        this.progressBar = document.getElementById("progressBar");

        this.endScreen = document.getElementById("endScreen");

        this.finalScore = document.getElementById("finalScore");

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

    showEndScreen() {

        this.finalScore.textContent =
            "Score final : " + window.scoreManager.score;

        this.endScreen.classList.remove("hidden");

    }

    hideEndScreen() {

        this.endScreen.classList.add("hidden");

    }

    clearNotes(notes) {

        for (const note of notes) {

            note.destroy();

        }

    }

}

window.renderer = new Renderer();