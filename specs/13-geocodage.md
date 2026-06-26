# Spec — Géocodage

## Fichiers à modifier
- `src/app/admin/geocode/page.tsx` (à créer ou renommer depuis admin)
- `src/app/api/geocode/route.ts` (existant)
- `src/lib/geocoder.ts` (existant)

## Route
`/admin/geocode` (actuellement `/admin/geocode` — garder)

## Cible (DC)

### En-tête
- H1 : « Géocodage automatique » Newsreader 30px
- Sous-titre : « Convertit les lieux GEDCOM et saisis manuellement en coordonnées, sauvegardées dans la base. »
- `max-width: 680px`

### Table de statistiques

Container (radius 16px, border `#e9e2d2`, overflow hidden) :

Chaque ligne :
```
display: flex; justify-content: space-between; align-items: center;
padding: 14px 20px; border-bottom: 1px solid #f1ebdd;
```

| Label | Style label | Style valeur |
|-------|-------------|--------------|
| Lieux GEDCOM sans coordonnées | normal `#5a5e52` | normal `#5a5e52` |
| Lieux manuels sans coords | normal `#5a5e52` | bold `#b8860b` (attention) |
| **Total à géocoder** | **bold `#1c1f1c`** | **bold `#1c1f1c`** |
| Durée estimée | normal `#5a5e52` | normal `#5a5e52` |

Ces données viennent d'une query :
```cypher
MATCH (p:Person) WHERE p.birthPlace IS NOT NULL AND p.birthLat IS NULL
RETURN count(p) AS gedcomMissing
// + lieux de overrides sans coords
```

---

### Bouton de lancement

```
background: #1e3a2f; color: #f1ede2; padding: 11px 20px; border-radius: 11px;
display: inline-flex; align-items: center; gap: 9px; font-weight: 600;
```
- Icône SVG géoloc (pin)
- Label dynamique : « Lancer le géocodage (37 lieux) »

Comportement :
1. Click → POST `/api/geocode/batch`
2. Bouton passe en état « En cours… » (spinner, désactivé)
3. Les logs s'actualisent en temps réel via Server-Sent Events ou polling

---

### Journal (log)

Container :
```
border: 1px solid #e9e2d2; border-radius: 12px; overflow: hidden; margin-top: 22px;
```
Header : fond `#f1f4ef`, texte « Journal de la dernière exécution », 11.5px bold `#6b7568`.

Corps log :
```
font-family: ui-monospace; font-size: 11.5px; padding: 13px 14px;
display: flex; flex-direction: column; gap: 3px;
max-height: 180px; overflow-y: auto;
background: #fffdf9;
```

Lignes de log colorées :
- Succès `✓` : couleur `#2f5142`
- Erreur `✗` : couleur `#c0392b`
- Info : couleur `#8a8474`

---

## API

### `POST /api/geocode/batch`
Lancer le géocodage de tous les lieux manquants (existant dans `geocoder.ts`).
Adapter pour supporter le streaming SSE :
```ts
// Response SSE
return new Response(stream, { headers: { 'Content-Type': 'text/event-stream' } });

// Format chaque event :
data: {"type":"success","place":"Banyoles, Espagne","lat":42.1167,"lng":2.7667}\n\n
data: {"type":"error","place":"? , Chine","message":"non trouvé"}\n\n
data: {"type":"done","total":37,"success":35,"failed":2}\n\n
```

---

## Notes
- Utiliser l'API Nominatim (OpenStreetMap) — gratuite, pas de clé.
- Rate limit Nominatim : 1 requête/seconde → ajouter délai 1100ms entre requêtes.
- Persister les coordonnées dans Neo4j sur les nœuds `Person` et `Place`.
- L'admin de géocodage est protégé par auth — vérifier le middleware.
