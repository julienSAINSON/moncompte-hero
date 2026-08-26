# Tests unitaires MonCompteHero

Ce dossier contient une suite de tests unitaires sans dependance externe (pas de Node, pas de npm).

## Lancer les tests

1. Demarrer le serveur local du projet (deja present):
   - powershell -ExecutionPolicy Bypass -File .\serve.ps1
2. Ouvrir la page:
   - http://localhost:8080/tests/index.html

## Contenu

- tests/test-runner.js: mini runner (assertions + rapport)
- tests/song-menu.test.js: tests unitaires de SongMenu
- tests/recording.test.js: tests unitaires de ChartRecorder

## Note

Ces tests ciblent la logique metier de modules critiques sans framework.
Ils sont faciles a etendre pour battle.js et game.js via mocks DOM similaires.
