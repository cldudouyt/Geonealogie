# Spec — Parcours migratoire

## Fichiers à modifier
- `src/app/timeline/page.tsx` (161 lignes — existant)

## Cible (DC)

### En-tête
- H1 : « Parcours migratoire » Newsreader 30px
- Sous-titre : « Les étapes de vie de **Jean Dudouyt**, dans l'ordre chronologique. » 13.5px

---

### Timeline horizontale (section 1)

Container : `background: #fffdf9; border: 1px solid #e9e2d2; border-radius: 18px; padding: 30px 24px; overflow-x: auto; margin-bottom: 24px`

Étapes disposées horizontalement, séparées par une flèche :
```
[Étape] → [Étape] → [Étape] → ...
```

**Chaque étape** (`width: 150px`, centré) :
- Icône 38px × 38px, rounded-full :
  - Naissance (`birth`) : fond `#2f5142`, icône « ● », texte `#fff`
  - Décès (`death`) : fond `#fff`, border `2px solid #9c5a52`, icône « ✕ », texte `#9c5a52`
  - Événement (`event`) : fond `#5b7da3`, icône « ◆ », texte `#fff`
  - Spécial (`special`) : fond `#c9a86a`, icône « ◆ », texte `#fff`
- Titre 12.5px bold, couleur selon type
- Année 11.5px `#8a7560`
- Lieu 11.5px `#5a4a38`

**Flèche entre étapes** :
```tsx
<svg width="34" height="12" viewBox="0 0 34 12" fill="none">
  <path d="M0 6h28M28 1l5 5-5 5" stroke="#c4b49a" stroke-width="1.6"/>
</svg>
```

---

### Carte (section 2)

`height: 340px`, `border-radius: 18px`, `border: 1px solid #d9e0d4`

Carte Leaflet avec :
- Même style tile que la Carte des origines (cohérence visuelle)
- Tracé de la route migratorire en pointillés : `stroke: #1e3a2f`, `stroke-dasharray: 8 6`, `stroke-width: 2.5`
- Pins des étapes (même format que carte des origines mais plus petits)

**Tracé** : utiliser `Polyline` de react-leaflet avec les coordonnées des étapes.

---

## Données

Étapes = événements de vie de la personne focus avec coordonnées.

Types d'événements GEDCOM à inclure (dans l'ordre) :
- `BIRT` → type `birth`
- `EDUC`, `GRAD` → type `event`
- `OCCU` → type `special` (si lieu différent)
- `RESI` → type `event`
- `DEAT` → type `death`

Query Neo4j dans `src/lib/queries/journey.ts` :
```cypher
MATCH (p:Person { id: $id })
OPTIONAL MATCH (p)-[:HAS_EVENT]->(e:Event)
WHERE e.place IS NOT NULL
RETURN e.type AS type, e.year AS year, e.place AS place, 
       e.lat AS lat, e.lng AS lng, e.description AS title
ORDER BY e.year
```

Si pas de coordonnées → géocoder à la volée via `/api/geocode?place=<place>`.

---

## Sélection de personne

Permettre de changer la personne focus :
- Selector en haut de page (input autocomplete, même que `/relation`)
- URL param : `/timeline?focus=<id>`
- Défaut : Jean Dudouyt (ID à définir comme constante)

---

## Notes
- La timeline horizontale peut être longue → `overflow-x: auto` essentiel.
- Sur mobile : passer la timeline en verticale (flex-direction column).
- Si personne a < 2 lieux connus → ne pas afficher la carte (ou message « Données géographiques insuffisantes »).
