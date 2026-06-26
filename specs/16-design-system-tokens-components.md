# Design System — Mises à jour claude.ai/design

Projet DesignSync : `ad7815b8-8613-4da0-b313-61bb5c109069`

Le design system sur claude.ai/design a été enrichi automatiquement avec des tokens CSS formels, une bibliothèque de composants React et des fichiers de documentation. Ce document liste les deltas par rapport au code actuel.

---

## 1. Tokens CSS (à adopter dans `globals.css`)

Le design system expose désormais des variables CSS sémantiques. Le code actuel utilise des valeurs hexadécimales inline partout. Migration recommandée :

### Couleurs (`tokens/colors.css`)

```css
/* Verts */
--green-900: #0f1d16;   /* hero gradient tail */
--green-800: #15271f;   /* nav rail */
--green-700: #1e3a2f;   /* boutons primaires, dark hero */
--green-600: #2f5142;   /* focus ring, accents */

/* Or */
--gold-500:  #c9a86a;   /* accent principal */
--gold-300:  #d6bd8e;   /* texte doré sur fond sombre */

/* Papier */
--paper-card:  #fffdf9;
--paper-body:  #f4f1ea;
--paper-page:  #e9e4d8;

/* Lignes */
--line:        #e7e0d0;
--line-strong: #e0d8c6;
--line-soft:   #f1ebdd;

/* Encre */
--ink-900: #1c1f1c;
--ink-600: #5a5e52;
--ink-500: #8a8474;
--ink-400: #9aa89b;

/* Statut */
--ok-bg: #eef2ec;       --ok-fg: #2f5142;
--today-bg: #f6e8c0;    --today-fg: #8a6d12;
--warn-bg: #f7e6d6;     --warn-fg: #b5651d;
--danger-bg: #fef2f2;   --danger-fg: #b91c1c;   --danger-line: #fca5a5;
```

### Radii & espacements (`tokens/layout.css`)

```css
--r-sm: 8px;      /* nav items */
--r-md: 10px;     /* boutons */
--r-lg: 11px;     /* inputs, search */
--r-card: 16px;   /* cards */
--r-list: 14px;   /* list rows */
--r-pill: 999px;

--shadow-card: 0 8px 28px -14px rgba(30,58,47,.4);
--shadow-pop:  0 8px 24px rgba(0,0,0,.1);
```

---

## 2. Composants React (bibliothèque formalisée)

Le design system expose des composants JSX réutilisables dans `components/`. Ils ne sont pas encore dans la codebase — tout est en JSX inline.

### `Button` (`components/actions/Button.jsx`)
- Variantes : `primary`, `secondary`, `danger`, `ghost`
- Tailles : `md` (38px), `sm` (32px)
- Props : `variant`, `size`, `icon`, `disabled`, `children`

### `Badge` (`components/actions/Badge.jsx`)
- Tons : `ok`, `today`, `warn`, `neutral`, `danger`

### `Input` (`components/forms/Input.jsx`)
- Type `text` ou `search` (avec icône loupe intégrée)

### `Select` (`components/forms/Select.jsx`)

### `Avatar` (`components/people/Avatar.jsx`)
- Initiales monogramme, `tint` (slate / vert / or)

### `PersonListItem` (`components/people/PersonListItem.jsx`)
- Composition : `Avatar` + nom + méta + `Badge` optionnel

---

## 3. Travaux identifiés

### Priorité 1 — Tokens CSS
- [ ] Importer `tokens/colors.css` (ou équivalent) dans `globals.css` pour remplacer les valeurs inline
- [ ] Aligner les noms de variables existantes dans `globals.css` (`--color-bg-body` → `--paper-page`, etc.)

### Priorité 2 — Composants partagés
- [ ] Créer `src/components/ui/Button.tsx` basé sur le design system
- [ ] Créer `src/components/ui/Badge.tsx`
- [ ] Créer `src/components/ui/Input.tsx` (inclut la variante search)
- [ ] Créer `src/components/ui/Avatar.tsx`
- [ ] Créer `src/components/ui/PersonListItem.tsx`
- [ ] Remplacer les boutons inline dans search, relation, doublons, feedback par `Button`
- [ ] Remplacer les badges inline dans anomalies, anniversaires par `Badge`

### Priorité 3 — Cohérence typographique
- [ ] Vérifier que tous les `font-family: var(--font-serif)` utilisent bien Newsreader
- [ ] Vérifier `letter-spacing: -.02em` sur tous les H1-H2

---

## 4. Conventions de contenu (readme.md du DS)

- Séparateur de faits : ` · ` (middot entouré d'espaces)
- Plages : en-dash `–` (pas de tiret court `-`)
- Noms : prénom normal + NOM EN MAJUSCULES dans les records et résultats de recherche
- Labels uppercase : tracking large, 10–11px, sans accent couleur particulier
- Aucun emoji dans l'UI
- Icônes : Lucide SVG inline, stroke 1.7–2.0, `currentColor`
