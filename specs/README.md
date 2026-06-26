# Specs d'implémentation — Géonéalogie

Source design : `Géonéalogie.dc.html` (DC runtime, React-based mockup).

## Comment utiliser ces specs avec des agents en parallèle

Chaque spec est **indépendante** et peut être donnée à un agent séparé.
Ordre recommandé : commencer par `01-layout` (bloquant), puis paralléliser le reste.

```
Agent 1 → specs/01-layout.md     (prérequis pour tous)
          ↓ (une fois mergé)
Agent 2 → specs/02-accueil.md
Agent 3 → specs/03-arbre.md
Agent 4 → specs/04-fiche.md
Agent 5 → specs/05-carte.md
Agent 6 → specs/06-recherche.md
Agent 7 → specs/07-reseau.md
...
```

Chaque agent doit aussi lire `specs/00-design-tokens.md` pour les couleurs/fonts.

---

## Index des specs

| Fichier | Écran | Route | Priorité | Complexité |
|---------|-------|-------|----------|------------|
| [00-design-tokens.md](00-design-tokens.md) | Tokens globaux | — | P0 | — |
| [01-layout.md](01-layout.md) | Nav rail + header | Tous | **P0** | ★★★ |
| [02-accueil.md](02-accueil.md) | Accueil | `/` | P1 | ★★ |
| [03-arbre.md](03-arbre.md) | Arbre généalogique | `/tree` | P1 | ★★★ |
| [04-fiche.md](04-fiche.md) | Fiche personne | `/person/[id]` | P1 | ★★ |
| [05-carte.md](05-carte.md) | Carte des origines | `/map` | P1 | ★★ |
| [06-recherche.md](06-recherche.md) | Recherche | `/search` | P1 | ★★ |
| [07-reseau.md](07-reseau.md) | Réseau de relations | `/network` | P2 | ★★★ |
| [08-anniversaires.md](08-anniversaires.md) | Anniversaires | `/anniversaires` | P2 | ★ |
| [09-parente.md](09-parente.md) | Chemin de parenté | `/relation` | P2 | ★★ |
| [10-parcours.md](10-parcours.md) | Parcours migratoire | `/timeline` | P2 | ★★ |
| [11-anomalies.md](11-anomalies.md) | Anomalies | `/anomalies` | P2 | ★★ |
| [12-doublons.md](12-doublons.md) | Doublons | `/doublons` | P2 | ★★ |
| [13-geocodage.md](13-geocodage.md) | Géocodage | `/admin/geocode` | P3 | ★★ |
| [14-suggestions.md](14-suggestions.md) | Suggestions + Feedback | `/feedback` | P3 | ★ |
| [15-login.md](15-login.md) | Login | `/login` | P1 | ★ |

---

## Gaps critiques identifiés

### 1. Layout (BLOQUANT)
- **Pas de nav rail** — le layout actuel n'a aucune navigation latérale
- **Mauvaises fonts** — Geist au lieu de Newsreader + Hanken Grotesk
- **Pas de header global** avec search bar

### 2. Pages quasi-stub
- `/map` — 27 lignes, pas de pins personnalisés
- `/network` — 24 lignes, probablement pas de D3 force graph

### 3. Design général
- Couleurs incorrectes (Tailwind defaults au lieu du design system)
- Pas d'animations `geo-fade`
- Cartes et bordures ne matchent pas

---

## Conventions pour les agents

Lire `CLAUDE.md` à la racine du projet pour :
- Structure des dossiers
- Stack technique
- Variables d'environnement
- Design tokens (résumé)

Ne **pas** créer de nouveaux fichiers hors du périmètre de la spec.
Ne **pas** modifier les APIs existantes sans vérifier qu'elles sont listées comme "à modifier" dans la spec.
