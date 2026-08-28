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
    manager.ensureAuthenticated = async function () { return true; };
    manager.client = {
        rpc: async function () {
            return { data: [{ error_message: "Ce pseudo est deja pris dans cette salle." }], error: null };
        }
    };

    const result = await manager.joinRoom("Taken");

    assert.equal(result.error, "Ce pseudo est deja pris dans cette salle.");
});

test("Arena joinRoom reussit et enregistre playerName", async function () {
    const manager = createArenaManagerForTest();

    manager.isAvailable = function () { return true; };
    manager.ensureAuthenticated = async function () { return true; };
    let rpcCalled = false;

    manager.client = {
        rpc: async function (name, args) {
            rpcCalled = name === "join_battle_room" &&
                args.p_room_id === "ABCDE" &&
                args.p_player_name === "Player One";
            return { data: [{ error_message: null }], error: null };
        }
    };

    const result = await manager.joinRoom("Player One");

    assert.equal(result.error, null);
    assert.equal(rpcCalled, true);
    assert.equal(manager.playerName, "Player One");
});

test("Arena joinRoom refuse une salle deja lancee", async function () {
    const manager = createArenaManagerForTest();
    manager.isAvailable = function () { return true; };
    manager.ensureAuthenticated = async function () { return true; };
    manager.client = {
        rpc: async function () {
            return { data: [{ error_message: "La partie est deja commencee." }], error: null };
        }
    };

    const result = await manager.joinRoom("Late Player");

    assert.equal(result.error, "La partie est deja commencee.");
});

test("Arena startRoom appelle la RPC securisee avec la difficulte choisie", async function () {
    const manager = createArenaManagerForTest();
    manager.isAvailable = function () { return true; };
    manager.ensureAuthenticated = async function () { return true; };
    let rpcCall = null;
    manager.client = {
        rpc: async function (name, args) {
            rpcCall = { name, args };
            return { data: [{ error_message: null }], error: null };
        }
    };

    const result = await manager.startRoom("song-a", "hard");

    assert.equal(result.error, null);
    assert.equal(rpcCall.name, "start_battle_room");
    assert.equal(rpcCall.args.p_song_id, "song-a");
    assert.equal(rpcCall.args.p_difficulty, "hard");
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
