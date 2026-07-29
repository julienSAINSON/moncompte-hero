class InputManager {

    constructor() {

        this.keyMap = {
            "a": 0,
            "s": 1,
            "d": 2,
            "f": 3
        };

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

}

window.inputManager = new InputManager();