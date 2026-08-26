//====================================================
// arena.js - Mode Battle Arena (salle multijoueur en ligne, Supabase)
//====================================================

const ARENA_ROOM_TTL_MS = 30 * 60 * 1000; // duree de vie d'une salle : 30 minutes

class ArenaManager {

    constructor() {

        const params = new URLSearchParams(window.location.search);

        this.roomId = params.get("room");
        this.isGameMaster = params.get("gm") === "1";
        this.playerName = null;

        this.client = window.supabaseClient || null;

    }

    isActive() {

        return !!this.roomId;

    }

    /**
     * Genere un code de salle et recharge la page avec ?room=CODE ajoute a l'URL.
     */
    createAndEnterRoom() {

        const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // sans caracteres ambigus
        let code = "";

        for (let i = 0; i < 5; i++) {
            code += chars[Math.floor(Math.random() * chars.length)];
        }

        const url = new URL(window.location.href);
        url.searchParams.set("room", code);

        window.location.href = url.toString();

    }

    isAvailable() {

        return !!this.client;

    }

    /**
     * Rejoint (ou cree si absente) la salle, avec verification
     * de l'expiration (30 min) et de l'unicite du pseudo.
     * Retourne { error } (error = null si succes).
     */
    async joinRoom(playerName) {

        if (!this.isAvailable()) {
            return { error: "Supabase indisponible (pas de connexion ?)" };
        }

        const name = playerName.trim().slice(0, 24);

        if (!name) {
            return { error: "Entre un pseudo." };
        }

        const room = await this.getOrCreateRoom();

        if (room.error) {
            return { error: room.error };
        }

        const roomAgeMs = Date.now() - new Date(room.data.created_at).getTime();

        if (roomAgeMs > ARENA_ROOM_TTL_MS) {
            return { error: "Cette salle a expire (duree de vie : 30 minutes)." };
        }

        const duplicate = await this.client
            .from("battle_live_scores")
            .select("player_name")
            .eq("room_id", this.roomId)
            .eq("player_name", name)
            .maybeSingle();

        if (duplicate.error) {
            return { error: duplicate.error.message };
        }

        if (duplicate.data) {
            return { error: "Ce pseudo est deja pris dans cette salle." };
        }

        const { error } = await this.client
            .from("battle_live_scores")
            .insert({
                room_id: this.roomId,
                player_name: name,
                score: 0,
                combo: 0,
                accuracy: 100
            });

        if (error) {
            return { error: error.message };
        }

        this.playerName = name;

        return { error: null };

    }

    async getOrCreateRoom() {

        const existing = await this.client
            .from("battle_rooms")
            .select("id, status, song_id, started_at, created_at")
            .eq("id", this.roomId)
            .maybeSingle();

        if (existing.error) {
            return { error: existing.error.message };
        }

        if (existing.data) {
            return { data: existing.data };
        }

        const created = await this.client
            .from("battle_rooms")
            .insert({ id: this.roomId })
            .select("id, status, song_id, started_at, created_at")
            .single();

        if (created.error) {
            return { error: created.error.message };
        }

        return { data: created.data };

    }

    /**
     * Reserve au maitre du jeu : passe la salle en "playing" avec la musique choisie.
     */
    async startRoom(songId) {

        if (!this.isAvailable()) {
            return { error: "Supabase indisponible (pas de connexion ?)" };
        }

        const { error } = await this.client
            .from("battle_rooms")
            .update({
                status: "playing",
                song_id: songId,
                started_at: new Date().toISOString()
            })
            .eq("id", this.roomId);

        return { error: error ? error.message : null };

    }

    async getRoomStatus() {

        if (!this.isAvailable()) {
            return { error: "Supabase indisponible (pas de connexion ?)" };
        }

        const { data, error } = await this.client
            .from("battle_rooms")
            .select("status, song_id, started_at")
            .eq("id", this.roomId)
            .maybeSingle();

        if (error) {
            return { error: error.message };
        }

        return { data };

    }

    /**
     * Envoie le score courant du joueur (appele periodiquement pendant la partie).
     */
    async pushScore(score, combo, accuracy) {

        if (!this.isAvailable() || !this.playerName) {
            return;
        }

        await this.client
            .from("battle_live_scores")
            .update({
                score,
                combo,
                accuracy,
                updated_at: new Date().toISOString()
            })
            .eq("room_id", this.roomId)
            .eq("player_name", this.playerName);

    }

    async fetchLeaderboard(limit = 10) {

        if (!this.isAvailable()) {
            return [];
        }

        const { data, error } = await this.client
            .from("battle_live_scores")
            .select("player_name, score")
            .eq("room_id", this.roomId)
            .order("score", { ascending: false })
            .limit(limit);

        if (error) {
            console.error(error);
            return [];
        }

        return data || [];

    }

    /**
     * Rang du joueur (1 = premier), base sur le nombre de joueurs ayant un meilleur score.
     */
    async getPlayerRank(score) {

        if (!this.isAvailable() || !this.playerName) {
            return null;
        }

        const { count, error } = await this.client
            .from("battle_live_scores")
            .select("player_name", { count: "exact", head: true })
            .eq("room_id", this.roomId)
            .gt("score", score);

        if (error) {
            console.error(error);
            return null;
        }

        return (count || 0) + 1;

    }

}

window.arenaManager = new ArenaManager();
