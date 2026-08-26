# Tests MonCompteHero

Ce dossier contient une suite de tests sans dependance externe (pas de Node, pas de npm), separee en tests unitaires et tests d'integration.

## Lancer les tests

1. Demarrer le serveur local du projet (deja present):
   - powershell -ExecutionPolicy Bypass -File .\serve.ps1
2. Ouvrir la page:
   - http://localhost:8080/tests/index.html

## Contenu

- tests/test-runner.js: mini runner (assertions + rapport)
- tests/bootstrap.js: stubs/mocks DOM pour charger certains modules en environnement test
- tests/unit/: tests unitaires (note, battle, arena, supabase, song-menu, recording)
- tests/integration/: tests d'integration (parcours mode 0/2/3, responsive)

## Note

Ces tests ciblent la logique metier de modules critiques et des parcours fonctionnels majeurs.
Ils sont faciles a etendre avec de nouveaux cas dans tests/unit/ et tests/integration/.
