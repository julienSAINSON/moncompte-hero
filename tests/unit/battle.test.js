test("BattlePlayer perfect augmente combo/balance/score", function () {
    const player = battleGame.bottom;
    player.reset();

    player.registerJudgement("perfect", 0);

    assert.equal(player.combo, 1);
    assert.equal(player.balance, 3);
    assert.equal(player.score, 400);
});

test("BattlePlayer miss reset combo et met a jour le score derive", function () {
    const player = battleGame.bottom;
    player.reset();

    player.registerJudgement("great", 1);
    player.registerJudgement("miss", 1);

    assert.equal(player.combo, 0);
    assert.equal(player.balance, -1);
    assert.equal(player.score, -120);
});

test("Battle ne cree les notes que lorsqu'elles deviennent visibles", function () {
    const player = battleGame.bottom;
    player.reset();
    player.spawnNotes([{ lane: 0, hitTime: 10, holdDuration: 0 }]);

    assert.equal(player.notes[0].element, null);

    player.updateNotes(9);

    assert.ok(player.notes[0].element);
    player.reset();
});

test("Battle divider suit l'ecart de score entre joueurs", function () {
    battleGame.top.reset();
    battleGame.bottom.reset();

    battleGame.top.score = 1200;
    battleGame.bottom.score = 0;

    battleGame.updateDivider();

    const y = parseFloat(battleGame.divider.style.top);
    assert.ok(y > 300, "La barre doit descendre si le joueur du haut domine");
});

test("Battle conserve la vitesse de defilement pour les deux joueurs", function () {
    battleGame.top.score = 1200;
    battleGame.bottom.score = 0;

    battleGame.updateDivider();

    assert.equal(
        battleGame.top.pixelsPerSecond,
        battleGame.bottom.pixelsPerSecond
    );
});

test("Battle agrandit la zone du joueur qui pousse la barre", function () {
    battleGame.top.score = 1200;
    battleGame.bottom.score = 0;

    battleGame.updateDivider();

    assert.ok(
        parseFloat(battleGame.top.root.style.flexBasis) >
        parseFloat(battleGame.bottom.root.style.flexBasis)
    );
});

test("Battle preserve un espace minimal pour les commandes de chaque joueur", function () {
    battleGame.updateLayoutCache();
    battleGame.top.score = (battleGame.maxShift - 1) / 0.03;
    battleGame.bottom.score = 0;

    battleGame.updateDivider();

    assert.ok(
        parseFloat(battleGame.bottom.root.style.flexBasis) >= 170
    );
});

test("Battle status panels affichent score/combo pres de la barre", function () {
    battleGame.top.score = 800;
    battleGame.top.combo = 5;
    battleGame.bottom.score = 150;
    battleGame.bottom.combo = 1;

    battleGame.updateDivider();

    assert.ok(battleGame.topStatus.textContent.includes("J2"));
    assert.ok(battleGame.topStatus.textContent.includes("800"));
    assert.ok(battleGame.bottomStatus.textContent.includes("J1"));
    assert.ok(battleGame.bottomStatus.textContent.includes("150"));
});
