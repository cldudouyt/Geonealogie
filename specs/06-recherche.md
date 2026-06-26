# Spec — Recherche

## Fichiers à modifier
- `src/app/search/page.tsx` (247 lignes — existant à adapter)

## État actuel
Page de recherche existante avec résultats. Layout et design à aligner sur le DC.

## Cible (DC)

### En-tête de page
- H1 : « Recherche » Newsreader 30px
- Sous-titre : « Dans l'arbre et les archives externes (BnF, Maitron, VIAF, Wikidata). » 13.5px `#6c7064`
- `max-width: 980px`

### Liste de résultats (personnes)

Chaque résultat : bouton cliquable (hover `border-color: #c9a86a; box-shadow: 0 8px 24px -16px rgba(30,58,47,.5)`).

```
border: 1px solid #e9e2d2; border-radius: 14px; padding: 15px 18px;
display: flex; align-items: center; gap: 16px;
```

**Avatar** : 46px × 46px, **radius 50% (cercle)**, initiales Newsreader 17px weight 600, tint/ink par sexe (M=`#dde7f1/3f617f`, F=`#f3e1de/9c5a52`, U=`#eef2ec/2f5142`). Voir mockup 08.

**Contenu** :
- Nom 15px bold — **tous les prénoms séparés par des virgules + nom de famille** (ex. « Jean, Charles, Henri Dudouyt »). Confirmé mockup 08.
- Méta 12.5px `#8a8474` :
  - Si personne décédée : `AAAA Lieu — AAAA Lieu` (ex. « 1913 Barcelone – 1978 La Havane »)
  - Si personne vivante/sans décès : `AAAA · Lieu · Profession` (ex. « 1952 · Vanves · Vétérinaire »)

**Badge** : `border-radius: 999px`, fond `#eef2ec`, texte `#2f5142`, 11px bold.
- Valeurs : « Personne », « Lieu », « Événement »

Click → `/person/[id]`

---

### Section Archives externes

Titre Newsreader 19px « Archives externes ».
Grille `repeat(4, 1fr)`, gap 13px.

Chaque card (radius 14px, padding 17px, hover `border-color: #c9a86a`) :
- Nom de l'archive 14px bold
- Description 11.5px `#8a8474`
- Nb résultats : `X résultats →` en 11.5px bold `#2f5142`

Archives à afficher :
| Nom | Description | URL de recherche |
|-----|-------------|-----------------|
| BnF Gallica | Presse & registres numérisés | `https://gallica.bnf.fr/recherche/...?query=` |
| Le Maitron | Dictionnaire du mouvement ouvrier | `https://maitron.fr/spip.php?recherche=` |
| VIAF | Fichier d'autorité international | `https://viaf.org/search#query=cql.any+=+` |
| Wikidata | Données ouvertes liées | `https://www.wikidata.org/w/index.php?search=` |

Pour chaque archive : lancer une requête au chargement (ou on-demand) et afficher le nombre de hits.
Implémenter via `/api/research?q=<query>&archive=<name>` (route `/api/research` existe déjà — vérifier).

---

## Comportement de recherche

1. La search bar du **header global** set la query dans l'URL : `/search?q=<query>`
2. `page.tsx` lit `searchParams.q` et appelle `/api/persons?q=<query>` (full-text Neo4j)
3. Résultats affichés avec debounce 300ms côté client (si input dans la page)
4. Si query vide → afficher les 10 dernières personnes consultées (localStorage) ou top personnes

---

## API

`GET /api/persons?q=<query>` → `{ persons: SearchResult[] }`

Query Neo4j (full-text search) dans `src/lib/queries/search.ts` :
```cypher
CALL db.index.fulltext.queryNodes("personIndex", $q + "*") 
YIELD node, score
RETURN node.id AS id, node.fullName AS name, 
       node.birthYear AS birthYear, node.birthPlace AS birthPlace,
       node.occupation AS occupation, node.sex AS sex, score
ORDER BY score DESC LIMIT 20
```

Si l'index full-text n'existe pas encore, le créer :
```cypher
CREATE FULLTEXT INDEX personIndex IF NOT EXISTS 
FOR (p:Person) ON EACH [p.fullName, p.givenNames, p.surname, p.occupation, p.birthPlace]
```

---

## Notes
- Résultats archives : requêtes cross-origin → les faire côté serveur dans `/api/research`.
- Afficher un skeleton loader pendant les requêtes.
- Si aucun résultat : message « Aucun résultat pour "xxx" — essayez un autre terme. »
