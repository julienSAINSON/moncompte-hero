function createArenaManagerForTest() {
    const manager = new ArenaManager();
    manager.roomId = "ABCDE";
    return manager;
}

test("Arena joinRoom refuse un pseudo vide", async function () {
    const manager = createArenaManagerForTest();
    manager.client = {};
    manager.isAvailable = function () { return true; };

    const result = await manager.joinRoom("   ");

    assert.equal(result.error, "Entre un pseudo.");
});

test("Arena joinRoom detecte pseudo deja pris", async function () {
    const manager = createArenaManagerForTest();

    manager.isAvailable = function () { return true; };
    manager.getOrCreateRoom = async function () {
        return { data: { created_at: new Date().toISOString() } };
    };

    manager.client = {
        from: function () {
            return {
                select: function () { return this; },
                eq: function () { return this; },
                maybeSingle: async function () {
                    return { error: null, data: { player_name: "Taken" } };
                },
                insert: async function () {
                    return { error: null };
                }
            };
        }
    };

    const result = await manager.joinRoom("Taken");

    assert.equal(result.error, "Ce pseudo est deja pris dans cette salle.");
});

test("Arena joinRoom reussit et enregistre playerName", async function () {
    const manager = createArenaManagerForTest();

    manager.isAvailable = function () { return true; };
    manager.getOrCreateRoom = async function () {
        return { data: { created_at: new Date().toISOString() } };
    };

    let insertCalled = false;

    manager.client = {
        from: function () {
            return {
                select: function () { return this; },
                eq: function () { return this; },
                maybeSingle: async function () {
                    return { error: null, data: null };
                },
                insert: async function () {
                    insertCalled = true;
                    return { error: null };
                }
            };
        }
    };

    const result = await manager.joinRoom("Player One");

    assert.equal(result.error, null);
    assert.equal(insertCalled, true);
    assert.equal(manager.playerName, "Player One");
});

test("Arena getPlayerRank renvoie count+1", async function () {
    const manager = createArenaManagerForTest();
    manager.playerName = "P1";
    manager.isAvailable = function () { return true; };

    manager.client = {
        from: function () {
            return {
                select: function () { return this; },
                eq: function () { return this; },
                gt: async function () {
                    return { count: 3, error: null };
                }
            };
        }
    };

    const rank = await manager.getPlayerRank(1000);

    assert.equal(rank, 4);
});
