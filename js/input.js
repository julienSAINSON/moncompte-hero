class InputManager {

    constructor() {

        this.keyMap = {
            "a": 0,
            "s": 1,
            "d": 2,
            "f": 3
        };
        this.pressedKeys = new Set();
        this.pressedPointers = new Map();

        const params = new URLSearchParams(window.location.search);
        const forceTouch = params.get("touch") === "1";

        this.isTouchDevice =
            forceTouch ||
            ("ontouchstart" in window) ||
            (navigator.maxTouchPoints > 0);

        if (this.isTouchDevice) {
            document.body.classList.add("touch-device");
            this.setupTouchInput();
            this.setupKeyboardInput(); // clavier aussi disponible sur écran tactile desktop
        } else {
            document.body.classList.add("desktop-device");
            this.setupKeyboardInput();
        }

    }

    // --------------------------------------------------
    // Desktop — clavier
    // --------------------------------------------------

    setupKeyboardInput() {

        document.addEventListener(
            "keydown",
            this.onKeyDown.bind(this)
        );
        document.addEventListener(
            "keyup",
            this.onKeyUp.bind(this)
        );
        window.addEventListener("blur", () => this.releaseAllInputs());

    }

    onKeyDown(event) {

        if (!window.game) {
            return;
        }

        const key = event.key.toLowerCase();

        if (key === " ") {
            event.preventDefault();
            window.game.toggleRecordingPause();
            return;
        }

        if (!(key in this.keyMap)) {
            return;
        }

        event.preventDefault();

        const lane = this.keyMap[key];

        if (this.pressedKeys.has(key)) {
            return;
        }

        this.pressedKeys.add(key);

        window.game.pressLane(lane);

    }

    onKeyUp(event) {

        const key = event.key.toLowerCase();

        if (!(key in this.keyMap)) {
            return;
        }

        event.preventDefault();

        if (!this.pressedKeys.delete(key) || !window.game) {
            return;
        }

        window.game.releaseLane(this.keyMap[key]);

    }

    // --------------------------------------------------
    // Mobile — écran tactile
    // --------------------------------------------------

    setupTouchInput() {

        // Les Pointer Events couvrent le tactile, le stylet et la souris.
        document.querySelectorAll(".lane").forEach((laneEl) => {

            const lane = parseInt(laneEl.dataset.lane, 10);

            laneEl.addEventListener("pointerdown", (event) => {

                event.preventDefault();
                laneEl.setPointerCapture(event.pointerId);
                this.pressedPointers.set(event.pointerId, {
                    startLane: lane,
                    currentLane: lane
                });
                this.onLanePress(lane);

            });

            laneEl.addEventListener("pointermove", (event) => {

                const pointerState = this.pressedPointers.get(event.pointerId);

                if (!pointerState) {
                    return;
                }

                // suit le doigt lors d'un glissement (notes en diagonale)
                const currentLane = this.laneFromClientX(laneEl, event.clientX);

                if (currentLane !== null) {
                    pointerState.currentLane = currentLane;
                }

            });

            const releasePointer = (event) => {

                const pointerState = this.pressedPointers.get(event.pointerId);

                if (!pointerState) {
                    return;
                }

                event.preventDefault();
                this.pressedPointers.delete(event.pointerId);
                this.onLaneRelease(pointerState.startLane, pointerState.currentLane);

            };

            laneEl.addEventListener("pointerup", releasePointer);
            laneEl.addEventListener("pointercancel", releasePointer);

        });

    }

    laneFromClientX(laneEl, clientX) {

        const container = laneEl.parentElement;

        if (!container) {
            return null;
        }

        const rect = container.getBoundingClientRect();
        const laneWidth = rect.width / 4;
        const relativeX = clientX - rect.left;
        const index = Math.floor(relativeX / laneWidth);

        return Math.max(0, Math.min(3, index));

    }

    onLanePress(lane) {

        if (!window.game) {
            return;
        }

        // Retour visuel : flash de la lane
        const laneEl = document.querySelector(
            `.lane[data-lane="${lane}"]`
        );
        if (laneEl) {
            laneEl.classList.add("touch-active");
            setTimeout(() => laneEl.classList.remove("touch-active"), 100);
        }

        window.game.pressLane(lane);

    }

    onLaneRelease(startLane, endLane = startLane) {

        if (window.game) {
            window.game.releaseLane(startLane, endLane);
        }

    }

    releaseAllInputs() {

        for (const key of this.pressedKeys) {
            window.game?.releaseLane(this.keyMap[key]);
        }

        for (const { startLane, currentLane } of this.pressedPointers.values()) {
            window.game?.releaseLane(startLane, currentLane);
        }

        this.pressedKeys.clear();
        this.pressedPointers.clear();

    }

}

window.inputManager = new InputManager();