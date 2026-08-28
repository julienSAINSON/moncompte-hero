async function readText(url) {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) {
        throw new Error("Impossible de charger " + url + " (" + res.status + ")");
    }
    return res.text();
}

test("Contrat SQL: tables et RLS critiques presentes", async function () {
    const sql = await readText("../supabase/schema.sql");

    assert.ok(/create table if not exists public\.scores/i.test(sql), "Table scores manquante");
    assert.ok(/create table if not exists public\.battle_rooms/i.test(sql), "Table battle_rooms manquante");
    assert.ok(/create table if not exists public\.battle_live_scores/i.test(sql), "Table battle_live_scores manquante");
    assert.ok(/difficulty text not null default 'normal'/i.test(sql), "Colonne difficulty Arena manquante");

    assert.ok(/alter table public\.scores enable row level security/i.test(sql), "RLS scores manquant");
    assert.ok(/alter table public\.battle_rooms enable row level security/i.test(sql), "RLS battle_rooms manquant");
    assert.ok(/alter table public\.battle_live_scores enable row level security/i.test(sql), "RLS battle_live_scores manquant");
    assert.ok(/create or replace function public\.join_battle_room/i.test(sql), "RPC join_battle_room manquante");
});

test("Contrat SQL: grants Supabase essentiels presents", async function () {
    const sql = await readText("../supabase/schema.sql");

    assert.ok(/grant usage on schema public to anon, authenticated/i.test(sql), "GRANT schema manquant");
    assert.ok(/revoke all on public\.scores from anon, authenticated/i.test(sql), "REVOKE scores manquant");
    assert.ok(/revoke all on public\.battle_rooms from anon, authenticated/i.test(sql), "REVOKE battle_rooms manquant");
    assert.ok(/revoke all on public\.battle_live_scores from anon, authenticated/i.test(sql), "REVOKE battle_live_scores manquant");
    assert.ok(/grant execute on function public\.submit_solo_score\(text, text, integer, numeric, integer\) to authenticated/i.test(sql), "GRANT RPC solo manquant");
    assert.ok(/grant execute on function public\.create_battle_room\(text\) to authenticated/i.test(sql), "GRANT RPC creation Arena manquant");
    assert.ok(/grant execute on function public\.update_battle_score\(text, integer, integer, numeric\) to authenticated/i.test(sql), "GRANT RPC score Arena manquant");
});

test("Contrat SW: app shell contient les modules critiques", async function () {
    const sw = await readText("../sw.js");

    assert.ok(/const CACHE_NAME = "moncompte-hero-v\d+"/i.test(sw), "CACHE_NAME invalide");
    assert.ok(/"js\/song-menu\.js"/i.test(sw), "song-menu.js absent du cache");
    assert.ok(/"js\/recording\.js"/i.test(sw), "recording.js absent du cache");
    assert.ok(/"js\/game\.js"/i.test(sw), "game.js absent du cache");
});

test("Contrat manifest: champs PWA essentiels presents", async function () {
    const manifestText = await readText("../manifest.webmanifest");
    const manifest = JSON.parse(manifestText);

    assert.ok(!!manifest.name, "name manquant");
    assert.ok(!!manifest.short_name, "short_name manquant");
    assert.equal(manifest.display, "standalone", "display doit etre standalone");
    assert.ok(Array.isArray(manifest.icons) && manifest.icons.length > 0, "icons manquantes");
});

test("Contrat index: ordre de chargement refacto respecte", async function () {
    const html = await readText("../index.html");

    const posSongMenu = html.indexOf('src="js/song-menu.js"');
    const posRecording = html.indexOf('src="js/recording.js"');
    const posGame = html.indexOf('src="js/game.js"');

    assert.ok(posSongMenu >= 0, "script song-menu.js manquant");
    assert.ok(posRecording >= 0, "script recording.js manquant");
    assert.ok(posGame >= 0, "script game.js manquant");

    assert.ok(posSongMenu < posGame, "song-menu.js doit etre charge avant game.js");
    assert.ok(posRecording < posGame, "recording.js doit etre charge avant game.js");
});
