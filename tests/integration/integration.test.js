function loadGameFrame(url, width, height) {
    return new Promise((resolve, reject) => {
        const iframe = document.createElement("iframe");

        iframe.style.position = "absolute";
        iframe.style.left = "-12000px";
        iframe.style.top = "0";
        iframe.style.width = width + "px";
        iframe.style.height = height + "px";
        iframe.style.border = "0";

        const timeout = setTimeout(() => {
            iframe.remove();
            reject(new Error("Timeout chargement integration iframe"));
        }, 12000);

        iframe.onload = function () {
            setTimeout(() => {
                clearTimeout(timeout);
                resolve(iframe);
            }, 500);
        };

        iframe.src = url;
        document.body.appendChild(iframe);
    });
}

function isHidden(el) {
    return el.classList.contains("hidden");
}

function cleanupGameFrame(frame) {
    if (frame && frame.remove) {
        frame.remove();
    }
}

test("Integration sans mode: requiert une URL de salle Arena", async function () {
    const frame = await loadGameFrame(
        "../index.html?default-arena-test=1",
        1366,
        768
    );

    try {
        const doc = frame.contentDocument;

        assert.ok(
            !isHidden(doc.getElementById("arenaRoomRequiredScreen")),
            "Une URL Arena sans salle doit afficher les instructions de jonction"
        );
        assert.ok(isHidden(doc.getElementById("arenaCreateScreen")));
    } finally {
        cleanupGameFrame(frame);
    }
});

test("Integration Arena GM sans salle: autorise la creation", async function () {
    const frame = await loadGameFrame("../index.html?gm=1", 1366, 768);

    try {
        const doc = frame.contentDocument;

        assert.ok(!isHidden(doc.getElementById("arenaCreateScreen")));
        assert.ok(isHidden(doc.getElementById("arenaRoomRequiredScreen")));
    } finally {
        cleanupGameFrame(frame);
    }
});

test("Integration mode 0: etat UI initial coherent", async function () {
    const frame = await loadGameFrame("../index.html?mode=0", 1366, 768);

    try {
        const doc = frame.contentDocument;

        const menuButton = doc.getElementById("menuButton");
        const playButton = doc.getElementById("playButton");
        const selectedSongInfo = doc.getElementById("selectedSongInfo");

        assert.ok(isHidden(menuButton), "menuButton doit etre cache en mode 0");
        assert.ok(!isHidden(playButton), "playButton doit etre visible en mode 0");
        assert.ok(isHidden(selectedSongInfo), "selectedSongInfo doit rester cache en mode 0");
    } finally {
        cleanupGameFrame(frame);
    }
});

test("Integration mode 1: menu visible, edition reservee au GM", async function () {
    const frame = await loadGameFrame("../index.html?mode=1", 1366, 768);

    try {
        const doc = frame.contentDocument;

        assert.ok(!isHidden(doc.getElementById("menuButton")));
        assert.ok(
            doc.getElementById("modeSelector")
                .classList.contains("developerHidden")
        );
        assert.ok(isHidden(doc.getElementById("editionControls")));
    } finally {
        cleanupGameFrame(frame);
    }
});

test("Integration mode 1 GM: bouton Edition visible", async function () {
    const frame = await loadGameFrame("../index.html?mode=1&gm=1", 1366, 768);

    try {
        const doc = frame.contentDocument;

        assert.ok(!isHidden(doc.getElementById("menuButton")));
        assert.ok(!isHidden(doc.getElementById("modeSelector")));
        assert.ok(isHidden(doc.getElementById("editionControls")));
    } finally {
        cleanupGameFrame(frame);
    }
});

test("Integration mode 2: start declenche startBattle avec la chanson selectionnee", async function () {
    const frame = await loadGameFrame("../index.html?mode=2", 1366, 768);

    try {
        const cw = frame.contentWindow;
        const doc = frame.contentDocument;
        const bonusControls = doc.getElementById("battleBonusControls");
        const bonusToggle = doc.getElementById("battleBonusToggle");

        let called = null;

        cw.battleGame.start = async function (chartPath, musicPath) {
            called = { chartPath: chartPath, musicPath: musicPath };
            return true;
        };

        cw.game.selectSong({
            id: "test-song",
            title: "Test Song",
            folder: "assets/songs/test-song",
            music: "music.mp3",
            defaultDifficulty: "normal",
            charts: {
                easy: "charts/easy.json",
                normal: "charts/normal.json",
                hard: "charts/hard.json"
            }
        });
        cw.game.selectDifficulty("hard");

        await cw.game.start();

        assert.ok(!!called, "battleGame.start doit etre appele");
        assert.equal(called.chartPath, "assets/songs/test-song/charts/hard.json");
        assert.equal(called.musicPath, "assets/songs/test-song/music.mp3");

        assert.ok(isHidden(doc.getElementById("hud")), "HUD doit etre masque en battle");
        assert.ok(isHidden(doc.getElementById("game")), "Zone solo doit etre masquee en battle");
        assert.ok(isHidden(doc.getElementById("progressContainer")), "Progress solo doit etre massee en battle");
        assert.ok(!isHidden(bonusControls), "Case Notes bonus doit etre visible en battle");

        bonusToggle.checked = false;
        bonusToggle.dispatchEvent(new Event("change"));
        assert.equal(cw.battleGame.bonusEnabled, false);
    } finally {
        cleanupGameFrame(frame);
    }
});

test("Integration mode 3 joueur: menu et start caches", async function () {
    const frame = await loadGameFrame("../index.html?mode=3&room=ABCDE", 390, 844);

    try {
        const doc = frame.contentDocument;

        const menuButton = doc.getElementById("menuButton");
        const playButton = doc.getElementById("playButton");
        const rankOverlay = doc.getElementById("arenaRankOverlay");

        assert.ok(isHidden(menuButton), "menuButton doit etre cache pour un joueur arena");
        assert.ok(isHidden(playButton), "playButton doit etre cache pour un joueur arena");
        assert.ok(rankOverlay, "Indicateur de rang Arena absent de la piste");
    } finally {
        cleanupGameFrame(frame);
    }
});

test("Integration mode 3 GM: joinRoom succes masque l'ecran de jonction", async function () {
    const frame = await loadGameFrame("../index.html?mode=3&room=ABCDE&gm=1", 390, 844);

    try {
        const cw = frame.contentWindow;
        const doc = frame.contentDocument;

        cw.arenaManager.joinRoom = async function () {
            return { error: null };
        };

        doc.getElementById("arenaNameInput").value = "GM";

        await cw.game.joinArenaRoom();

        assert.ok(isHidden(doc.getElementById("arenaJoinScreen")), "arenaJoinScreen doit etre masque apres join OK");

        const waitingScreen = doc.getElementById("arenaWaitingScreen");
        assert.ok(isHidden(waitingScreen), "Un GM ne doit pas etre envoye en waiting screen");
    } finally {
        cleanupGameFrame(frame);
    }
});
