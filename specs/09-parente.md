# Spec — Chemin de parenté

## Fichiers à modifier
- `src/app/relation/page.tsx` (169 lignes — existant)

## État actuel
Page de relation existante. Adapter au design DC et enrichir l'UI.

## Cible (DC)

### En-tête
- H1 : « Chemin de parenté » Newsreader 30px
- Sous-titre : « Le lien généalogique le plus court entre deux personnes. » 13.5px
- `max-width: 900px`

### Sélecteur De → À

Deux cards de sélection côte à côte (+ icône flèche entre elles) :
```tsx
<div style="flex:1; min-width:220px; background:#fffdf9; border:1px solid #e0d8c6; border-radius:13px; padding:12px 15px;">
  <div style="font-size:10.5px; text-transform:uppercase; color:#9a9080;">De</div>
  <div style="font-size:14.5px; font-weight:700;">Claire Dudouyt</div>
</div>
```

Ces cards doivent être cliquables → ouvrir un sélecteur de personne (search dropdown ou modal).
Implémenter comme input avec autocomplete (réutiliser la logique de search).

### Résultat (bandeau vert)
```
background: #1e3a2f; color: #f4efe3; border-radius: 14px; padding: 16px 20px;
display: flex; align-items: center; gap: 12px;
```
- Icône chevron doré `#c9a86a`
- Texte : « Ramón est le **grand-oncle maternel** de Claire · 3 liens »

### Chemin (liste de personnes) — mockup 11

Pour chaque personne dans le chemin :
- Card pleine largeur `Link` (hover `border-color: #c9a86a`), `border: 1px solid #e7e0d0`, `border-radius: 13px`
- **Avatar** 40px cercle (`border-radius: 50%`), initiales 2 lettres, tint par sexe : M=`#e4ecf3/3f617f`, F=`#f4e3e0/9c5a52`, U=`#f0ece4/6b5e48`
- Nom 14px bold + **seulement l'année de naissance** 12px `#8a8474` (format : « né en YYYY » ou « née en YYYY »). Confirmé mockup 11 — pas de date de décès dans la liste du chemin.

Entre deux personnes : connecteur avec :
- Ligne verticale 2px `#d8cfb8` (indent 20px)
- Badge relation : `border-radius: 999px`, fond `#f1ece0`, border `#e3dcca`, texte `#6b5e48`
- Ex. : « est la fille de », « est le fils de », « est la sœur de »

---

## Algorithme de recherche de chemin

Utiliser l'API Neo4j avec recherche de chemin court :
```cypher
MATCH path = shortestPath(
  (a:Person { id: $fromId })-[:SPOUSE|CHILD_OF|PARENT_OF*..10]-(b:Person { id: $toId })
)
RETURN [node in nodes(path) | {
  id: node.id, name: node.fullName, sex: node.sex,
  birthYear: node.birthYear, deathYear: node.deathYear
}] AS pathNodes,
[rel in relationships(path) | type(rel)] AS rels
```

Convertir les relations GEDCOM en texte :
```ts
function relLabel(relType: string, fromSex: string, toSex: string): string {
  if (relType === 'CHILD_OF') return fromSex === 'F' ? 'est la fille de' : 'est le fils de';
  if (relType === 'PARENT_OF') return fromSex === 'F' ? 'est la mère de' : 'est le père de';
  if (relType === 'SPOUSE') return 'est marié(e) avec';
  return 'est relié(e) à';
}
```

Calculer le titre de relation (grand-oncle, cousin germain, etc.) selon la structure du chemin :
Table de correspondance ou algorithme de degré de parenté.

---

## API

`GET /api/relation?from=<id>&to=<id>` :
```ts
{
  relationship: string;   // "grand-oncle maternel"
  degree: number;         // 3
  path: { id: string; name: string; sex: string; birthYear?: string; relToNext?: string }[];
}
```

L'API `/api/relation` existe déjà — vérifier si elle retourne le chemin complet ou seulement le degré.

---

## Notes
- Si les deux personnes sont identiques → « C'est la même personne. »
- Si aucun chemin → « Aucun lien généalogique trouvé entre ces deux personnes. »
- Les deux sélecteurs de personnes doivent mémoriser les choix en URL params :
  `/relation?from=<id>&to=<id>` pour que le lien soit partageable.
