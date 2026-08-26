(function () {
    // Stubs minimaux pour permettre le chargement de battle.js/arena.js en test.
    window.renderer = window.renderer || {
        lookaheadSeconds: 2
    };

    window.audioManager = window.audioManager || {
        getCurrentTime: function () { return 0; },
        loadFromURL: async function () { return true; },
        play: function () {},
        pause: function () {},
        stop: function () {},
        getDuration: function () { return 60; }
    };

    window.chart = window.chart || {
        loadFromJSON: function () {},
        getNotes: function () { return []; }
    };

    window.inputManager = window.inputManager || {
        isTouchDevice: false
    };

    if (!document.getElementById("battlefield")) {
        const container = document.createElement("div");
        container.innerHTML =
            "<div id=\"battlefield\">" +
                "<div id=\"battleTop\" class=\"battleHalf\">" +
                    "<div class=\"lane\" data-lane=\"0\"></div>" +
                    "<div class=\"lane\" data-lane=\"1\"></div>" +
                    "<div class=\"lane\" data-lane=\"2\"></div>" +
                    "<div class=\"lane\" data-lane=\"3\"></div>" +
                    "<div class=\"battleHud\">" +
                        "<span class=\"battleScore\">Score : 0</span>" +
                        "<span class=\"battleCombo\">Combo : 0</span>" +
                    "</div>" +
                    "<div class=\"battleHitLine\"></div>" +
                "</div>" +
                "<div id=\"battleDivider\"><div id=\"battleDividerFill\"></div></div>" +
                "<div id=\"battleBottom\" class=\"battleHalf\">" +
                    "<div class=\"lane\" data-lane=\"0\"></div>" +
                    "<div class=\"lane\" data-lane=\"1\"></div>" +
                    "<div class=\"lane\" data-lane=\"2\"></div>" +
                    "<div class=\"lane\" data-lane=\"3\"></div>" +
                    "<div class=\"battleHud\">" +
                        "<span class=\"battleScore\">Score : 0</span>" +
                        "<span class=\"battleCombo\">Combo : 0</span>" +
                    "</div>" +
                    "<div class=\"battleHitLine\"></div>" +
                "</div>" +
            "</div>";
        document.body.appendChild(container);

        const battlefield = document.getElementById("battlefield");
        const top = document.getElementById("battleTop");
        const bottom = document.getElementById("battleBottom");

        Object.defineProperty(battlefield, "clientHeight", { value: 600, configurable: true });
        Object.defineProperty(top, "clientHeight", { value: 300, configurable: true });
        Object.defineProperty(bottom, "clientHeight", { value: 300, configurable: true });
        Object.defineProperty(top, "clientWidth", { value: 420, configurable: true });
        Object.defineProperty(bottom, "clientWidth", { value: 420, configurable: true });

        top.querySelector(".battleHitLine").offsetTop = 200;
        bottom.querySelector(".battleHitLine").offsetTop = 200;
    }
})();
