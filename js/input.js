class InputManager {

    constructor() {

        this.keyMap = {
            "a": 0,
            "s": 1,
            "d": 2,
            "f": 3
        };

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

    }

    onKeyDown(event) {

        if (!window.game) {
            return;
        }

        const key = event.key.toLowerCase();

        if (!(key in this.keyMap)) {
            return;
        }

        event.preventDefault();

        const lane = this.keyMap[key];

        window.game.hitLane(lane);

    }

    // --------------------------------------------------
    // Mobile — écran tactile
    // --------------------------------------------------

    setupTouchInput() {

        // Remplace les étiquettes clavier par des indicateurs tactiles
        const labels = ["◀", "◁", "▷", "▶"];
        document.querySelectorAll(".keyHint").forEach((el, i) => {
            el.textContent = labels[i];
        });

        // Écoute le touchstart sur chaque lane
        document.querySelectorAll(".lane").forEach((laneEl) => {

            const lane = parseInt(laneEl.dataset.lane, 10);

            laneEl.addEventListener("touchstart", (e) => {

                e.preventDefault();
                this.onLaneTap(lane);

            }, { passive: false });

        });

    }

    onLaneTap(lane) {

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

        window.game.hitLane(lane);

    }

}

window.inputManager = new InputManager();