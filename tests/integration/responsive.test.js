function intersectArea(a, b) {
    const left = Math.max(a.left, b.left);
    const top = Math.max(a.top, b.top);
    const right = Math.min(a.right, b.right);
    const bottom = Math.min(a.bottom, b.bottom);

    if (right <= left || bottom <= top) {
        return 0;
    }

    return (right - left) * (bottom - top);
}

function loadArenaFrame(width, height) {
    return new Promise((resolve, reject) => {
        const iframe = document.createElement("iframe");

        iframe.style.position = "absolute";
        iframe.style.left = "-10000px";
        iframe.style.top = "0";
        iframe.style.width = width + "px";
        iframe.style.height = height + "px";
        iframe.style.border = "0";

        const timeout = setTimeout(() => {
            iframe.remove();
            reject(new Error("Timeout chargement iframe responsive"));
        }, 12000);

        iframe.onload = function () {
            setTimeout(() => {
                clearTimeout(timeout);
                resolve(iframe);
            }, 450);
        };

        iframe.src = "../index.html?mode=3&room=ABCDE&gm=1&touch=1";
        document.body.appendChild(iframe);
    });
}

function cleanupFrame(frame) {
    if (frame && frame.remove) {
        frame.remove();
    }
}

async function inspectArenaLayout(width, height) {
    const frame = await loadArenaFrame(width, height);

    try {
        const doc = frame.contentDocument;
        const win = frame.contentWindow;

        const sidePanel = doc.getElementById("arenaSidePanel");
        const mascot = doc.getElementById("arenaMascot");
        const leaderboard = doc.getElementById("arenaLeaderboard");
        const playfield = doc.getElementById("playfield");

        assert.ok(sidePanel, "arenaSidePanel absent");
        assert.ok(leaderboard, "arenaLeaderboard absent");
        assert.ok(playfield, "playfield absent");

        const sideStyle = win.getComputedStyle(sidePanel);
        const mascotStyle = mascot ? win.getComputedStyle(mascot) : null;

        const sideRect = sidePanel.getBoundingClientRect();
        const playRect = playfield.getBoundingClientRect();

        const overlap = intersectArea(sideRect, playRect);
        const playArea = playRect.width * playRect.height;
        const overlapRatio = playArea > 0 ? overlap / playArea : 0;

        return {
            sideStyle: sideStyle,
            mascotStyle: mascotStyle,
            overlapRatio: overlapRatio,
            sideWidth: sideRect.width,
            mascotHeight: mascot ? mascot.getBoundingClientRect().height : 0,
            hiddenClass: sidePanel.classList.contains("hidden")
        };
    } finally {
        cleanupFrame(frame);
    }
}

test("Responsive mobile 360x800: panneau Arena compact et non bloquant", async function () {
    const result = await inspectArenaLayout(360, 800);

    assert.equal(result.hiddenClass, false, "Panneau Arena cache en mobile");
    assert.ok(result.sideWidth <= 180.5, "Panneau Arena trop large en mobile");

    assert.ok(result.mascotHeight <= 1, "Mascotte doit etre masquee en mobile");

    assert.ok(result.overlapRatio < 0.1, "Recouvrement excessif du playfield en mobile");
});

test("Responsive tablette 768x1024: panneau Arena compact", async function () {
    const result = await inspectArenaLayout(768, 1024);

    assert.equal(result.hiddenClass, false, "Panneau Arena cache en tablette");
    assert.ok(result.sideWidth <= 180.5, "Panneau Arena trop large en tablette");
    assert.ok(result.mascotHeight <= 1, "Mascotte doit etre masquee en tablette");
});

test("Responsive tablette tactile: guide J1 battle visible", async function () {
    const frame = await loadArenaFrame(768, 1024);

    try {
        const doc = frame.contentDocument;
        const battlefield = doc.getElementById("battlefield");
        const bottomGuide = doc.querySelector("#battleBottom .battleKeyGuide");

        doc.getElementById("menu").classList.add("hidden");
        doc.getElementById("hud").classList.add("hidden");
        doc.getElementById("game").classList.add("hidden");
        doc.getElementById("progressContainer").classList.add("hidden");
        battlefield.classList.remove("hidden");

        const guideRect = bottomGuide.getBoundingClientRect();
        const fieldRect = battlefield.getBoundingClientRect();

        assert.ok(guideRect.bottom <= fieldRect.bottom + 0.5);
        assert.ok(guideRect.top >= fieldRect.top);
    } finally {
        cleanupFrame(frame);
    }
});

test("Responsive desktop 1366x768: panneau Arena desktop conserve", async function () {
    const result = await inspectArenaLayout(1366, 768);

    assert.equal(result.hiddenClass, false, "Panneau Arena cache en desktop");
    assert.ok(result.sideWidth >= 250 && result.sideWidth <= 270, "Largeur desktop attendue autour de 260px");
    assert.ok(result.mascotHeight > 1, "Mascotte doit rester visible en desktop");
});
