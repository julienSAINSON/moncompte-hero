class InputManager {

    constructor() {

        this.keyMap = {
            "q": 0,
            "s": 1,
            "d": 2,
            "f": 3
        };
        this.pressedKeys = new Set();
        this.pressedPointers = new Map();

        const params = new URLSearchParams(window.location.search);
        const touchParam = params.get("touch");

        this.isTouchDevice =
            touchParam === "1" ? true :
            touchParam === "0" ? false :
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

    isTypingInInput(target) {

        return !!target && (
            target.tagName === "INPUT" ||
            target.tagName === "TEXTAREA"
        );

    }

    onKeyDown(event) {

        if (!window.game) {
            return;
        }

        if (this.isTypingInInput(event.target)) {
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

        if (this.isTypingInInput(event.target)) {
            return;
        }

        const key = event.key.toLowerCase();

        if (!(key in this.keyMap)) {
            return;
        }

        event.preventDefault();

        if (!this.pressedKeys.delete(key) || !window.game) {
            return;
        }

        // relachement clavier : pas de glissement possible, requireExactLane reste false
        window.game.releaseLane(this.keyMap[key]);

    }

    // --------------------------------------------------
    // Mobile — écran tactile
    // --------------------------------------------------

    setupTouchInput() {

        // empeche le menu contextuel declenche par un appui long (hold notes),
        // sans bloquer le clic droit ailleurs sur la page (ex: copier le QR code)
        document.addEventListener("contextmenu", (event) => {
            if (event.target.closest(".lane")) {
                event.preventDefault();
            }
        });

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

            }, { passive: false });

            laneEl.addEventListener("pointermove", (event) => {

                const pointerState = this.pressedPointers.get(event.pointerId);

                if (!pointerState) {
                    return;
                }

                event.preventDefault();

                // suit le doigt lors d'un glissement (notes en diagonale)
                const currentLane = this.laneFromClientX(laneEl, event.clientX);

                if (currentLane !== null) {
                    pointerState.currentLane = currentLane;
                }

            }, { passive: false });

            const releasePointer = (event) => {

                const pointerState = this.pressedPointers.get(event.pointerId);

                if (!pointerState) {
                    return;
                }

                event.preventDefault();
                this.pressedPointers.delete(event.pointerId);

                // utilise la position exacte au relachement plutot que le dernier pointermove connu
                const releaseLane =
                    this.laneFromClientX(laneEl, event.clientX) ??
                    pointerState.currentLane;

                this.onLaneRelease(pointerState.startLane, releaseLane);

            };

            laneEl.addEventListener("pointerup", releasePointer, { passive: false });
            laneEl.addEventListener("pointercancel", releasePointer, { passive: false });

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
            // relachement tactile : la colonne d'arrivee reelle est exigee (glissement possible)
            window.game.releaseLane(startLane, endLane, true);
        }

    }

    releaseAllInputs() {

        for (const key of this.pressedKeys) {
            window.game?.releaseLane(this.keyMap[key]);
        }

        for (const { startLane, currentLane } of this.pressedPointers.values()) {
            window.game?.releaseLane(startLane, currentLane, true);
        }

        this.pressedKeys.clear();
        this.pressedPointers.clear();

    }

}

window.inputManager = new InputManager();