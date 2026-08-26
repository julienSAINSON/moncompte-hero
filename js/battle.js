//====================================================
// battle.js - Mode bataille (2 joueurs, ecran partage)
//====================================================

const BATTLE_HIT_WINDOW = 0.10;
const BATTLE_HOLD_START_WINDOW = 0.15;
const BATTLE_EDGE_MARGIN = 100; // distance (px) entre le bord de l'ecran et la ligne verte
const BATTLE_POINTS = { perfect: 3, great: 2, good: 1, miss: -3 };
const BATTLE_PX_PER_POINT = 6; // sensibilite du deplacement de la barre centrale
const BATTLE_LANE_COLORS = ["#ff5555", "#ffaa00", "#33cc66", "#3399ff"];

function isTouchInputActive() {
    return !!(window.inputManager && window.inputManager.isTouchDevice);
}

class BattlePlayer {

    constructor(rootEl) {

        this.root = rootEl;
        this.notes = [];

        this.balance = 0;
        this.score = 0;
        this.combo = 0;

        this.scoreEl = rootEl.querySelector(".battleScore");
        this.comboEl = rootEl.querySelector(".battleCombo");

        this.hitLineY = 0;
        this.pixelsPerSecond = 0;

        this.updateLayout();

    }

    updateLayout() {

        this.hitLineY = this.root.clientHeight - BATTLE_EDGE_MARGIN;
        this.pixelsPerSecond = this.hitLineY / renderer.lookaheadSeconds;

    }

    spawnNotes(chartNotes) {

        for (const n of chartNotes) {

            const holdDuration = n.holdDuration || 0;

            const element = document.createElement("div");
            element.className = "note lane" + n.lane;

            const toLane = isTouchInputActive()
                ? ((n.toLane === null || n.toLane === undefined) ? n.lane : n.toLane)
                : n.lane; // au clavier, la diagonale est ignorable visuellement : hold classique

            if (holdDuration > 0) {
                element.classList.add(
                    toLane !== n.lane ? "diagonal-note" : "hold-note"
                );

                if (toLane !== n.lane) {
                    // degrade de la couleur de depart vers la couleur d'arrivee
                    element.style.background =
                        "linear-gradient(to bottom, " +
                        BATTLE_LANE_COLORS[toLane] + ", " +
                        BATTLE_LANE_COLORS[n.lane] + ")";
                }
            }

            this.root.appendChild(element);

            this.notes.push({
                lane: n.lane,
                hitTime: n.hitTime,
                holdDuration,
                releaseTime: n.hitTime + holdDuration,
                // colonne d'arrivee pour une note diagonale ; null/undefined = hold vertical classique
                toLane,
                judged: false,
                hit: false,
                holding: false,
                element
            });

        }

    }

    clearNotes() {

        for (const note of this.notes) {
            note.element.remove();
        }

        this.notes = [];

    }

    isHoldNote(note) {
        return note.holdDuration > 0;
    }

    getStartWindow(note) {
        return this.isHoldNote(note)
            ? BATTLE_HOLD_START_WINDOW
            : BATTLE_HIT_WINDOW;
    }

    updateNotes(currentTime) {

        for (const note of this.notes) {

            if (note.hit) {
                continue;
            }

            const y =
                this.hitLineY -
                ((note.hitTime - currentTime) * this.pixelsPerSecond);

            if (this.isHoldNote(note)) {

                const holdHeight =
                    note.holdDuration * this.pixelsPerSecond;

                if (note.toLane !== note.lane) {
                    this.updateDiagonal(note, y, holdHeight);
                } else {
                    note.element.style.height = holdHeight + 24 + "px";
                    note.element.style.top = (y - holdHeight) + "px";
                }

            } else {

                note.element.style.top = y + "px";

            }

        }

    }

    updateDiagonal(note, y, holdHeight) {

        const laneWidth = this.root.clientWidth / 4;
        const xStart = note.lane * laneWidth + laneWidth / 2;
        const xEnd = note.toLane * laneWidth + laneWidth / 2;
        const deltaX = xStart - xEnd;

        const thickness = laneWidth - 16; // meme largeur qu'une note classique
        const boxHeight = holdHeight;
        const skewDeg =
            Math.atan2(deltaX, holdHeight) * (180 / Math.PI);

        note.element.style.left = (xEnd - thickness / 2) + "px";
        note.element.style.top = (y - holdHeight) + "px";
        note.element.style.width = thickness + "px";
        note.element.style.height = boxHeight + "px";
        note.element.style.transformOrigin = "top";
        note.element.style.transform = "skewX(" + skewDeg + "deg)";

    }

    checkMisses(currentTime) {

        for (const note of this.notes) {

            if (note.judged) {
                continue;
            }

            const deadline = note.holding
                ? note.releaseTime
                : note.hitTime + this.getStartWindow(note);

            const missed = currentTime > deadline +
                (note.holding ? BATTLE_HIT_WINDOW : 0);

            if (missed) {

                note.judged = true;
                note.hit = true;
                note.element.remove();
                this.registerJudgement("miss");

            }

        }

    }

    judgeNote(note, currentTime) {

        const targetTime = note.holding
            ? note.releaseTime
            : note.hitTime;

        const delta = Math.abs(currentTime - targetTime);

        if (delta <= 0.025) return "perfect";
        if (delta <= 0.060) return "great";
        if (delta <= BATTLE_HIT_WINDOW) return "good";

        return "miss";

    }

    press(lane, currentTime) {

        let bestNote = null;
        let bestDelta = Infinity;

        for (const note of this.notes) {

            if (note.judged || note.lane !== lane) {
                continue;
            }

            const delta = Math.abs(note.hitTime - currentTime);

            if (delta < bestDelta) {
                bestDelta = delta;
                bestNote = note;
            }

        }

        if (!bestNote) {
            return;
        }

        if (bestDelta > this.getStartWindow(bestNote)) {
            return;
        }

        if (this.isHoldNote(bestNote)) {
            bestNote.holding = true;
            bestNote.element.classList.add("holding");
            return;
        }

        const judgement = this.judgeNote(bestNote, currentTime);

        bestNote.hit = true;
        bestNote.judged = true;
        bestNote.element.remove();
        this.registerJudgement(judgement);

    }

    release(lane, currentTime, requireExactLane = false) {

        // au clavier (pas de glissement possible), la diagonale reste cosmetique :
        // on valide avec la touche de depart. Au tactile, la colonne d'arrivee reelle est exigee.
        const heldNote = this.notes.find((note) =>
            note.holding && !note.judged &&
            (requireExactLane ? note.toLane === lane : note.lane === lane)
        );

        if (!heldNote) {
            return;
        }

        const canRelease =
            Math.abs(heldNote.releaseTime - currentTime) <= BATTLE_HIT_WINDOW;

        const judgement = canRelease
            ? this.judgeNote(heldNote, currentTime)
            : "miss";

        heldNote.hit = true;
        heldNote.judged = true;
        heldNote.element.remove();
        this.registerJudgement(judgement);

    }

    registerJudgement(judgement) {

        if (judgement === "miss") {
            this.combo = 0;
        } else {
            this.combo++;
            this.score += judgement === "perfect"
                ? 300
                : judgement === "great" ? 200 : 100;
        }

        this.balance += BATTLE_POINTS[judgement];

        this.updateHUD();

    }

    updateHUD() {

        this.scoreEl.textContent = "Score : " + this.score;
        this.comboEl.textContent = "Combo : " + this.combo;

    }

    reset() {

        this.clearNotes();
        this.balance = 0;
        this.score = 0;
        this.combo = 0;
        this.updateHUD();

    }

}

class BattleGame {

    constructor() {

        this.field = document.getElementById("battlefield");
        this.divider = document.getElementById("battleDivider");
        this.dividerFill = document.getElementById("battleDividerFill");

        this.top = new BattlePlayer(document.getElementById("battleTop"));
        this.bottom = new BattlePlayer(document.getElementById("battleBottom"));

        this.running = false;
        this.animationFrame = null;
        this.preRollEndsAt = null;
        this.preRollDuration = 0;

        this.bindInputs();

        window.addEventListener("resize", () => {
            this.top.updateLayout();
            this.bottom.updateLayout();
        });

    }

    bindInputs() {

        const keyMapBottom = { "q": 0, "s": 1, "d": 2, "f": 3 };
        const keyMapTop = { "u": 0, "i": 1, "o": 2, "p": 3 };
        const pressedBottom = new Set();
        const pressedTop = new Set();

        document.addEventListener("keydown", (event) => {

            if (!this.running) {
                return;
            }

            const key = event.key.toLowerCase();

            if (key in keyMapBottom && !pressedBottom.has(key)) {
                pressedBottom.add(key);
                this.bottom.press(keyMapBottom[key], this.getGameTime());
            } else if (key in keyMapTop && !pressedTop.has(key)) {
                pressedTop.add(key);
                this.top.press(keyMapTop[key], this.getGameTime());
            }

        });

        document.addEventListener("keyup", (event) => {

            const key = event.key.toLowerCase();

            if (key in keyMapBottom) {
                pressedBottom.delete(key);
                if (this.running) {
                    this.bottom.release(keyMapBottom[key], this.getGameTime());
                }
            } else if (key in keyMapTop) {
                pressedTop.delete(key);
                if (this.running) {
                    this.top.release(keyMapTop[key], this.getGameTime());
                }
            }

        });

        this.bindTouch(this.bottom);
        this.bindTouch(this.top);

    }

    bindTouch(player) {

        player.root.querySelectorAll(".lane").forEach((laneEl) => {

            const lane = parseInt(laneEl.dataset.lane, 10);
            const currentLaneByPointer = new Map();

            laneEl.addEventListener("pointerdown", (event) => {

                if (!this.running) {
                    return;
                }

                event.preventDefault();
                laneEl.setPointerCapture(event.pointerId);
                currentLaneByPointer.set(event.pointerId, lane);
                player.press(lane, this.getGameTime());

            }, { passive: false });

            laneEl.addEventListener("pointermove", (event) => {

                if (!currentLaneByPointer.has(event.pointerId)) {
                    return;
                }

                event.preventDefault();

                // suit le doigt lors d'un glissement (notes en diagonale)
                const rect = player.root.getBoundingClientRect();
                const laneWidth = rect.width / 4;
                const relativeX = event.clientX - rect.left;
                const currentLane = Math.max(
                    0,
                    Math.min(3, Math.floor(relativeX / laneWidth))
                );

                currentLaneByPointer.set(event.pointerId, currentLane);

            }, { passive: false });

            const releasePointer = (event) => {

                if (!this.running) {
                    return;
                }

                // utilise la position exacte au relachement plutot que le dernier pointermove connu
                const rect = player.root.getBoundingClientRect();
                const laneWidth = rect.width / 4;
                const relativeX = event.clientX - rect.left;
                const releaseLane = Math.max(
                    0,
                    Math.min(3, Math.floor(relativeX / laneWidth))
                );

                currentLaneByPointer.delete(event.pointerId);

                event.preventDefault();
                player.release(releaseLane, this.getGameTime(), true);

            };

            laneEl.addEventListener("pointerup", releasePointer, { passive: false });
            laneEl.addEventListener("pointercancel", releasePointer, { passive: false });

            // filet de securite : sur certains ecrans tactiles, un geste natif (retour, defilement)
            // peut intercepter le glissement avant meme les Pointer Events. On bloque au plus tot.
            laneEl.addEventListener(
                "touchstart",
                (event) => event.preventDefault(),
                { passive: false }
            );
            laneEl.addEventListener(
                "touchmove",
                (event) => event.preventDefault(),
                { passive: false }
            );

        });

    }

    getGameTime() {

        if (!this.preRollEndsAt) {
            return audioManager.getCurrentTime();
        }

        const remaining = this.preRollEndsAt - performance.now();

        if (remaining > 0) {
            return -remaining / 1000;
        }

        this.preRollEndsAt = null;
        audioManager.play();

        return audioManager.getCurrentTime();

    }

    async start(chartPath, musicPath) {

        if (this.running) {
            return false;
        }

        this.reset();

        const chartLoaded = await this.loadChart(chartPath);

        if (!chartLoaded) {
            alert(
                "Impossible de charger la partition par defaut: " +
                chartPath
            );
            return false;
        }

        const audioLoaded =
            await audioManager.loadFromURL(encodeURI(musicPath));

        if (!audioLoaded) {
            alert(
                "Impossible de charger le MP3 par defaut: " +
                musicPath
            );
            return false;
        }

        this.field.classList.remove("hidden");

        this.top.updateLayout();
        this.bottom.updateLayout();
        this.resetDivider();

        const firstNote = this.chartNotes[0];

        this.preRollDuration = firstNote
            ? Math.max(0, renderer.lookaheadSeconds - firstNote.hitTime)
            : 0;

        this.running = true;

        if (this.preRollDuration <= 0) {
            audioManager.play();
        } else {
            this.preRollEndsAt =
                performance.now() + this.preRollDuration * 1000;
        }

        this.loop();

        return true;

    }

    async loadChart(path) {

        try {

            const response = await fetch(path, { cache: "no-store" });

            if (!response.ok) {
                return this.loadFallbackChart();
            }

            const json = await response.json();

            chart.loadFromJSON(json);
            this.chartNotes = chart.getNotes();

            this.top.spawnNotes(this.chartNotes);
            this.bottom.spawnNotes(this.chartNotes);

            return true;

        } catch (error) {

            console.error(error);
            return this.loadFallbackChart();

        }

    }

    loadFallbackChart() {

        // Secours si fetch() echoue (ex: page ouverte en file://)
        if (!window.DEFAULT_PLAY_CHART_DATA) {
            return false;
        }

        chart.loadFromJSON(window.DEFAULT_PLAY_CHART_DATA);
        this.chartNotes = chart.getNotes();

        this.top.spawnNotes(this.chartNotes);
        this.bottom.spawnNotes(this.chartNotes);

        return true;

    }

    reset() {

        this.running = false;

        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
        }

        this.preRollEndsAt = null;

        this.top.reset();
        this.bottom.reset();
        this.resetDivider();

    }

    resetDivider() {

        this.divider.style.top = "50%";
        this.dividerFill.style.width = "0%";

    }

    loop() {

        if (!this.running) {
            return;
        }

        const currentTime = this.getGameTime();

        this.top.updateNotes(currentTime);
        this.bottom.updateNotes(currentTime);

        this.top.checkMisses(currentTime);
        this.bottom.checkMisses(currentTime);

        this.updateDivider();
        this.updateProgress(currentTime);

        if (!this.running) {
            return;
        }

        this.animationFrame =
            requestAnimationFrame(() => this.loop());

    }

    updateProgress(currentTime) {

        const duration = audioManager.getDuration();

        if (duration <= 0) {
            this.dividerFill.style.width = "0%";
            return;
        }

        const percent = Math.max(0, Math.min(100, (currentTime / duration) * 100));

        this.dividerFill.style.width = percent + "%";

    }

    updateDivider() {

        const fieldHeight = this.field.clientHeight;
        const centerY = fieldHeight / 2;
        const maxShift = Math.max(0, centerY - BATTLE_EDGE_MARGIN);

        const diff = this.top.balance - this.bottom.balance;

        const shift = Math.max(
            -maxShift,
            Math.min(maxShift, diff * BATTLE_PX_PER_POINT)
        );

        this.divider.style.top = (centerY + shift) + "px";

        if (maxShift <= 0) {
            return;
        }

        if (shift >= maxShift) {
            this.endByLineReached("bottom");
        } else if (shift <= -maxShift) {
            this.endByLineReached("top");
        }

    }

    endByLineReached(loserId) {

        this.stop();

        const loserLabel = loserId === "top" ? "Joueur 2" : "Joueur 1";
        const winnerLabel = loserId === "top" ? "Joueur 1" : "Joueur 2";

        this.showEnd(
            "Partie terminee",
            loserLabel + " a ete repousse jusqu'a sa ligne. " +
            winnerLabel + " gagne !"
        );

    }

    endBySongFinished() {

        this.stop();

        let message;

        if (this.top.balance === this.bottom.balance) {
            message = "Egalite parfaite !";
        } else {
            message = this.top.balance > this.bottom.balance
                ? "Joueur 2 gagne !"
                : "Joueur 1 gagne !";
        }

        this.showEnd("Fin de la musique", message);

    }

    showEnd(title, message) {

        document.getElementById("endTitle").textContent = title;

        document.getElementById("finalScore").textContent =
            "Joueur 1 : " + this.bottom.score +
            " | Joueur 2 : " + this.top.score;

        document.getElementById("endMessage").textContent = message;
        document.getElementById("shareStatus").textContent = "";

        document.getElementById("endScreen").classList.remove("hidden");

    }

    stop() {

        this.running = false;

        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
        }

        audioManager.stop();

    }

}

window.battleGame = new BattleGame();
