function setupNoteFixture() {
    const playfield = document.createElement("div");
    playfield.id = "playfield";
    playfield.style.width = "400px";
    playfield.style.height = "600px";
    document.body.appendChild(playfield);

    Object.defineProperty(playfield, "clientWidth", {
        value: 400,
        configurable: true
    });

    window.renderer = {
        hitLineY: 500,
        pixelsPerSecond: 250,
        playfield: playfield,
        lookaheadSeconds: 2
    };

    return playfield;
}

function teardownNoteFixture() {
    const playfield = document.getElementById("playfield");
    if (playfield) {
        playfield.remove();
    }
}

test("Note synchronisee: a hitTime exact la note est sur la ligne", function () {
    teardownNoteFixture();
    setupNoteFixture();

    const note = new Note(1, 2);

    note.update(2);

    assert.equal(note.element.style.top, "500px");

    note.destroy();
    teardownNoteFixture();
});

test("Note canBeHit respecte la fenetre de frappe", function () {
    teardownNoteFixture();
    setupNoteFixture();

    const note = new Note(0, 1);

    assert.equal(note.canBeHit(1), true);
    assert.equal(note.canBeHit(1.09), true);
    assert.equal(note.canBeHit(1.11), false);

    note.destroy();
    teardownNoteFixture();
});

test("Note judge retourne perfect/great/good/miss selon le delta", function () {
    teardownNoteFixture();
    setupNoteFixture();

    const note = new Note(2, 5);

    assert.equal(note.judge(5), "perfect");
    assert.equal(note.judge(5.04), "great");
    assert.equal(note.judge(5.09), "good");
    assert.equal(note.judge(5.2), "miss");

    note.destroy();
    teardownNoteFixture();
});

test("Note hold: releaseTime et canBeReleased sont coherents", function () {
    teardownNoteFixture();
    setupNoteFixture();

    const note = new Note(3, 10, 0.5);

    assert.equal(note.releaseTime, 10.5);
    assert.equal(note.canBeReleased(10.55), true);
    assert.equal(note.canBeReleased(10.65), false);

    note.destroy();
    teardownNoteFixture();
});

test("Note hold: detection de miss avant/apres maintien", function () {
    teardownNoteFixture();
    setupNoteFixture();

    const note = new Note(0, 3, 0.4);

    // Tant que la hold n'est pas prise, la deadline est proche du hitTime.
    assert.equal(note.isMissed(3.1), false);
    assert.equal(note.isMissed(3.2), true);

    // Une fois maintenue, la deadline se decale au relachement.
    note.holding = true;
    assert.equal(note.isMissed(3.45), false);
    assert.equal(note.isMissed(3.55), true);

    note.destroy();
    teardownNoteFixture();
});
