# Spec — Doublons

## Fichiers à modifier
- `src/app/doublons/page.tsx` (194 lignes — existant)
- `src/app/doublons/actions.ts` (Server Actions existantes)
- `src/app/doublons/PairCard.tsx` (existant)

## Cible (DC)

### En-tête
- H1 : « Détection de doublons » Newsreader 30px
- Sous-titre : « Fusionnez ou écartez les paires de personnes potentiellement identiques. » 13.5px
- `max-width: 880px`

### Grille stats (4 colonnes)

Même pattern que anomalies :
| Stat | Couleur |
|------|---------|
| Certains | `#c0392b` |
| Probables | `#b8860b` |
| Possibles | `#5b7da3` |
| Ignorés | `#9a9080` |

---

### Liste de paires

Chaque paire = card (radius 16px, border `#e9e2d2`, overflow hidden) :

**Header de paire** :
```
padding: 10px 18px; background: <headBg>; border-bottom: 1px solid #ece5d5;
display: flex; align-items: center; gap: 10px;
```
- Niveau de confiance en majuscules : `text-transform: uppercase; letter-spacing: .06em; font-size: 11px; font-weight: 700`
- Raison à droite : 12px `#8a8474`

| Confiance | headBg | confCol |
|-----------|--------|---------|
| Certain | `#fae6e3` | `#b03a2e` |
| Probable | `#f8eecf` | `#8a6d12` |
| Possible | `#e9eff5` | `#3f617f` |

**Corps de paire** (grille 1fr 1fr, séparés par border-right) :
- Chaque côté : `padding: 16px 18px`
- Nom 14px bold
- Méta 12px `#8a8474` : « AAAA – AAAA · Lieu »

**Corps de paire** (grille 1fr 1fr) :
- Chaque côté : `padding: 16px 18px`, séparés par `border-right: 1px solid #e9e2d2`
- Nom 14px bold (Link vers /person/id)
- Méta 12px `#8a8474` : « AAAA – AAAA · Lieu » (pas de bouton de fusion par colonne)

**Footer** (nouveau design depuis mockup 14) :
```
padding: 12px 18px; border-top: 1px solid #f1ebdd; background: #fffdf9;
```
État normal :
- Bouton « Fusionner » primary `Button` → affiche état de sélection
- Bouton « Ignorer » secondary `Button`

État sélection (après clic Fusionner) :
- Texte « Garder : » + bouton [Nom A] + bouton [Nom B] + bouton fantôme « Annuler »
- Cliquer sur un nom lance la fusion en gardant cette personne

---

## Algorithme de détection

Implémenter dans `src/lib/queries/doublons.ts` :

### Certains (score > 0.95)
- Même nom complet + même date de naissance

### Probables (score 0.8–0.95)
- Même nom de famille + même prénom principal + lieu proche (même département)
- Même nom complet + dates proches (± 5 ans)

### Possibles (score 0.6–0.8)
- Même nom de famille + même prénom + aucune date de naissance pour aucun des deux
- Même nom complet + pas de dates
- Prénom et nom très proches (distance Levenshtein ≤ 2)

**Query Neo4j approximative** :
```cypher
MATCH (a:Person), (b:Person)
WHERE a.id < b.id
  AND a.surname = b.surname
  AND (a.givenNames STARTS WITH split(b.givenNames, ' ')[0] 
       OR b.givenNames STARTS WITH split(a.givenNames, ' ')[0])
RETURN a, b, 
  CASE 
    WHEN a.birthYear = b.birthYear THEN 'certain'
    WHEN abs(toInteger(a.birthYear) - toInteger(b.birthYear)) < 10 THEN 'probable'
    ELSE 'possible'
  END AS confidence
```

---

## Server Actions

Dans `src/app/doublons/actions.ts` :

### `mergePersons(idA: string, idB: string)`
- Conserver la personne avec le plus de données (A ou B)
- Fusionner les relations, événements, sources de l'autre
- Supprimer la personne source

### `ignorePair(idA: string, idB: string)`
- Créer une relation `KNOWN_NOT_DUPLICATE` entre les deux nœuds
- Ces paires ne réapparaissent plus dans la liste

---

## Notes
- Paires ignorées : stocker dans Neo4j comme `[:KNOWN_NOT_DUPLICATE]` entre les deux nœuds.
- Après fusion ou ignore : retirer la paire de la liste (revalidatePath ou optimistic update).
- Trier : Certains → Probables → Possibles → (onglet Ignorés optionnel).
