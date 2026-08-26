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

test("Battle divider suit l'ecart de score entre joueurs", function () {
    battleGame.top.reset();
    battleGame.bottom.reset();

    battleGame.top.score = 1200;
    battleGame.bottom.score = 0;

    battleGame.updateDivider();

    const y = parseFloat(battleGame.divider.style.top);
    assert.ok(y > 300, "La barre doit descendre si le joueur du haut domine");
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
