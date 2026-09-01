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
        this.playerAvatarId = null;

        this.client = window.supabaseClient || null;

    }

    isActive() {

        return !!this.roomId;

    }

    /**
     * Genere un code de salle et recharge la page avec ?room=CODE ajoute a l'URL.
     */
    async createAndEnterRoom() {

        if (!await this.ensureAuthenticated()) {
            return { error: "Authentification Arena indisponible." };
        }

        const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // sans caracteres ambigus
        let code = "";

        for (let i = 0; i < 5; i++) {
            code += chars[Math.floor(Math.random() * chars.length)];
        }

        const { data, error } = await this.client.rpc("create_battle_room", {
            p_room_id: code
        });

        const createError = error ? error.message : data?.[0]?.error_message;

        if (createError) {
            return { error: createError };
        }

        const url = new URL(window.location.href);
        url.searchParams.set("mode", "3");
        url.searchParams.set("room", code);
        url.searchParams.set("gm", "1");

        window.location.href = url.toString();

        return { error: null };

    }

    async ensureAuthenticated() {

        return !!await window.leaderboardManager?.ensureAuthenticated?.();

    }

    isAvailable() {

        return !!this.client;

    }

    /**
    * Rejoint (ou cree si absente) la salle via une RPC atomique.
    * La base refuse toute inscription lorsque la salle est deja en jeu.
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

        if (!await this.ensureAuthenticated()) {
            return { error: "Authentification Arena indisponible." };
        }

        if (typeof this.client.rpc !== "function") {
            return { error: "Configuration Arena incomplete." };
        }

        const { data, error } = await this.client.rpc(
            "join_battle_room",
            {
                p_room_id: this.roomId,
                p_player_name: name
            }
        );

        if (error) {
            return { error: error.message };
        }

        const result = Array.isArray(data) ? data[0] : data;

        if (!result) {
            return { error: "Reponse Arena invalide." };
        }

        if (result.error_message) {
            return { error: result.error_message };
        }

        this.playerName = name;
        this.playerAvatarId = result.avatar_id;

        return { error: null, avatarId: result.avatar_id };

    }

    /**
     * Reserve au maitre du jeu : passe la salle en "playing" avec la musique choisie.
     */
    async startRoom(songId, difficulty = "normal") {

        if (!this.isAvailable()) {
            return { error: "Supabase indisponible (pas de connexion ?)" };
        }

        if (!await this.ensureAuthenticated()) {
            return { error: "Authentification Arena indisponible." };
        }

        const { data, error } = await this.client.rpc("start_battle_room", {
            p_room_id: this.roomId,
            p_song_id: songId,
            p_difficulty: difficulty
        });

        return {
            error: error ? error.message : (data?.[0]?.error_message || null)
        };

    }

    async getRoomStatus() {

        if (!this.isAvailable()) {
            return { error: "Supabase indisponible (pas de connexion ?)" };
        }

        const { data, error } = await this.client
            .from("battle_rooms")
            .select("status, song_id, difficulty, started_at")
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

        if (!await this.ensureAuthenticated()) {
            return;
        }

        const { data, error } = await this.client.rpc("update_battle_score", {
            p_room_id: this.roomId,
            p_score: score,
            p_combo: combo,
            p_accuracy: accuracy
        });

        if (error || data?.[0]?.error_message) {
            console.error(error?.message || data[0].error_message);
        }

    }

    async fetchLeaderboard(limit = 10) {

        if (!this.isAvailable()) {
            return [];
        }

        const { data, error } = await this.client
            .from("battle_live_scores")
            .select("player_name, score, avatar_id")
            .eq("room_id", this.roomId)
            .order("score", { ascending: false })
            .limit(limit);

        if (error) {
            console.error(error);
            return [];
        }

        return data || [];

    }

    async fetchPlayerCount() {

        if (!this.isAvailable()) {
            return 0;
        }

        const { count, error } = await this.client
            .from("battle_live_scores")
            .select("player_name", { count: "exact", head: true })
            .eq("room_id", this.roomId);

        if (error) {
            console.error(error);
            return 0;
        }

        return count || 0;

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
