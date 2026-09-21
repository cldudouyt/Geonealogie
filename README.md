# Géonéalogie

Application généalogique familiale pour la famille Dudouyt — arbre, carte des origines, recherche, réseau de relations, anniversaires, chemin de parenté, parcours migratoire, détection d'anomalies et de doublons.

**Stack** : Next.js 16 (App Router) · Postgres (Neon, serverless) · Tailwind CSS 4 · Vercel Blob · Claude (Anthropic) pour les agents IA.

## Démarrage rapide

Prérequis : Node.js 20+.

```bash
npm install
cp .env.example .env.local   # voir "Variables d'environnement" ci-dessous
npm run dev
```

L'application est disponible sur http://localhost:3000.

Sans `DATABASE_URL` configuré, le stockage des écritures (overrides, documents, suggestions, historique) bascule automatiquement sur des fichiers JSON locaux dans `data/`. C'est suffisant pour développer sans base de données.

## Source de données

Les personnes et familles proviennent d'un export GEDCOM (`Dudouyt Heredis 2014-Export.ged`), parsé **en mémoire** au démarrage par `src/lib/gedcom-store.ts` — ce n'est pas rechargé à chaud, redémarrer le serveur après une modification du fichier.

Postgres (ou le fallback fichier) ne stocke que ce que les utilisateurs modifient : édits manuels de fiches, métadonnées de documents, suggestions, historique des opérations. Le GEDCOM lui-même n'est jamais réécrit par l'application.

## Variables d'environnement

| Variable | Rôle | Obligatoire |
|---|---|---|
| `DATABASE_URL` | Postgres (Neon) pour les écritures ; absent en dev → fallback fichiers `data/*.json` | non (recommandé en prod) |
| `AUTH_PASSWORD` | Mot de passe administrateur familial | oui |
| `AUTH_SECRET` | Secret de signature des sessions (≥32 caractères aléatoires) | oui |
| `AUTH_USERS_JSON` | Accès nommés supplémentaires (voir ci-dessous) | non |
| `ANTHROPIC_API_KEY` | Clé API Claude, requise pour les fonctionnalités IA (`/api/ai`) | pour les features IA |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob, pour l'upload de documents/avatars | pour l'upload de médias |
| `GITHUB_TOKEN` | Création d'issues GitHub depuis les suggestions (scope `repo`) | pour cette intégration |
| `GEO_DATA_DIR` | Répertoire du fallback fichier (utile pour isoler des tests) | non |

`AUTH_USERS_JSON` permet de donner des accès distincts sans compte en libre-service :

```json
[
  { "name": "Prénom du proche", "role": "reader", "password": "un-secret-unique" },
  { "name": "Prénom du contributeur", "role": "contributor", "password": "un-autre-secret" }
]
```

| Rôle | Droits |
|---|---|
| `reader` | Consulter, explorer, rechercher, exporter le GEDCOM |
| `contributor` | + ajout/édition de fiches, sources, documents, suggestions |
| `admin` | + doublons, diagnostics, géocodage, historique/restauration |

Détails du fonctionnement (sessions, sauvegardes, concurrence, fusion de doublons) : voir [docs/experience-familiale.md](docs/experience-familiale.md).

## Structure du projet

```
src/
  app/          Pages Next.js App Router (une route par écran, voir tableau ci-dessous)
    api/        Routes API : persons, tree, network, geocode, research, export, ai, admin...
  components/   Composants React partagés
  lib/
    db.ts                 Client Postgres Neon (kv_state, suggestions)
    gedcom-store.ts        Parsing GEDCOM — source de données principale
    overrides-store.ts     Édits manuels (Postgres, fallback fichier)
    documents-store.ts     Métadonnées documents (Postgres, fichiers sur Blob)
    duplicate-analysis.ts  Détection et éligibilité de fusion des doublons
    auth.ts                Authentification par mot de passe, sessions signées
    ai.ts                  Client Anthropic + runAgentsInParallel
scripts/        Scripts ponctuels (dédoublonnage GEDCOM, géocodage)
tests/          Tests unitaires (node --test) + tests de parcours (Playwright)
specs/          Specs d'implémentation par écran, dérivées du mockup design
```

Conventions de code détaillées, design system (couleurs, typographie, composants UI) et description complète de chaque écran : voir [CLAUDE.md](CLAUDE.md).

## Écrans

| Route | Description |
|---|---|
| `/` | Accueil — statistiques, noms de famille, répartition par siècle, ajouts récents |
| `/tree` | Arbre généalogique — modes vertical/éventail/roue/liste |
| `/map` | Carte des origines — géographie des naissances |
| `/search` | Recherche full-text personnes, lieux, dates |
| `/network` | Réseau de relations — graphe D3 force |
| `/anniversaires` | Anniversaires du mois |
| `/relation` | Chemin de parenté entre deux personnes |
| `/timeline` | Parcours migratoire — frise chronologique |
| `/anomalies` | Anomalies de données — dates incohérentes, données manquantes |
| `/doublons` | Détection et fusion (en lot ou individuelle) des doublons potentiels |
| `/admin` | Géocodage et administration |
| `/feedback` | Suggestions reçues |

## Scripts npm

| Commande | Description |
|---|---|
| `npm run dev` | Serveur de développement (port 3000) |
| `npm run build` | Build de production |
| `npm run start` | Sert le build de production |
| `npm run lint` | ESLint |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` | Tests unitaires (`tests/*.test.ts`, via `node --test`) |
| `npm run test:experience` | Test de parcours end-to-end (Playwright, build de prod, données jetables) |
| `npm run test:duplicates` | Test de parcours pour la fusion de doublons |

Scripts ponctuels (exécution manuelle, hors `npm run`) :

- `npx tsx scripts/dedupe-gedcom.ts [--dry-run]` — nettoie les blocs INDI/FAM dupliqués par un bug d'export Heredis
- `node scripts/geocode.mjs` — géocode via Nominatim les lieux du GEDCOM sans coordonnées

> `scripts/import-gedcom.ts` et `scripts/sync-overrides-to-neo4j.mjs` datent d'une architecture antérieure basée sur Neo4j (idem `docker-compose.yml`) et ne correspondent plus au fonctionnement actuel (GEDCOM en mémoire + Postgres). À supprimer ou migrer si réutilisés.

## Vérifications avant de livrer

```bash
npm ci
npm test
npm run typecheck
npm run build
npx playwright install chromium
npm run test:experience
```

## Déploiement

Déployé sur Vercel. Voir [DEPLOIEMENT.md](DEPLOIEMENT.md) pour le détail — **note** : ce guide date lui aussi de l'architecture Neo4j et doit être relu à la lumière de la section "Variables d'environnement" ci-dessus (Postgres/Neon a remplacé Neo4j).
