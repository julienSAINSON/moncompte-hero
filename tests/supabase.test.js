test("Leaderboard submitScore tronque le pseudo et retourne null en succes", async function () {
    const manager = new LeaderboardManager();

    let payload = null;

    manager.client = {
        from: function () {
            return {
                insert: async function (obj) {
                    payload = obj;
                    return { error: null };
                }
            };
        }
    };

    const result = await manager.submitScore(
        "song-1",
        "PseudoTresLongPourVerifierLeTroncage",
        12345,
        98.7,
        42
    );

    assert.equal(result.error, null);
    assert.equal(payload.song_id, "song-1");
    assert.equal(payload.player_name.length, 24);
    assert.equal(payload.score, 12345);
    assert.equal(payload.accuracy, 98.7);
    assert.equal(payload.best_combo, 42);
});

test("Leaderboard submitScore retourne un message si Supabase indisponible", async function () {
    const manager = new LeaderboardManager();
    manager.client = null;

    const result = await manager.submitScore("song-1", "P1", 100, 90, 5);

    assert.equal(result.error, "Supabase indisponible (pas de connexion ?)");
});

test("Leaderboard fetchTopScores construit la requete attendue", async function () {
    const manager = new LeaderboardManager();

    const calls = [];

    manager.client = {
        from: function (table) {
            calls.push(["from", table]);
            return {
                select: function (fields) {
                    calls.push(["select", fields]);
                    return this;
                },
                eq: function (key, value) {
                    calls.push(["eq", key, value]);
                    return this;
                },
                order: function (key, options) {
                    calls.push(["order", key, options.ascending]);
                    return this;
                },
                limit: async function (n) {
                    calls.push(["limit", n]);
                    return {
                        data: [{ player_name: "P1", score: 1000, accuracy: 99, best_combo: 10 }],
                        error: null
                    };
                }
            };
        }
    };

    const rows = await manager.fetchTopScores("song-xyz", 7);

    assert.equal(rows.length, 1);
    assert.equal(rows[0].player_name, "P1");
    assert.deepEqual(calls, [
        ["from", "scores"],
        ["select", "player_name, score, accuracy, best_combo"],
        ["eq", "song_id", "song-xyz"],
        ["order", "score", false],
        ["limit", 7]
    ]);
});

test("Leaderboard fetchTopScores retourne [] en cas d'erreur", async function () {
    const manager = new LeaderboardManager();

    manager.client = {
        from: function () {
            return {
                select: function () { return this; },
                eq: function () { return this; },
                order: function () { return this; },
                limit: async function () {
                    return { data: null, error: { message: "boom" } };
                }
            };
        }
    };

    const rows = await manager.fetchTopScores("song-a");

    assert.equal(Array.isArray(rows), true);
    assert.equal(rows.length, 0);
});

test("Arena startRoom propage un message d'erreur Supabase", async function () {
    const manager = new ArenaManager();
    manager.roomId = "ABCDE";

    manager.client = {
        from: function () {
            return {
                update: function () {
                    return {
                        eq: async function () {
                            return { error: { message: "update denied" } };
                        }
                    };
                }
            };
        }
    };

    const result = await manager.startRoom("song-2");

    assert.equal(result.error, "update denied");
});

test("Arena getRoomStatus retourne status/song_id", async function () {
    const manager = new ArenaManager();
    manager.roomId = "ABCDE";

    manager.client = {
        from: function () {
            return {
                select: function () { return this; },
                eq: function () { return this; },
                maybeSingle: async function () {
                    return {
                        data: { status: "playing", song_id: "song-9", started_at: "2026-08-26T10:00:00Z" },
                        error: null
                    };
                }
            };
        }
    };

    const result = await manager.getRoomStatus();

    assert.equal(result.data.status, "playing");
    assert.equal(result.data.song_id, "song-9");
});

test("Arena pushScore ne plante pas si playerName absent", async function () {
    const manager = new ArenaManager();
    manager.roomId = "ABCDE";
    manager.playerName = null;

    manager.client = {
        from: function () {
            throw new Error("Ne devrait pas etre appele");
        }
    };

    await manager.pushScore(100, 3, 97);

    assert.ok(true);
});

test("Arena fetchLeaderboard retourne [] si indisponible", async function () {
    const manager = new ArenaManager();
    manager.client = null;

    const rows = await manager.fetchLeaderboard(5);

    assert.equal(Array.isArray(rows), true);
    assert.equal(rows.length, 0);
});
