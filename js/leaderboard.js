//====================================================
// leaderboard.js - Classement des scores (Supabase)
//====================================================

const SUPABASE_URL = "https://brzalbbeooyencowjymp.supabase.co";
const SUPABASE_ANON_KEY =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJyemFsYmJlb295ZW5jb3dqeW1wIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc2MzUxODIsImV4cCI6MjEwMzIxMTE4Mn0.o2aN47oAtaZfEwQroFqm6J6e8NQwcHlbts5ZYiBJwxE";

class LeaderboardManager {

    constructor() {

        this.client = null;
        this.authReady = null;

        if (window.supabase && typeof window.supabase.createClient === "function") {
            this.client = window.supabase.createClient(
                SUPABASE_URL,
                SUPABASE_ANON_KEY
            );

            // reutilise dans arena.js (mode Battle Arena) pour eviter un 2e client
            window.supabaseClient = this.client;
        }

    }

    isAvailable() {

        return !!this.client;

    }

    async startAnonymousSession() {

        if (!this.client?.auth) {
            return false;
        }

        const { data: sessionData, error: sessionError } =
            await this.client.auth.getSession();

        if (sessionError) {
            console.error(sessionError);
            return false;
        }

        if (sessionData.session?.user) {
            return true;
        }

        const { data, error } = await this.client.auth.signInAnonymously();

        if (error) {
            console.error(error);
            return false;
        }

        return !!data.user;

    }

    async ensureAuthenticated() {

        if (!this.client) {
            return false;
        }

        if (!this.authReady) {
            this.authReady = this.startAnonymousSession();
        }

        return this.authReady;

    }

    async submitScore(songId, playerName, score, accuracy, bestCombo) {

        if (!this.client) {
            return { error: "Supabase indisponible (pas de connexion ?)" };
        }

        if (!await this.ensureAuthenticated()) {
            return { error: "Authentification du classement indisponible." };
        }

        const { data, error } = await this.client.rpc("submit_solo_score", {
            p_song_id: songId,
            p_player_name: playerName.slice(0, 24),
            p_score: score,
            p_accuracy: accuracy,
            p_best_combo: bestCombo
        });

        return {
            error: error ? error.message : (data?.[0]?.error_message || null)
        };

    }

    async fetchTopScores(songId, limit = 10) {

        if (!this.client) {
            return [];
        }

        const { data, error } = await this.client
            .from("scores")
            .select("player_name, score, accuracy, best_combo")
            .eq("song_id", songId)
            .order("score", { ascending: false })
            .limit(limit);

        if (error) {
            console.error(error);
            return [];
        }

        return data || [];

    }

}

window.leaderboardManager = new LeaderboardManager();
