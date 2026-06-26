# Spec — Anniversaires

## Fichiers à modifier
- `src/app/anniversaires/page.tsx` (141 lignes — existant à adapter)

## Cible (DC)

### En-tête
- H1 : « Anniversaires » Newsreader 30px
- Sous-titre : « Naissances et mariages à venir dans les 12 prochains mois. » 13.5px
- `max-width: 760px`

### Structure : liste de mois

Chaque mois = card (radius 16px, border `#e9e2d2`, overflow hidden) :
- Header mois : fond `#f1f4ef`, border-bottom `#e7e6dd`, texte Newsreader 16px `#2f5142`

Chaque événement dans le mois :
```
display: flex; align-items: center; gap: 16px;
padding: 12px 20px;
border-bottom: 1px solid #f3eee2;
background: {{ e.bg }};   ← '#fdf6e3' si aujourd'hui, sinon transparent
```

**Jour** : Newsreader 20px bold, couleur `#2f5142` (normal) ou `#b8860b` (aujourd'hui)

**Contenu** :
- Nom 14px bold `#1c1f1c`
- Label 12px `#8a8474` : « Naissance · née en AAAA » ou « Mariage · AAAA »

**Badge "dans X j"** (à droite) :
- Aujourd'hui : fond `#f6e8c0`, texte `#8a6d12`, label « Aujourd'hui »
- Dans ≤ 7j : fond `#f7e6d6`, texte `#b5651d`
- Sinon : fond `#f1ece0`, texte `#8a8474`

---

## Logique de tri et groupement

```ts
// 1. Calculer "jours restants" depuis aujourd'hui pour chaque événement
function daysUntilNextOccurrence(month: number, day: number): number {
  const today = new Date(); today.setHours(0,0,0,0);
  let target = new Date(today.getFullYear(), month - 1, day);
  if (target < today) target = new Date(today.getFullYear() + 1, month - 1, day);
  return Math.round((target.getTime() - today.getTime()) / 86400000);
}

// 2. Trier par jours restants (les plus proches en premier)
// 3. Grouper par mois civil
// 4. Ordonner les mois par premier événement dans chaque mois
```

Types d'événements inclus : naissances (`BIRT`) et mariages (`MARR`).
Personnes vivantes : toujours incluses. Personnes décédées : incluses (anniversaires commémoratifs).

---

## API / Données

Query Neo4j dans `src/lib/queries/anniversaires.ts` :
```cypher
MATCH (p:Person)
WHERE p.birthDay IS NOT NULL AND p.birthMonth IS NOT NULL
RETURN p.id, p.fullName, p.birthDay, p.birthMonth, p.birthYear, 'birth' AS type
UNION
MATCH (f:Family)
WHERE f.marriageDay IS NOT NULL AND f.marriageMonth IS NOT NULL
MATCH (h:Person)-[:SPOUSE]->(f), (w:Person)-[:SPOUSE]->(f)
RETURN f.id, h.givenNames + ' & ' + w.givenNames AS fullName, 
       f.marriageDay AS birthDay, f.marriageMonth AS birthMonth, 
       f.marriageYear AS birthYear, 'marriage' AS type
```

Si `birthDay`/`birthMonth` ne sont pas stockés en Neo4j, les extraire du champ date GEDCOM
dans `gedcom-store.ts` et les persister.

---

## Notes
- Mois affichés en français minuscule (janvier, février, etc.)
- Pas de limite de mois — afficher les 12 prochains mois glissants
- Si aucun événement : « Aucun anniversaire prévu dans les 12 prochains mois. »
