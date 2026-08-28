test("BattlePlayer perfect augmente combo/balance/score", function () {
    const player = battleGame.bottom;
    player.reset();

    player.registerJudgement("perfect", 0);

    assert.equal(player.combo, 1);
    assert.equal(player.balance, 3);
    assert.equal(player.score, 400);
});

test("BattlePlayer miss reset combo sans retirer score ni balance", function () {
    const player = battleGame.bottom;
    player.reset();

    player.registerJudgement("great", 1);
    player.registerJudgement("miss", 1);

    assert.equal(player.combo, 0);
    assert.equal(player.balance, 2);
    assert.equal(player.score, 280);
});

test("Battle sans frappe conserve un score nul", function () {
    const player = battleGame.bottom;
    player.reset();

    player.registerJudgement("miss", 0);
    player.registerJudgement("miss", 1);
    player.registerJudgement("miss", 2);

    assert.equal(player.score, 0);
    assert.equal(player.balance, 0);
});

test("Battle la barre bouge quand un seul joueur reussit une note", function () {
    battleGame.top.reset();
    battleGame.bottom.reset();

    battleGame.top.registerJudgement("perfect", 0);
    battleGame.bottom.registerJudgement("miss", 0);
    battleGame.updateDivider();

    assert.ok(parseFloat(battleGame.divider.style.top) > battleGame.centerY);
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

test("Battle bloque le menu contextuel sur les lanes pendant une partie", function () {
    const lane = battleGame.bottom.root.querySelector(".lane");
    const event = new Event("contextmenu", { bubbles: true, cancelable: true });

    battleGame.running = true;
    lane.dispatchEvent(event);

    assert.equal(event.defaultPrevented, true);
    battleGame.running = false;
});

test("Battle note brillante donne un bonus de visibilite au joueur en difficulte", function () {
    const player = battleGame.bottom;
    const opponent = battleGame.top;
    player.reset();
    opponent.reset();
    opponent.balance = 20;
    battleGame.updateDivider();
    const dividerBeforeBonus = parseFloat(battleGame.divider.style.top);
    player.spawnNotes([{ lane: 2, hitTime: 2.2, holdDuration: 0 }]);
    player.markBonusNote(1);

    const bonusNote = player.notes[0];
    const initialLeadTime = player.getVisibleLeadTime(1);
    const initialOpponentLeadTime = opponent.getVisibleLeadTime(1);

    player.press(bonusNote.lane, bonusNote.hitTime);

    assert.ok(player.getVisibleLeadTime(1) > initialLeadTime);
    assert.ok(opponent.getVisibleLeadTime(1) < initialOpponentLeadTime);
    assert.ok(
        parseFloat(battleGame.divider.style.top) < dividerBeforeBonus,
        "Le bonus doit ramener la barre vers le joueur en difficulte"
    );
    assert.equal(player.balance, 0);
    assert.equal(player.bonusBalanceModifier, 15);
    assert.equal(opponent.bonusBalanceModifier, -15);
    assert.equal(player.notes.length, 1);
    assert.equal(player.notes[0].isBonus, true);
    assert.equal(player.notes[0].judged, true);
    player.reset();
    opponent.reset();
});

test("Battle bonus requiert 30% de zone visible ou la limite tactile", function () {
    battleGame.updateLayoutCache();
    const ineligibleHeight = Math.ceil(
        battleGame.fieldHeight * BATTLE_BONUS_VISIBILITY_THRESHOLD + 1
    );
    const eligibleHeight = Math.floor(
        battleGame.fieldHeight * BATTLE_BONUS_VISIBILITY_THRESHOLD
    );

    battleGame.top.root.style.flexBasis = ineligibleHeight + "px";

    assert.equal(battleGame.isBonusEligible(battleGame.top), false);

    battleGame.top.root.style.flexBasis = eligibleHeight + "px";
    assert.equal(battleGame.isBonusEligible(battleGame.top), true);

    battleGame.top.root.style.flexBasis = "";
    battleGame.top.reset();
});

test("Battle cree le bonus immediatement a l'atteinte du seuil", function () {
    battleGame.updateLayoutCache();
    battleGame.top.reset();
    battleGame.top.root.style.flexBasis = Math.floor(
        battleGame.fieldHeight * BATTLE_BONUS_VISIBILITY_THRESHOLD
    ) + "px";
    battleGame.lastTrapAt = null;
    battleGame.bonusBalanceUntil = 0;
    battleGame.top.spawnNotes([{ lane: 0, hitTime: 2.2, holdDuration: 0 }]);

    battleGame.maybeAddTrapNote(1);

    assert.equal(battleGame.top.notes.length, 1);
    assert.equal(battleGame.top.notes[0].isBonus, true);
    battleGame.top.root.style.flexBasis = "";
    battleGame.top.reset();
});

test("Battle bloque tout nouveau bonus pendant un effet actif", function () {
    battleGame.updateLayoutCache();
    battleGame.top.reset();
    battleGame.bottom.reset();
    battleGame.top.root.style.flexBasis = "190px";
    battleGame.lastTrapAt = null;
    battleGame.bonusBalanceUntil = performance.now() + 1000;
    battleGame.top.spawnNotes([{ lane: 0, hitTime: 2.2, holdDuration: 0 }]);

    battleGame.maybeAddTrapNote(1);

    assert.equal(battleGame.top.notes[0].isBonus, false);
    battleGame.top.root.style.flexBasis = "";
    battleGame.bonusBalanceUntil = 0;
    battleGame.top.reset();
});

test("Battle desactive retire les notes et effets bonus en cours", function () {
    const player = battleGame.bottom;
    player.spawnNotes([{ lane: 0, hitTime: 2.2, holdDuration: 0 }]);
    player.markBonusNote(1);
    player.applyVisibilityModifier(1, "battleVisibilityBonus");
    player.bonusBalanceModifier = 15;
    battleGame.bonusBalanceUntil = performance.now() + 1000;

    battleGame.setBonusEnabled(false);

    assert.equal(player.notes[0].isBonus, false);
    assert.equal(player.visibilityModifierSeconds, 0);
    assert.equal(player.bonusBalanceModifier, 0);
    assert.equal(battleGame.bonusEnabled, false);
    battleGame.setBonusEnabled(true);
    player.reset();
});

test("Battle divider suit l'ecart de score entre joueurs", function () {
    battleGame.top.reset();
    battleGame.bottom.reset();

    battleGame.top.balance = 10;
    battleGame.bottom.balance = 0;

    battleGame.updateDivider();

    const y = parseFloat(battleGame.divider.style.top);
    assert.ok(y > 300, "La barre doit descendre si le joueur du haut domine");
});

test("Battle conserve la vitesse de defilement pour les deux joueurs", function () {
    battleGame.top.balance = 10;
    battleGame.bottom.balance = 0;

    battleGame.updateDivider();

    assert.equal(
        battleGame.top.pixelsPerSecond,
        battleGame.bottom.pixelsPerSecond
    );
});

test("Battle agrandit la zone du joueur qui pousse la barre", function () {
    battleGame.top.balance = 10;
    battleGame.bottom.balance = 0;

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
