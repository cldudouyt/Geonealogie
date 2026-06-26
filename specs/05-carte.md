# Spec — Carte des origines

## Fichiers à modifier
- `src/app/map/page.tsx` (actuellement 27 lignes — quasi stub)
- `src/components/map/` (composants existants à adapter)

## État actuel
Page map : 27 lignes, probablement un wrapper Leaflet basique.
L'API `/api/geocode` existe et retourne des coordonnées.

## Cible (DC)

### En-tête de page
- H1 : « Carte des origines » Newsreader 30px
- Sous-titre : « Berceaux familiaux, de la Manche à Santiago de Cuba. » 13.5px `#6c7064`

### Layout : grille `1fr 320px`, gap 24px

---

### Colonne gauche — Carte interactive

**Dimensions** : `height: 560px`, `border-radius: 20px`, `overflow: hidden`, `border: 1px solid #d9e0d4`.

**Fond Leaflet** :
Utiliser les tiles OpenStreetMap avec style clair (CartoDB Light ou OpenStreetMap standard).
Si les tiles ne matchent pas le style du DC (fond vert), appliquer filtre CSS :
```css
.leaflet-tile { filter: sepia(20%) saturate(80%) hue-rotate(60deg) brightness(102%); }
```

**Pins personnalisés** :
```tsx
const CustomPin = ({ place, count, color }) => (
  <div style={{ display:'flex', flexDirection:'column', alignItems:'center' }}>
    <div style={{ background:'#fffdf9', border:'1px solid #d8cfb8', borderRadius:9, padding:'5px 9px',
                  boxShadow:'0 4px 14px -7px rgba(0,0,0,.5)', whiteSpace:'nowrap', marginBottom:5 }}>
      <span style={{ fontSize:11.5, fontWeight:700, color:'#1c1f1c' }}>{place}</span>{' '}
      <span style={{ fontSize:11, color:'#2f5142', fontWeight:700 }}>{count}</span>
    </div>
    {/* Losange pin */}
    <div style={{ width:14, height:14, borderRadius:'50% 50% 50% 0', transform:'rotate(-45deg)',
                  background:color, border:'2px solid #fffdf9', boxShadow:'0 2px 5px rgba(0,0,0,.35)' }} />
  </div>
);
```

Implémenter avec `DivIcon` de Leaflet (ou `react-leaflet` `Marker` + `divIcon`).

**Données pins** : récupérer depuis `/api/geocode?grouped=true` ou nouvelle query Neo4j :
```cypher
MATCH (p:Person) WHERE p.birthLat IS NOT NULL
RETURN p.birthPlace AS place, p.birthLat AS lat, p.birthLng AS lng, count(p) AS count
ORDER BY count DESC LIMIT 20
```

**Couleurs des pins** (par fréquence ou région) :
- `#2f5142` (principal), `#5b7da3` (bleu), `#c9a86a` (or), `#9c5a52` (rose), `#b07d57` (brun), `#6b8f70` (vert clair)

---

### Colonne droite — Principaux foyers

Titre Newsreader 18px + liste de cards :

Chaque card (radius 13px, padding 13px 15px, fond `#fffdf9`, border `#e9e2d2`) :
- Pastille couleur 10px × 10px, rounded-full
- Nom du lieu 13.5px bold + région 11.5px `#8a8474`
- Count 14px bold `#2f5142` à droite

Trier par nombre de personnes décroissant.
Afficher top 8 (scroll si plus).

Click sur un foyer → centrer la carte sur ce pin (via `ref.flyTo()`).

---

## API

Endpoint existant `/api/geocode` à étendre ou créer :
`GET /api/persons/birthplaces` → `{ places: { place: string; region: string; lat: number; lng: number; count: number; color: string }[] }`

Query Neo4j dans `src/lib/queries/map.ts` (à créer) :
```cypher
MATCH (p:Person)
WHERE p.birthPlace IS NOT NULL AND p.birthLat IS NOT NULL
RETURN p.birthPlace AS place, 
       head(collect(p.birthCountry)) AS region,
       head(collect(p.birthLat)) AS lat,
       head(collect(p.birthLng)) AS lng,
       count(p) AS count
ORDER BY count DESC
```

---

## Notes
- Utiliser `react-leaflet` qui est déjà installé (`"react-leaflet": "^5.0.0"`).
- Leaflet nécessite `"use client"` → wrapper le composant carte.
- Sur mobile : masquer la colonne latérale, passer la liste en bas.
- Le fond du DC est une illustration stylisée (pas une vraie carte) — en prod, utiliser Leaflet + tiles.
