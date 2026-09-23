# Géonéalogie — Contexte projet pour Claude Code

## Description
Application généalogique familiale pour la famille Dudouyt.
Stack : **Next.js 16 + Postgres (Neon) + Tailwind CSS 4 + Vercel Blob**.
Déployé sur Vercel. Données généalogiques : fichier GEDCOM parsé en mémoire (`gedcom-store.ts`).
Postgres (Neon, gratuit) ne stocke que les écritures : overrides manuels, métadonnées documents, suggestions.
Fallback fichier local (`data/*.json`) quand `DATABASE_URL` est absent (dev).

## Structure des dossiers
```
src/
  app/                  — Pages Next.js App Router
    page.tsx            — Dashboard (Accueil)
    layout.tsx          — Layout racine avec nav rail
    login/              — Auth (mot de passe partagé)
    person/[id]/        — Fiche personne
    tree/               — Arbre généalogique (D3)
    map/                — Carte des origines (Leaflet)
    search/             — Recherche full-text
    network/            — Réseau de relations (D3 force)
    anniversaires/      — Calendrier des anniversaires
    relation/           — Chemin de parenté entre deux personnes
    timeline/           — Parcours migratoire (frise)
    anomalies/          — Détection d'anomalies de données
    doublons/           — Détection de doublons
    admin/              — Géocodage et administration
    feedback/           — Suggestions reçues
    history/            — Historique des opérations + restauration (admin)
    stats/              — Statistiques détaillées
    api/                — Routes API Next.js
      persons/          — CRUD personnes (GEDCOM + overrides)
      tree/             — Arbre pour D3
      network/          — Graphe relations
      geocode/          — Géocodage Nominatim
      research/         — Panneau recherche
      export/           — Export GEDCOM/CSV/JSON
      ai/               — Agents IA (Claude)
      admin/            — Actions admin (géocodage, feedback)
      blob-upload/       — Upload de documents/avatars vers Vercel Blob
      journey/          — Parcours migratoire
      relation/         — Chemin de parenté
      logout/           — Fin de session
  components/           — Composants React partagés
  lib/
    db.ts                  — Client Postgres Neon (kv_state + suggestions)
    gedcom-store.ts        — Parsing GEDCOM (source de données principale)
    overrides-store.ts     — Édits manuels (Postgres, fallback fichier)
    documents-store.ts     — Métadonnées documents (Postgres, fichiers sur Blob)
    state-store.ts         — Lecture/écriture versionnée générique (kv_state)
    auth.ts                — Authentification, rôles, sessions signées
    duplicate-analysis.ts  — Détection et éligibilité de fusion des doublons
    ai.ts                  — Client Gemini (@google/genai) + runAgentsInParallel
    types/                 — Types TypeScript
scripts/
  dedupe-gedcom.ts       — Nettoyage des blocs INDI/FAM dupliqués par le bug d'export Heredis
  geocode.mjs            — Géocodage en masse des lieux du GEDCOM via Nominatim
  import-gedcom.ts, sync-overrides-to-neo4j.mjs, docker-compose.yml
                         — legacy (ancienne archi Neo4j), ne reflètent plus le fonctionnement actuel
```

## Design System (référence : Géonéalogie.dc.html)

### Couleurs
| Token | Valeur | Utilisation |
|-------|--------|-------------|
| `bg-nav` | `#15271f` | Navigation rail fond |
| `bg-dark` | `#1e3a2f` | Header hero, boutons primaires |
| `bg-mid` | `#2f5142` | Accents verts, badges |
| `bg-body` | `#f4f1ea` | Fond principal |
| `bg-page` | `#e9e4d8` | Fond body |
| `bg-card` | `#fffdf9` | Fond cartes |
| `border-card` | `#e7e0d0` | Bordure cartes |
| `border-item` | `#e9e2d2` | Bordure items liste |
| `accent-gold` | `#c9a86a` | Accent doré (hover, logo) |
| `text-nav` | `#e8e4d8` | Texte navigation |
| `text-muted` | `#9aa89b` | Labels discrets |
| `text-body` | `#1c1f1c` | Texte principal |

### Typographie
- **Titres/Headings** : `Newsreader` (serif, italic disponible)
- **Corps** : `Hanken Grotesk` (sans-serif)
- Importer depuis Google Fonts dans `layout.tsx`

### Composants UI récurrents
- **Nav rail** : 248px, fond `#15271f`, items `border-radius: 8px`, hover `rgba(255,255,255,.07)`
- **Cards** : `border-radius: 16px`, fond `#fffdf9`, bordure `#e7e0d0`, hover `border-color: #c9a86a + box-shadow`
- **Bouton primaire** : fond `#1e3a2f`, texte `#f1ede2`, radius `10px`
- **Bouton secondaire** : bordure `#e0d8c6`, fond `#fffdf9`
- **Badges** : fond `#eef2ec`, texte `#2f5142`, `border-radius: 999px`
- **Input search** : hauteur `40px`, radius `11px`, focus `border: #2f5142 + shadow rgba(47,81,66,.12)`

### Écrans (toutes les routes)
| Route | Description |
|-------|-------------|
| `/` | Accueil — stats (342 personnes, 147 familles), noms de famille, répartition par siècle, ajouts récents |
| `/tree` | Arbre — modes vertical/éventail/roue/liste |
| `/map` | Carte des origines — géographie des naissances |
| `/search` | Recherche full-text personnes, lieux, dates |
| `/network` | Réseau de relations — graphe D3 force |
| `/anniversaires` | Anniversaires du mois |
| `/relation` | Chemin de parenté entre deux personnes |
| `/timeline` | Parcours migratoire — frise chronologique |
| `/anomalies` | Anomalies de données — dates incohérentes, données manquantes |
| `/doublons` | Doublons potentiels |
| `/admin` | Géocodage admin |
| `/feedback` | Suggestions reçues |

## Stack IA — Gemini, agents en parallèle

### Utilisation de `runAgentsInParallel`
```typescript
import { runAgentsInParallel } from "@/lib/ai";

const results = await runAgentsInParallel([
  {
    name: "anomalies",
    systemPrompt: "Tu analyses des données généalogiques...",
    userMessage: JSON.stringify(personnes),
  },
  {
    name: "suggestions",
    systemPrompt: "Tu proposes des pistes de recherche...",
    userMessage: JSON.stringify(arbre),
  },
]);
```

### Endpoint API `/api/ai`
- `POST { mode: "chat", message: "..." }` → streaming SSE
- `POST { mode: "parallel", tasks: [...] }` → `{ results: AgentResult[] }`

### Modèle par défaut
`gemini-flash-latest` (palier gratuit) — configurable via `DEFAULT_MODEL` dans `src/lib/ai.ts`. Client Gemini (`@google/genai`) exposé via `genAI` ; `generateText()` fait un seul appel système+utilisateur, `runAgentsInParallel()` et `streamAgentResponse()` sont construits dessus.

## Données
- Fichier GEDCOM source : `Dudouyt Heredis 2014-Export.ged`, parsé en mémoire au démarrage (pas de rechargement à chaud — redémarrer après modification du fichier)
- Overrides manuels stockés dans Postgres Neon (via `overrides-store.ts`, table `kv_state`), avec contrôle de version (`kvReadVersion`/`kvCompareSet`) pour éviter les écrasements concurrents
- Photos : Vercel Blob (`BLOB_READ_WRITE_TOKEN`)
- Géocodage : API Nominatim (OpenStreetMap)

## Authentification et rôles
Mot de passe partagé (`AUTH_PASSWORD`) + sessions signées (`AUTH_SECRET`). Des accès nommés supplémentaires se déclarent via `AUTH_USERS_JSON` (tableau `{ name, role, password }`).

| Rôle | Droits |
|------|--------|
| `reader` | Consulter, explorer, rechercher, exporter le GEDCOM |
| `contributor` | + édition de fiches, sources, documents, suggestions |
| `admin` | + doublons, diagnostics, géocodage, historique/restauration |

Logique dans `src/lib/auth.ts`. Détails (expiration, invalidation, fusion de doublons en lot) : voir `docs/experience-familiale.md`.

## Variables d'environnement
```
DATABASE_URL=postgres://...    ← Postgres Neon (injecté par Vercel) ; absent = fallback fichier data/*.json
GEMINI_API_KEY=...             ← obligatoire pour les features IA (clé gratuite sur aistudio.google.com)
BLOB_READ_WRITE_TOKEN=...
AUTH_PASSWORD=...
AUTH_SECRET=...
AUTH_USERS_JSON=...            ← optionnel, accès nommés (voir "Authentification et rôles")
GITHUB_TOKEN=...               ← optionnel, création d'issues depuis les suggestions (scope repo)
GEO_DATA_DIR=...               ← optionnel, répertoire du fallback fichier (tests)
GEDCOM_PATH=...                ← optionnel, fichier GEDCOM alternatif (défaut : fichier à la racine ; tests)
```

## Tests
```bash
npm test              # tests unitaires (tests/*.test.ts, node --test)
npm run typecheck
npm run build
npm run test:experience   # parcours end-to-end Playwright (build de prod, données jetables)
npm run test:duplicates   # parcours de fusion de doublons
```

## Conventions de code
- TypeScript strict
- Tailwind CSS 4 pour les styles (pas de CSS modules)
- Accès base de données via `src/lib/db.ts` uniquement (jamais de SQL dans les pages)
- Pas de commentaires sauf si la logique est non-évidente
- Composants Server Components par défaut, `"use client"` uniquement si nécessaire
- Nommage : `camelCase` pour variables/fonctions, `PascalCase` pour composants

## Backlog produit, UX et fiabilité — 23 septembre 2026

Objectif : rendre l'exploration familiale plus simple et permettre aux proches d'enrichir le site ensemble. Conserver l'identité vert/crème et améliorer les fonctionnalités existantes avant de multiplier les écrans.

Statut : propositions à réaliser, pas des fonctionnalités livrées. Vérifier l'existant et la dernière branche avant chaque chantier ; compléter les parcours déjà présents sans les dupliquer.

### Lot 1 recommandé — exploration mobile et participation

- [ ] **P1 — Arbre mobile plus lisible.** Afficher d'abord les proches de la personne choisie, permettre de déplier/replier les branches, ouvrir une fiche courte au toucher et conserver le centrage, le zoom et les branches ouvertes au retour d'une fiche. Réutiliser les commandes de plein écran et de recentrage existantes. Vérifier navigation tactile, clavier et absence de débordement horizontal.
- [ ] **P1 — Parenté directement sur les fiches.** Afficher le lien avec la personne de référence (« Catherine est ta tante », lorsque les données le permettent), avec accès au chemin explicatif. Réutiliser le calcul de `/relation`. Gérer explicitement l'absence de personne de référence, de chemin connu et les liens ambigus ; ne pas inventer de parenté.
- [ ] **P1 — Contributions guidées.** Proposer « Ajouter un souvenir », « Identifier cette photo » et « Proposer une correction ». Prévoir un formulaire court lié à la fiche ou au média, une file de validation et les statuts en attente/acceptée/refusée. Une proposition ne modifie pas les données avant validation par un rôle autorisé ; conserver auteur, date et historique. Définir explicitement les droits de proposition des lecteurs.

### Lot 2 — qualité des données et mémoire familiale

- [ ] **P2 — Doublons mieux expliqués.** Compléter la comparaison existante : différences surlignées, raisons du rapprochement et aperçu des parents, conjoints et enfants après fusion. Conserver confirmation, contrôle concurrent et possibilités d'annulation existantes. Une concordance n'est pas une preuve d'identité ; aucun nouveau mécanisme de fusion silencieuse. Couvrir les homonymes, liens répétés et contradictions par des tests.
- [ ] **P2 — Album familial.** Regrouper les photos par personne, événement et époque, avec légendes et identification manuelle des personnes. Réutiliser les médias existants, distinguer dates exactes/approximatives et respecter les droits de consultation. Ne pas rendre publics les médias ni les informations de personnes vivantes par défaut.
- [ ] **P2 — Invitations et gestion des accès dans le site.** Permettre à l'administrateur d'inviter un proche, de choisir son rôle et de révoquer son accès sans modifier les variables d'hébergement. Prévoir invitations à usage unique et durée limitée, invalidation des sessions révoquées et migration des accès existants sans verrouiller l'administrateur. Choisir le mécanisme d'authentification et d'envoi avant implémentation ; ne pas stocker de mots de passe en clair.

### UX et design — critères transverses

- [ ] **Hiérarchie des actions.** Une action principale claire par contexte ; regrouper les actions secondaires dans un menu accessible sans masquer les fonctions indispensables.
- [ ] **Lisibilité mobile et accessibilité.** Libellés compréhensibles, alternatives accessibles aux icônes, contrastes vérifiés, cibles tactiles confortables et texte agrandissable. Tester petits écrans, zoom du texte, navigation clavier et focus visible.
- [ ] **Continuité de navigation.** Conserver recherche, filtres, pagination et position d'exploration lors des allers-retours ; compléter la synchronisation URL et le retour arrière déjà en place.
- [ ] **Confiance dans les informations.** Distinguer visuellement information sourcée, hypothèse familiale et texte généré par IA ; donner accès aux sources et à la validation humaine. Ne pas présenter un score ou une génération comme une preuve.

### Socle technique — à mener en parallèle des lots produit

- [ ] **P1 — Tests automatisés avant fusion.** Ajouter une CI GitHub Actions pour tests unitaires/intégration, vérification TypeScript, build et parcours Playwright essentiels (mobile, rôles, recherche, édition, doublons/restauration). Utiliser des données synthétiques et aucun secret de production ; joindre les traces en cas d'échec. Configurer séparément les contrôles requis avant fusion selon les droits du dépôt.
- [ ] **P1 — Exercice de restauration complète.** Tester sur un environnement isolé la restauration d'une sauvegarde incluant GEDCOM, modifications et médias ; vérifier intégrité, relations et droits d'accès. Documenter le périmètre sauvegardé et les exclusions. L'export et la récupération de fichiers existent déjà : ne pas les confondre avec une restauration globale opérationnelle.
- [ ] **P2 — Restauration globale guidée.** Après validation de l'exercice, prévoir inspection, simulation et confirmation explicite avant remplacement, sauvegarde préalable et procédure de retour arrière. Ne jamais tester le remplacement sur les données familiales de production.

### Validation de chaque livraison

- [ ] Définir les critères d'acceptation et ajouter les tests de non-régression du parcours modifié.
- [ ] Vérifier mobile et ordinateur, états vides/chargement/erreur et droits lecteur/contributeur/administrateur.
- [ ] Mettre à jour ce backlog uniquement après vérification ; distinguer implémentation, tests et mise en production.
