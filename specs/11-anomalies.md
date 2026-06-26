# Spec — Anomalies

## Fichiers à modifier
- `src/app/anomalies/page.tsx` (170 lignes — existant)

## Cible (DC)

### En-tête
- H1 : « Rapport d'anomalies » Newsreader 30px
- Sous-titre : « Incohérences détectées automatiquement dans les données. » 13.5px
- `max-width: 820px`

### Grille de stats (4 colonnes)

```
grid-template-columns: repeat(4, 1fr); gap: 14px; margin-bottom: 26px
```

Chaque card (radius 14px, padding 18px, text-align center) :
- Chiffre Newsreader 30px, couleur selon type
- Label 12px `#8a8474`

| Stat | Couleur |
|------|---------|
| Erreurs | `#c0392b` |
| Avertissements | `#b8860b` |
| Informations | `#8a8474` |
| Homonymes | `#b07d57` |

---

### Liste d'anomalies

Container : `background: #fffdf9; border: 1px solid #e9e2d2; border-radius: 16px; overflow: hidden`

Chaque anomalie :
```
display: flex; align-items: flex-start; gap: 13px;
padding: 13px 18px;
border-bottom: 1px solid #f1ebdd;
border-left: 4px solid <accent>;   ← couleur selon sévérité
```

**Badge sévérité** :
```
font-size: 11px; font-weight: 700; padding: 3px 9px; border-radius: 999px;
```

| Sévérité | Texte | Accent | Badge bg | Badge texte |
|----------|-------|--------|----------|-------------|
| Erreur | « Erreur » | `#d98b82` | `#fae6e3` | `#b03a2e` |
| Attention | « Attention » | `#e3c685` | `#f8eecf` | `#8a6d12` |
| Info | « Info » | `#d8d0bd` | `#efeadd` | `#6b6557` |

**Contenu** :
- Nom personne : bouton 14px bold → `/person/[id]`, hover `color: #2f5142`
- Message 12.5px `#7c7666`

---

## Détection des anomalies (logique)

Implémenter dans `src/lib/queries/anomalies.ts` ou Server Action.
Catégories à détecter :

### Erreurs (critiques)
- **Homonymes** : 2+ personnes avec même nom complet (sauf déclinaisons)
  ```cypher
  MATCH (a:Person), (b:Person) WHERE a.id < b.id AND a.fullName = b.fullName
  RETURN a, b
  ```
- **Date de décès avant naissance**
  ```cypher
  MATCH (p:Person) WHERE p.birthYear IS NOT NULL AND p.deathYear IS NOT NULL 
  AND toInteger(p.deathYear) < toInteger(p.birthYear)
  ```
- **Enfant né avant le père** (différence < 10 ans)

### Avertissements
- Personne sans date de naissance précise (estimation `≈`)
- Personne vivante > 110 ans
- Mariage > 50 ans d'écart entre conjoints

### Informations
- Personne sans date de décès (non marquée comme vivante)
- Personne sans lieu de naissance
- Personne sans parents connus (hors racines de l'arbre)

---

## API

`GET /api/anomalies` → 
```ts
{
  stats: { label: string; count: number; color: string }[];
  anomalies: { 
    id: string; name: string; personId: string; 
    message: string; severity: 'err' | 'warn' | 'info';
  }[];
}
```

---

## Notes
- Trier par sévérité : erreurs → avertissements → infos
- Ajouter bouton « Relancer l'analyse » (utile après modifications)
- Click sur nom → `/person/[id]` avec highlight de l'anomalie (via query param `?highlight=anomaly`)
