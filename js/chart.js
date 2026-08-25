class Chart {

    constructor() {

        this.notes = [];

    }

loadFromJSON(json) {

    this.clear();

    for (const note of json.notes) {

        this.addNote(
            note.lane,
            note.hitTime,
            note.holdDuration,
            note.toLane
        );

    }

    this.sort();

}

    clear() {

        this.notes = [];

    }

    addNote(lane, hitTime, holdDuration = 0, toLane = null) {

        this.notes.push({
            lane,
            hitTime,
            holdDuration,
            // colonne d'arrivee pour une note diagonale ; null/undefined = hold vertical classique
            toLane: (toLane === null || toLane === undefined) ? lane : toLane,
            hit: false,
            judged: false
        });

    }

    sort() {

        this.notes.sort((a, b) => a.hitTime - b.hitTime);

    }

    getNotes() {

        return this.notes;

    }

    /**
     * Génère une partition de démonstration.
     * Plus tard cette méthode sera remplacée
     * par une analyse automatique du MP3.
     */
    generateDemo(duration) {

        this.clear();

        let t = 2;

        while (t < duration - 1) {

            this.addNote(
                Math.floor(Math.random() * 4),
                t
            );

            t += 0.5;

        }

        this.sort();

    }

}

window.chart = new Chart();