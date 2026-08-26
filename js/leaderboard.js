//====================================================
// leaderboard.js - Classement des scores (Supabase)
//====================================================

const SUPABASE_URL = "https://brzalbbeooyencowjymp.supabase.co";
const SUPABASE_ANON_KEY =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJyemFsYmJlb295ZW5jb3dqeW1wIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc2MzUxODIsImV4cCI6MjEwMzIxMTE4Mn0.o2aN47oAtaZfEwQroFqm6J6e8NQwcHlbts5ZYiBJwxE";

class LeaderboardManager {

    constructor() {

        this.client = null;

        if (window.supabase && typeof window.supabase.createClient === "function") {
            this.client = window.supabase.createClient(
                SUPABASE_URL,
                SUPABASE_ANON_KEY
            );
        }

    }

    isAvailable() {

        return !!this.client;

    }

    async submitScore(songId, playerName, score, accuracy, bestCombo) {

        if (!this.client) {
            return { error: "Supabase indisponible (pas de connexion ?)" };
        }

        const { error } = await this.client
            .from("scores")
            .insert({
                song_id: songId,
                player_name: playerName.slice(0, 24),
                score,
                accuracy,
                best_combo: bestCombo
            });

        return { error: error ? error.message : null };

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
