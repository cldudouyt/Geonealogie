# Spec — Accueil (Dashboard)

## Fichiers à modifier
- `src/components/Dashboard.tsx`
- `src/components/SurnameGrid.tsx` (adapter)

## État actuel
Dashboard existant avec grille de noms de famille, stats basiques et mini-carte.
Fond, typographie et structure ne correspondent pas au DC.

## Cible (DC)

### Zone hero (fond papier clair — nouveau depuis mockup 01)
**Pas de bandeau vert.** Tout sur `#f4f1ea`.

- **Tag** : « MÉMOIRE FAMILIALE · DEPUIS 1799 » — pill outlined `border: 1px solid #2f5142`, `color: #2f5142`, `font-size: 11px`, `letter-spacing: .08em`, `text-transform: uppercase`, `padding: 4px 14px`, `border-radius: 999px`
- **H1** : « Sept générations, une seule histoire. » — `var(--font-serif)`, `clamp(40px, 5vw, 58px)`, weight 500, `color: #1c1f1c`, `letter-spacing: -0.02em`
- **Sous-titre** : « Explorez l'arbre de la famille Dudouyt — des percepteurs de la Manche aux Mercader de Barcelone et Santiago de Cuba. » — `font-size: 15px`, `color: #6c7064`
- **Stats** (4 colonnes séparées par `1px solid #e0d8c6`) :
  - totalPersons / PERSONNES
  - totalFamilies / FAMILLES
  - min–max / PÉRIODE
  - totalCountries / PAYS D'ORIGINE
  - Style chiffres : Newsreader 36px, `#1c1f1c`
  - Style labels : 11px UPPERCASE `letter-spacing: .12em`, `font-weight: 600`, `#8a8474`

---

### Section principale (fond #f4f1ea, padding 34px 48px 60px, max-width 1080px)

#### Grille de 3 cards de navigation rapide
```
grid-template-columns: repeat(3, 1fr); gap: 18px
```
Chaque card = bouton cliquable, style card standard + icon 42px × 42px (fond `#eef2ec`).
| Card | Lien | Titre | Sous-titre |
|------|------|-------|------------|
| Arbre | `/tree` | Parcourir l'arbre | Vertical, éventail, roue ou liste. |
| Réseau | `/network` | Réseau de relations | Le maillage de la famille. |
| Anniversaires | `/anniversaires` | Anniversaires | À venir ce mois-ci. |

#### Grille principale (en dessous)
```
grid-template-columns: 1.35fr 1fr; gap: 30px
```

**Colonne gauche — Noms de famille**
- Header : titre Newsreader 23px + mention « 22 lignées » à droite
- Liste de `SurnameGroup` :
  - Card item (radius 13px, border `#e9e2d2`, hover border `#c9a86a`)
  - Avatar 40px × 40px (initiale, fond coloré par genre de la lignée, radius 10px)
  - Nom en gras 14.5px + sous-titre (3 prénoms échantillons) 12px `#8a8474`
  - Badge count (fond `#eef2ec`, texte `#2f5142`, radius 999px)
  - Click → `/tree?focus=<focusId>`

**Colonne droite**
- Card « Répartition par siècle » :
  - Barres horizontales pour chaque siècle
  - Barre : fond `#ece5d5`, remplissage `linear-gradient(90deg, #2f5142, #4a7058)`
  - Labels : 12px, largeur fixe 74px
  - Données depuis `getStats()` existant
- Card « Ajouts récents » :
  - Liste boutons hover (`#f3efe5`)
  - Avatar initiales 34px, rounded-full, tint selon sexe
  - Nom 13.5px bold + méta 11.5px `#8a8474`

---

## Données

La fonction `Dashboard.tsx` utilise `getAllPersons()` et `getStore()` de `gedcom-store.ts`.
Ces fonctions existent et retournent les données correctes.

Adapter :
- `buildSurnameGroups()` — déjà correct, garder
- `getStats()` — adapter pour retourner aussi `countries` (nombre de pays d'origine distincts)
- `getRecentPersons()` — nouveauté : retourner les 3 dernières personnes ajoutées/modifiées
  (stocker `updatedAt` dans Neo4j ou approximer via ordre de lecture GEDCOM)

---

## Notes
- Les stats globales (342 / 147 / 9 pays) doivent venir de vraies requêtes, pas d'hardcode.
- Le `GlobalMapWrapper` actuel dans Dashboard doit être retiré — la carte a sa propre route.
- Taille de texte h1 hero = 52px → breakpoint tablette : 36px.
