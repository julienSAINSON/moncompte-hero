# Release Notes — MonCompteHero

## 🎮 Modes de jeu (paramètre d'URL `?mode=`)

- **Mode par défaut (absent ou `mode=0`)** : jeu solo classique, chargement automatique de la musique par défaut, aucune option développeur visible.
- **Mode édition (`?mode=1`)** : affiche le sélecteur Mode Play / Mode Edition et les outils d'enregistrement de partition (upload MP3 + JSON, enregistrement, test, pause/stop).
- **Mode bataille (`?mode=2`)** : jeu à 2 joueurs sur le même écran (tablette/mobile), écran partagé en deux avec sélection de musique dédiée.

## ⚔️ Mode Bataille

- Écran splitté en deux zones symétriques (joueur 1 en bas, joueur 2 en haut, vue retournée à 180°).
- Même musique et même partition jouées simultanément pour les deux joueurs.
- Barre centrale qui se déplace vers le joueur en difficulté selon la performance relative, et sert également de **barre de progression de la musique**.
- Fin de partie si la musique se termine ou si la barre atteint la ligne verte d'un joueur (défaite immédiate).
- Contrôles : joueur 1 = `A S D F`, joueur 2 = `U I O P`, support tactile complet sur chaque moitié d'écran.
- Largeur alignée sur celle du mode solo (420px, centrée).

## 🎵 Menu de sélection de musique

- Bouton **"Musiques"** (popin plein écran par-dessus la piste) permettant de choisir une chanson dans une liste, disponible uniquement en **mode bataille**.
- Arborescence dédiée : `assets/songs/<nom-du-morceau>/music.mp3` + `chart.json`, indexée par `assets/songs/manifest.json`.
- En mode 0/1, la musique par défaut (`assets/default/`) reste chargée automatiquement, sans passer par le menu.

## ↗️ Notes en diagonale (hold notes obliques)

- Nouveau champ optionnel `toLane` dans le format de partition JSON (rétrocompatible : absent = hold vertical classique).
- Rendu visuel en trait droit (cisaillement CSS `skewX`), bords haut/bas horizontaux, dégradé de couleur entre colonne de départ et d'arrivée, épaisseur alignée sur celle d'une note classique.
- **Tactile** : le jugement au relâchement exige la colonne d'arrivée réelle (glissement du doigt suivi en direct).
- **Clavier** : la diagonale est ignorée (jugement et rendu), traitée comme un hold classique — impossible de "glisser" avec des touches physiques.
- Mode édition tactile : le glissement du doigt pendant l'enregistrement d'un hold génère automatiquement `toLane` dans le JSON exporté.
- Détection de `?touch=1` / `?touch=0` pour forcer respectivement le mode tactile ou clavier, indépendamment du matériel détecté.

## 🏆 Classement en ligne (Supabase)

- À la fin d'une chanson **réussie en mode solo** (pas en cas d'échec, pas en bataille, pas en enregistrement), un formulaire permet de saisir un pseudo et d'enregistrer son score.
- Score, précision et meilleur combo enregistrés, liés à l'identifiant de la musique jouée (classement par chanson).
- Top 10 des meilleurs scores affiché automatiquement sur l'écran de fin.
- Fonctionne en dégradé : si Supabase est inaccessible (pas de connexion), la section affiche un message clair au lieu de planter.

## 🔥 Multiplicateur de combo

- Le score gagné par note réussie (perfect/great/good) est désormais multiplié selon le combo en cours :
  - 0–9 combo → ×1
  - 10–24 combo → ×2
  - 25–49 combo → ×3
  - 50+ combo → ×4
- Un texte flottant `×N` apparaît sur la colonne concernée à chaque changement de palier.
- En cas de miss alors qu'un multiplicateur était actif, un `×1` rouge et tremblant s'affiche pour signaler la perte du bonus.
- Aucun impact sur le mode Bataille (système de score et barre centrale indépendants, volontairement inchangés).

## 🛠️ Corrections et fiabilité

- Notes qui apparaissaient brièvement en haut de l'écran avant le compte à rebours : corrigé (masquage dès la création des notes, avant même la fin du chargement audio).
- Gestion du cache du Service Worker fiabilisée (versionnement systématique pour éviter de servir du code JS obsolète pendant le développement).
- Repli automatique sur les données embarquées (`partition.js`) si le chargement réseau de la partition par défaut échoue (utile en `file://` sans serveur).
- Script `serve.ps1` (PowerShell pur, sans dépendance) pour lancer un serveur HTTP local de test sans accès à npm/Node/Python.
- Corrections tactiles : `touch-action: none`, `overscroll-behavior-x: none`, écouteurs `{ passive: false }` pour empêcher les gestes navigateur (retour arrière, défilement) d'interrompre le jeu ou l'enregistrement de notes.
