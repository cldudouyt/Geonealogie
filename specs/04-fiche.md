# Spec — Fiche personne

## Fichiers à modifier
- `src/app/person/[id]/page.tsx`

## État actuel
Route `/person/[id]` existe. Contenu à vérifier — le DC montre une fiche riche non présente dans l'UI courante.

## Cible (DC)

### Hero header (fond sombre)
```
background: linear-gradient(155deg, #1e3a2f, #15271f)
padding: 34px 48px 30px
color: #f4efe3
```

Bouton retour « ← Retour à l'arbre » :
- fond `rgba(255,255,255,.10)`, border `rgba(255,255,255,.16)`
- texte `#d6e0d8`, 12.5px bold, radius 9px

**Avatar** : 84px × 84px, radius 18px, fond dégradé vert, border `rgba(201,168,106,.4)`.
- Initiales (2 lettres) Newsreader 32px, couleur `#d6bd8e`

**Titre** :
- Supra-titre : « LIGNÉE [NOM_FAMILLE] » — 11px uppercase `#9fb0a1`, letter-spacing `.16em` (ex. « LIGNÉE DUDOUYT »). **Pas de numéro de génération** (confirmé mockup 06).
- H1 : tous les prénoms séparés par des virgules + nom de famille — Newsreader 36px weight 500.
  Ex. : « Jean, Charles, Henri Dudouyt » (pas seulement le prénom principal).
- Méta-ligne (éléments séparés par ` · `, icônes SVG, couleur `#aebaae`) :
  - Lieu de naissance avec code dept. si France (ex. « Vanves (92) »), icône pin map
  - Profession (ex. « Vétérinaire »)
  - Âge calculé (ex. « 74 ans ») — `deathYear - birthYear` ou `currentYear - birthYear`

---

### Corps (grid 1.5fr 1fr, gap 30px, padding 30px 48px 60px, max-width 1120px)

#### Colonne gauche

**Card Biographie** :
- Titre Newsreader 19px
- Texte 14px line-height 1.7, couleur `#3f443c`
- Multi-paragraphes
- Donnée : champ `NOTE` GEDCOM ou override Neo4j

**Card Chronologie** :
- Timeline verticale : points colorés + ligne verticale `#e7e0d0`
- Chaque événement : année (12px bold `#2f5142`) + titre (13.5px bold) + lieu (12.5px `#8a8474`)
- Point couleurs : naissance `#2f5142`, études/carrière `#5b7da3`, événement spécial `#c9a86a`
- Données : naissance, mariage(s), événements OCCU/RESI GEDCOM, décès

#### Colonne droite

**Card Famille proche** :
- Titre Newsreader 18px
- Liste de boutons (hover border `#c9a86a`, fond `#f7f3ea`) :
  - Avatar 34px rounded-full, tint par sexe
  - Nom 13px bold + relation 11px `#8a8474`
  - Relations : Père, Mère, Époux(se), Fils, Fille, Frère/Sœur

**Card Détails** :
- Liste `<dl>` avec `justify-content: space-between` par ligne
- 13px : label `#8a8474` à gauche, valeur bold à droite
- Champs : Profession, Nationalité, Service militaire, Sources (lien vert)

---

## Données nécessaires (Neo4j / GEDCOM)

```ts
interface PersonDetail {
  id: string;
  fullName: string;        // prénoms + nom
  givenNames: string;
  surname: string;
  birthDate?: string;
  birthPlace?: string;
  deathDate?: string;
  deathPlace?: string;
  occupation?: string;
  sex: 'M' | 'F' | 'U';
  generation?: number;
  lineage?: string;        // ex. "Dudouyt"
  note?: string;           // biographie
  events: { year: string; title: string; place?: string; type: 'birth'|'event'|'special'|'death' }[];
  relatives: { id: string; name: string; relation: string; sex: string }[];
  sourceCount: number;
}
```

Route : `GET /api/persons/[id]` — vérifier qu'elle retourne ces champs.
Si non, étendre la query Cypher dans `src/lib/queries/`.

---

## Navigation
- Bouton « Retour » → `router.back()` ou lien vers `/tree?focus=<id>`
- Click sur relative → naviguer vers `/person/[relative.id]`
- Lien « Sources » → modal ou section expandable (hors scope v1)

---

## Notes
- Si `note` est vide, masquer la card Biographie (ou afficher placeholder « Aucune biographie »).
- Âge calculé : `currentYear - birthYear` ou `deathYear - birthYear` si décédé.
- Personnes vivantes : ne pas afficher la date de naissance exacte (respect vie privée), afficher seulement l'année.
