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
    api/                — Routes API Next.js
      persons/          — CRUD personnes (GEDCOM + overrides)
      tree/             — Arbre pour D3
      network/          — Graphe relations
      geocode/          — Géocodage Nominatim
      research/         — Panneau recherche
      export/           — Export GEDCOM/CSV/JSON
      ai/               — Agents IA (Claude) ← nouveau
  components/           — Composants React partagés
  lib/
    db.ts               — Client Postgres Neon (kv_state + suggestions)
    gedcom-store.ts     — Parsing GEDCOM (source de données principale)
    overrides-store.ts  — Édits manuels (Postgres, fallback fichier)
    documents-store.ts  — Métadonnées documents (Postgres, fichiers sur Blob)
    ai.ts               — Client Anthropic + runAgentsInParallel
    types/              — Types TypeScript
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

## Stack IA — agents en parallèle

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
`claude-sonnet-4-6` — configurable via `DEFAULT_MODEL` dans `src/lib/ai.ts`

## Données
- Fichier GEDCOM source : `Dudouyt Heredis 2014-Export.ged`
- Overrides manuels stockés dans Postgres Neon (via `overrides-store.ts`, table `kv_state`)
- Photos : Vercel Blob (`BLOB_READ_WRITE_TOKEN`)
- Géocodage : API Nominatim (OpenStreetMap)

## Variables d'environnement
```
DATABASE_URL=postgres://...    ← Postgres Neon (injecté par Vercel) ; absent = fallback fichier
ANTHROPIC_API_KEY=sk-ant-...   ← obligatoire pour les features IA
BLOB_READ_WRITE_TOKEN=...
AUTH_PASSWORD=...
AUTH_SECRET=...
```

## Conventions de code
- TypeScript strict
- Tailwind CSS 4 pour les styles (pas de CSS modules)
- Accès base de données via `src/lib/db.ts` uniquement (jamais de SQL dans les pages)
- Pas de commentaires sauf si la logique est non-évidente
- Composants Server Components par défaut, `"use client"` uniquement si nécessaire
- Nommage : `camelCase` pour variables/fonctions, `PascalCase` pour composants
