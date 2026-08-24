const NOTE_HIT_WINDOW = 0.10;
const HOLD_START_WINDOW = 0.15;

class Note {

    constructor(lane, hitTime, holdDuration = 0) {

        this.lane = lane;
        this.hitTime = hitTime;
        this.holdDuration = Math.max(0, Number(holdDuration) || 0);
        this.releaseTime = hitTime + this.holdDuration;
        this.holding = false;

        this.hit = false;
        this.judged = false;

        this.element = document.createElement("div");
        this.element.className = "note lane" + lane;

        if (this.isHoldNote()) {
            this.element.classList.add("hold-note");
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
        const holdHeight =
            this.holdDuration * renderer.pixelsPerSecond;

        this.element.style.height =
            holdHeight + 24 + "px";
        this.element.style.top = (y - holdHeight) + "px";
        return;
    }

    this.element.style.top = y + "px";

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