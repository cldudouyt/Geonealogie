# Spec — Login

## Fichiers à modifier
- `src/app/login/page.tsx` (existant)
- `src/app/login/actions.ts` (existant)

## Cible (DC)

L'overlay login est une page plein-écran (pas une modale), displayed quand non authentifié.

### Fond
```
position: fixed; inset: 0; z-index: 100;
background: linear-gradient(155deg, #1e3a2f 0%, #15271f 60%, #0f1d16 100%)
```
Décoration : `radial-gradient` doré en haut à droite, `opacity: .6`.

### Card centrale

```
width: 100%; max-width: 380px;
background: #fffdf9; border-radius: 22px; padding: 38px 34px;
box-shadow: 0 30px 80px -30px rgba(0,0,0,.6);
```

**Logo** (centré, mb-28px) :
- Icône 52px × 52px, radius 15px, fond dégradé vert, stroke `#c9a86a`
- Titre Newsreader 26px « Géonéalogie »
- Sous-titre 13px `#8a8474` « Accès privé — famille uniquement »

**Formulaire** :
- Label « Mot de passe » 13px bold `#3a4038`
- Input password : height 44px, radius 11px, autofocus
- Bouton : height 46px, radius 12px, fond `#1e3a2f`, hover `#15271f`

---

## Comportement (existant à vérifier)

- `actions.ts` contient la Server Action de vérification du mot de passe
- Mot de passe hashé dans `AUTH_SECRET`, texte clair dans `AUTH_PASSWORD`
- Redirection vers `/` après succès
- Erreur : message « Mot de passe incorrect » sous le bouton

---

## Notes
- Le layout principal ne doit pas render le nav rail sur `/login`
- Conditionner dans `layout.tsx` : `if (pathname === '/login') return <>{children}</>`
- La page login est déjà implentée — seul le style visuel est à aligner sur le DC
