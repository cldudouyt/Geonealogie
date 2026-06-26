# Spec — Arbre généalogique

## Fichiers à modifier
- `src/app/tree/` (ou `src/app/page.tsx?focus=` — clarifier route)
- `src/components/tree/FamilyTree.tsx`
- Créer `src/components/tree/TreeVertical.tsx`
- Créer `src/components/tree/TreeRadial.tsx` (éventail + roue)
- Créer `src/components/tree/TreeListe.tsx`

## État actuel
`FamilyTree.tsx` existe. Route actuelle : `/?focus=<id>`.
Adapter pour avoir une route propre `/tree` ou garder le pattern existant.

## Cible (DC)

### En-tête de page
- H1 : « Arbre généalogique » Newsreader 30px weight 500
- Sous-titre : « Cliquez sur une personne pour recentrer l'arbre sur elle. » 13.5px `#8a8474`
- Sélecteur de mode : 4 onglets dans container `background: #ece5d5; padding: 4px; border-radius: 12px`

**Onglet actif (depuis mockup 02)** : pill plein `background: #1e3a2f; color: #f1ede2; border-radius: 999px; padding: 6px 14px; font-size: 13px; font-weight: 600`
**Onglets inactifs** : fond transparent, texte `#6c7064`, pas de border-radius — juste `padding: 6px 14px`

### Carte personne focus (nouveau — entre les onglets et l'arbre)
Card `background: #fffdf9`, `border: 1px solid #e7e0d0`, `border-radius: 16px`, `padding: 16px 20px` :
- **Avatar** 52px cercle, initiales 2 lettres, couleurs par sexe (M=`#dde7f1/3f617f`, F=`#f3e1de/9c5a52`)
- **Nom** : `var(--font-serif)`, 18px, weight 500
- **Badge** « Centre de l'arbre » : `background: #eef2ec`, `color: #2f5142`, radius 999px, 11px, weight 600
- **Méta** : année naissance–décès, 13px `#8a8474`
- **Bouton** « Recentrer sur [prénom] » : secondary (bordure `#e0d8c6`), avec icône ↺ — appelle `onFocus(focusId)`
- **Bouton** « Voir la fiche » : primary `#1e3a2f`, avec icône personne — `Link` vers `/person/${focusId}`

**Breadcrumb navigation** sous la card :
- Label « NAVIGATION » 10.5px uppercase `#9a9080`
- Pill prénom : `background: #1e3a2f`, `color: #f4efe3`, radius 999px, 12px
  - Vertical / Éventail / Roue / Liste
  - Actif : fond `#1e3a2f` texte `#f1ede2`, radius 9px
  - Inactif : transparent, texte `#6c7064`

### Légende (en bas de page)
- Hommes : carré bleu `#5b7da3`
- Femmes : carré rose `#b5736b`
- Personne centrale : carré vert `#1e3a2f`

---

## Mode Vertical

**Container** : fond `#fbf9f3`, border `#e9e2d2`, radius 20px, grille de points (voir tokens 00).
`overflow-x: auto`, `min-width: 920px` interne.

**Labels de section (depuis mockup pasted)** : au-dessus de chaque rangée de génération, afficher un label uppercase `PARENTS` ou `ENFANTS` :
```
font-size: 10.5px; letter-spacing: .14em; text-transform: uppercase;
color: #8a8474; text-align: center; margin-bottom: 8px;
```

**Carte personne** :
```
width: 172px (personne normale) / 188px (personne centrale)
border-radius: 13px
padding: 13px
box-shadow: 0 4px 14px -10px rgba(0,0,0,.4)
cursor: pointer → navigate to /person/[id]
```

| Type | Fond | Border |
|------|------|--------|
| Homme | `#fff` | `border: 1px solid #d6e0ea; border-top: 3px solid #5b7da3` |
| Femme | `#fff` | `border: 1px solid #ecd9d6; border-top: 3px solid #b5736b` |
| Personne centrale | `linear-gradient(160deg,#1e3a2f,#15271f)` | `border: 1px solid #2f5142` + badge « Focus » doré |

Contenu carte :
- Nom : 13.5px bold, `color: #1c1f1c` (ou `#f4efe3` si centrale)
- Méta : 11.5px `#8a8474`, format `AAAA – AAAA · Lieu`

**Lignes de connexion** : `width: 2px`, `background: #d8cfb8`, height 30px entre générations.

**Structure générations** (de haut en bas) :
1. Grands-parents paternels (ou maternels selon focus)
2. Parents
3. Personne centrale (focus)
4. Enfants

---

## Mode Éventail / Roue (SVG radial)

**Container** : même grille de fond, `display: flex; justify-content: center`.

**SVG** : `viewBox="0 0 760 600"` (roue) ou `"0 0 760 470"` (éventail).

**Segments** :
- Calculer via `buildRadial()` du DC (logique JS → adapter en TypeScript)
- Éventail : demi-cercle supérieur (A0=180°, A1=360°)
- Roue : cercle complet (A0=-90°, A1=270°)
- Anneaux (rIn, rOut) : génération 1 → 4 couches concentriques
- Couleur : hommes `fill: #dde7f1 stroke: #9bb4cd`, femmes `fill: #f3e1de stroke: #d3a8a1`

**Centre** :
- Cercle `fill: #1e3a2f`, `stroke: #c9a86a`, `stroke-width: 2`
- Texte prénom Newsreader 15px `#f4efe3`
- Texte année Hanken 11px `#9fb0a1`

Interactivité : click sur segment → naviguer vers `/person/[sosaId]`.

---

## Mode Liste (Sosa-Stradonitz)

Container blanc, border `#e9e2d2`, radius 20px.

Header : 14px 22px padding, texte gris `#8a8474` — explique la numérotation Sosa.

Chaque ligne :
- Bouton pleine largeur, hover `#f7f3ea`
- Badge Sosa : 34px × 34px, radius 9px, fond coloré par génération (alt. bleu/vert/doré)
- Numéro Sosa 13px bold
- Nom 14px bold + dates/lieu 12px
- Label génération à droite

Données : numérotation Sosa depuis la personne focus.
Algorithme : sosa 1=focus, 2=père, 3=mère, 4=grand-père paternel, etc.

---

## API nécessaire

`GET /api/tree?focus=<id>&generations=4`
Retourne `{ persons: Person[], relations: Relation[] }` structurés pour le rendu.
L'API `/api/tree` existe déjà — vérifier le format de réponse.

---

## Notes
- La personne focus doit être passée via query param `?focus=<id>`, défaut = premier Dudouyt.
- Sur mobile, mode Vertical → scroll horizontal, modes Éventail/Roue → scale SVG.
- Ajouter bouton « Voir la fiche » sur chaque carte (hover).
