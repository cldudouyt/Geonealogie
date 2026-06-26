# Spec — Suggestions reçues + Formulaire feedback

Deux écrans liés :
- `/feedback` → Admin : liste des suggestions reçues
- Bouton « Suggérer » dans le header → formulaire d'envoi

## Fichiers à modifier
- `src/app/feedback/page.tsx` (129 lignes — existant)
- `src/app/feedback/actions.ts` (existant)

---

## Écran 1 — Suggestions reçues (`/feedback`)

### En-tête
- H1 : « Suggestions reçues » Newsreader 30px
- Sous-titre : « Demandes et corrections envoyées par la famille. » 13.5px
- `max-width: 820px`

### Liste de suggestions

Chaque suggestion = card (radius 16px, border `#e9e2d2`, padding 18px 20px) :
```
display: flex; gap: 16px;
```

**Corps** :
- H2 : titre 15px bold
- Méta : « Par Marie · 12 mars 2026, 14:20 » — 12px `#9a9080`
- Corps texte : 13.5px `#4a4f46`, line-height 1.55, margin-top 11px

**Badge statut** (à droite, `align-self: flex-start`) :
| Statut | Fond | Texte | Bordure |
|--------|------|-------|---------|
| Ouvert | `#e9eff5` | `#3f617f` | `#cdddea` |
| En cours | `#f8eecf` | `#8a6d12` | `#ecd9a3` |
| Résolu | `#e6f0e9` | `#2f5142` | `#c2dccb` |

---

## Écran 2 — Formulaire « Suggérer »

### Cible (DC)

Accessible via le bouton « Suggérer » dans le header → naviguer vers `/feedback/new` ou afficher en modal.
Le DC montre un formulaire centré dans le main (pas une modale).

**Container** : `max-width: 520px; background: #fffdf9; border: 1px solid #e9e2d2; border-radius: 18px; padding: 32px; margin: 40px auto`

**Titre** : Newsreader 26px « Suggérer une amélioration »
**Sous-titre** : 13.5px `#6c7064`

**Champs** :
1. « Votre prénom » (optionnel) — input height 42px, radius 10px
2. « Titre de la suggestion » (\*requis) — même style
3. « Description » (\*requis) — textarea 5 lignes, resize:none, radius 10px

Focus state : `border-color: #2f5142; box-shadow: 0 0 0 3px rgba(47,81,66,.12)`

**Bouton envoi** : pleine largeur, height 44px, radius 11px, fond `#1e3a2f`, hover `#15271f`

---

## Données / Stockage

Actuellement : suggestions envoyées via GitHub Issues (`GITHUB_TOKEN`).
Garder ce comportement + persister dans Neo4j pour la liste admin.

**Server Action `submitSuggestion`** :
```ts
async function submitSuggestion(data: { author?: string; title: string; body: string }) {
  // 1. Créer un Issue GitHub (si GITHUB_TOKEN configuré)
  // 2. Persister dans Neo4j avec statut 'open' + timestamp
  // 3. Revalidate /feedback
}
```

**Query Neo4j** :
```cypher
CREATE (s:Suggestion {
  id: randomUUID(),
  title: $title,
  body: $body,
  author: $author,
  status: 'open',
  createdAt: datetime()
})
```

**Mise à jour statut** (admin) :
```cypher
MATCH (s:Suggestion { id: $id })
SET s.status = $status  // 'open' | 'in_progress' | 'resolved'
```

---

## Notes
- Validation côté client + serveur : titre et description requis
- Après envoi réussi : message de confirmation « Merci, votre suggestion a été envoyée ! »
- La liste des suggestions n'est visible que par l'administrateur (auth requise)
- Le formulaire est accessible à tous les membres connectés
