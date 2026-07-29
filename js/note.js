class Note {

    constructor(lane, hitTime) {

        this.lane = lane;
        this.hitTime = hitTime;

        this.hit = false;
        this.judged = false;

        this.element = document.createElement("div");
        this.element.className = "note lane" + lane;

        document
            .getElementById("playfield")
            .appendChild(this.element);

    }

   update(currentTime) {

    if (this.hit) {
        return;
    }

    const HIT_LINE_Y = 600;
    const PIXELS_PER_SECOND = 300;

    const y =
        HIT_LINE_Y -
        ((this.hitTime - currentTime) * PIXELS_PER_SECOND);

    this.element.style.top = y + "px";

}

    destroy() {

        this.element.remove();

    }

    canBeHit(currentTime) {

        return Math.abs(this.hitTime - currentTime) <= 0.10;

    }

    isMissed(currentTime) {

        return currentTime > this.hitTime + 0.10;

    }

    judge(currentTime) {

        const delta = Math.abs(currentTime - this.hitTime);

        if (delta <= 0.025)
            return "perfect";

        if (delta <= 0.060)
            return "great";

        if (delta <= 0.100)
            return "good";

        return "miss";

    }

}

window.Note = Note;