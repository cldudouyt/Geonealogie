# Spec — Réseau de relations

## Fichiers à modifier
- `src/app/network/page.tsx` (24 lignes — stub)
- `src/components/network/NetworkWrapper.tsx` (existant)

## État actuel
Page network : 24 lignes, quasi-stub. NetworkWrapper.tsx existe mais contenu inconnu.

## Cible (DC)

### En-tête de page
- H1 : « Réseau de relations » Newsreader 30px
- Sous-titre : « Les liens directs autour de **Jean Dudouyt**. » 13.5px
- `padding: 30px 40px 60px`

### Visualisation D3 force graph

**Container** : fond grille de points (voir tokens 00), radius 20px, border `#e9e2d2`.
`display: flex; justify-content: center`

**SVG** : `viewBox="0 0 760 520"`, responsive (width 100%, max-width 760px).

#### Nœuds

| Type | Fond | Stroke | Texte initiales |
|------|------|--------|-----------------|
| Personne centrale | `#1e3a2f` | `#c9a86a` | `#f4efe3` |
| Homme | `#dde7f1` | `#5b7da3` | `#2a4760` |
| Femme | `#f3e1de` | `#b5736b` | `#7a3f38` |

- Rayon personne centrale : 42px
- Rayon autres : 30–32px

Contenu nœud :
- Initiales centrées, font-weight 700
- Nom sous le nœud : `y = cy + r + 16`, Hanken 11.5px bold `#3a4038`
- Relation sous le nom : `y = cy + r + 30`, Hanken 10px `#8a8474`

#### Arêtes
- Ligne `stroke: #cdbfa3`, `stroke-width: 2`
- Toutes partent du centre (personne focus) vers les nœuds périphériques

#### Simulation D3
```ts
import * as d3 from 'd3';

const simulation = d3.forceSimulation(nodes)
  .force('link', d3.forceLink(links).id(d => d.id).distance(180))
  .force('charge', d3.forceManyBody().strength(-300))
  .force('center', d3.forceCenter(380, 260))
  .force('collision', d3.forceCollide().radius(d => d.r + 20));
```

Interactivité :
- Drag & drop des nœuds (reheat simulation)
- Click sur un nœud → `/person/[id]`
- Hover → mettre en évidence le nœud + ses arêtes

---

## API

`GET /api/network?focus=<id>&depth=1` → 
```ts
{
  nodes: { id: string; name: string; relation: string; sex: 'M'|'F'|'C'; r: number }[];
  edges: { source: string; target: string }[];
}
```

Query Neo4j dans `src/lib/queries/network.ts` :
```cypher
MATCH (focus:Person { id: $id })
OPTIONAL MATCH (focus)-[r:SPOUSE|CHILD_OF|PARENT_OF]-(rel:Person)
RETURN focus, collect(DISTINCT { person: rel, type: type(r) }) AS relations
```

---

## Notes
- D3 est déjà installé (`"d3": "^7.9.0"`).
- Composant doit être `"use client"` (D3 manipule le DOM).
- Sur mobile : réduire viewBox à 480x360, réduire rayon nœuds.
- Si aucune donnée de réseau → message centré « Aucune relation trouvée pour cette personne. »
