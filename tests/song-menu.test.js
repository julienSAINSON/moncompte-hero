function createSongMenuFixture() {
    document.body.insertAdjacentHTML(
        "beforeend",
        "<div id=\"songListOverlay\" class=\"hidden\"></div>" +
        "<ul id=\"songList\"></ul>" +
        "<p id=\"selectedSongInfo\"></p>"
    );

    return {
        overlay: document.getElementById("songListOverlay"),
        listEl: document.getElementById("songList"),
        infoEl: document.getElementById("selectedSongInfo")
    };
}

function clearSongMenuFixture() {
    const ids = ["songListOverlay", "songList", "selectedSongInfo"];

    ids.forEach((id) => {
        const el = document.getElementById(id);
        if (el) {
            el.remove();
        }
    });
}

test("SongMenu charge un manifest au format tableau", async function () {
    clearSongMenuFixture();
    const fixture = createSongMenuFixture();

    const songs = [
        { id: "a", title: "Song A" },
        { id: "b", title: "Song B" }
    ];

    const originalFetch = window.fetch;
    window.fetch = async function () {
        return {
            ok: true,
            json: async function () {
                return songs;
            }
        };
    };

    const menu = new SongMenu({
        overlay: fixture.overlay,
        listEl: fixture.listEl,
        infoEl: fixture.infoEl,
        onSelect: function () {}
    });

    const loaded = await menu.ensureSongsLoaded();

    assert.equal(loaded, true);
    assert.equal(menu.songs.length, 2);

    window.fetch = originalFetch;
    clearSongMenuFixture();
});

test("SongMenu charge un manifest au format objet songs", async function () {
    clearSongMenuFixture();
    const fixture = createSongMenuFixture();

    const originalFetch = window.fetch;
    window.fetch = async function () {
        return {
            ok: true,
            json: async function () {
                return {
                    songs: [
                        { id: "x", title: "Song X" }
                    ]
                };
            }
        };
    };

    const menu = new SongMenu({
        overlay: fixture.overlay,
        listEl: fixture.listEl,
        infoEl: fixture.infoEl,
        onSelect: function () {}
    });

    const loaded = await menu.ensureSongsLoaded();

    assert.equal(loaded, true);
    assert.equal(menu.songs[0].id, "x");

    window.fetch = originalFetch;
    clearSongMenuFixture();
});

test("SongMenu open rend la liste et marque la chanson active", async function () {
    clearSongMenuFixture();
    const fixture = createSongMenuFixture();

    const originalFetch = window.fetch;
    window.fetch = async function () {
        return {
            ok: true,
            json: async function () {
                return [
                    { id: "s1", title: "Titre 1" },
                    { id: "s2", title: "Titre 2", artist: "Artiste 2" }
                ];
            }
        };
    };

    const menu = new SongMenu({
        overlay: fixture.overlay,
        listEl: fixture.listEl,
        infoEl: fixture.infoEl,
        onSelect: function () {}
    });

    await menu.open("s2");

    const buttons = fixture.listEl.querySelectorAll("button.songListItem");
    assert.equal(buttons.length, 2);
    assert.ok(buttons[1].classList.contains("selected"));
    assert.ok(!fixture.overlay.classList.contains("hidden"));

    window.fetch = originalFetch;
    clearSongMenuFixture();
});

test("SongMenu select met a jour le texte et ferme le panneau", async function () {
    clearSongMenuFixture();
    const fixture = createSongMenuFixture();

    let selected = null;

    const menu = new SongMenu({
        overlay: fixture.overlay,
        listEl: fixture.listEl,
        infoEl: fixture.infoEl,
        onSelect: function (song) {
            selected = song;
        }
    });

    menu.songs = [{ id: "z", title: "Zen" }];
    fixture.overlay.classList.remove("hidden");

    menu.select(menu.songs[0]);

    assert.equal(selected.id, "z");
    assert.equal(fixture.infoEl.textContent, "Musique selectionnee : Zen");
    assert.ok(fixture.overlay.classList.contains("hidden"));

    clearSongMenuFixture();
});
