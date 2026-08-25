const NOTE_HIT_WINDOW = 0.10;
const HOLD_START_WINDOW = 0.15;
const LANE_COLORS = ["#ff5555", "#ffaa00", "#33cc66", "#3399ff"];

class Note {

    constructor(lane, hitTime, holdDuration = 0, toLane = null) {

        this.lane = lane;
        this.hitTime = hitTime;
        this.holdDuration = Math.max(0, Number(holdDuration) || 0);
        this.releaseTime = hitTime + this.holdDuration;
        // colonne d'arrivee pour une note diagonale ; par defaut identique a lane (hold vertical classique)
        this.toLane = (toLane === null || toLane === undefined) ? lane : toLane;
        this.holding = false;

        this.hit = false;
        this.judged = false;

        this.element = document.createElement("div");
        this.element.className = "note lane" + lane;

        if (this.isHoldNote()) {
            this.element.classList.add(
                this.isDiagonal() ? "diagonal-note" : "hold-note"
            );

            if (this.isDiagonal()) {
                // degrade de la couleur de depart vers la couleur d'arrivee
                this.element.style.background =
                    "linear-gradient(to bottom, " +
                    LANE_COLORS[this.toLane] + ", " +
                    LANE_COLORS[this.lane] + ")";
            }
        }

        document
            .getElementById("playfield")
            .appendChild(this.element);

    }

   update(currentTime) {

    if (this.hit) {
        return;
    }

    const y =
        renderer.hitLineY -
        ((this.hitTime - currentTime) * renderer.pixelsPerSecond);

    if (this.isHoldNote()) {
        if (this.isDiagonal()) {
            this.updateDiagonal(y);
        } else {
            const holdHeight =
                this.holdDuration * renderer.pixelsPerSecond;

            this.element.style.height =
                holdHeight + 24 + "px";
            this.element.style.top = (y - holdHeight) + "px";
        }
        return;
    }

    this.element.style.top = y + "px";

}

    isDiagonal() {
        return this.toLane !== this.lane;
    }

    updateDiagonal(y) {

        const holdHeight =
            this.holdDuration * renderer.pixelsPerSecond;

        const laneWidth = renderer.playfield.clientWidth / 4;
        const xStart = this.lane * laneWidth + laneWidth / 2;
        const xEnd = this.toLane * laneWidth + laneWidth / 2;
        const deltaX = xStart - xEnd;

        const thickness = laneWidth - 16; // meme largeur qu'une note classique
        const boxHeight = holdHeight;
        const skewDeg =
            Math.atan2(deltaX, holdHeight) * (180 / Math.PI);

        this.element.style.left = (xEnd - thickness / 2) + "px";
        this.element.style.top = (y - holdHeight) + "px";
        this.element.style.width = thickness + "px";
        this.element.style.height = boxHeight + "px";
        this.element.style.transformOrigin = "top";
        this.element.style.transform = "skewX(" + skewDeg + "deg)";

    }

    destroy() {

        this.element.remove();

    }

    canBeHit(currentTime) {

        return Math.abs(this.hitTime - currentTime) <=
            this.getStartWindow();

    }

    canBeReleased(currentTime) {

        return Math.abs(this.releaseTime - currentTime) <= NOTE_HIT_WINDOW;

    }

    isHoldNote() {

        return this.holdDuration > 0;

    }

    getStartWindow() {

        return this.isHoldNote()
            ? HOLD_START_WINDOW
            : NOTE_HIT_WINDOW;

    }

    isMissed(currentTime) {

        const deadline = this.holding
            ? this.releaseTime
            : this.hitTime + this.getStartWindow();

        return currentTime > deadline +
            (this.holding ? NOTE_HIT_WINDOW : 0);

    }

    judge(currentTime) {

        const targetTime = this.holding
            ? this.releaseTime
            : this.hitTime;
        const delta = Math.abs(currentTime - targetTime);

        if (delta <= 0.025)
            return "perfect";

        if (delta <= 0.060)
            return "great";

        if (delta <= NOTE_HIT_WINDOW)
            return "good";

        return "miss";

    }

}

window.Note = Note;