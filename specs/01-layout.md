# Spec — Layout global (nav rail + header)

## Fichiers à modifier
- `src/app/layout.tsx` — structure racine, fonts, nav rail
- `src/app/globals.css` — variables CSS, scrollbar custom

## État actuel
Layout = `<body>` avec enfants directs + `<LogoutButton />` flottant.
Pas de nav rail, pas de header global, pas de search bar globale.

## Cible (DC)
```
<html>
  <body style="background:#e9e4d8">
    <div style="display:flex; height:100vh; overflow:hidden;">
      <nav>   ← 248px fixe, fond #15271f, sticky         </nav>
      <main>  ← flex:1, flex-direction:column             
        <header>  ← 66px, search bar + boutons           </header>
        <div>     ← flex:1, overflow-y:auto, contenu     </div>
      </main>
    </div>
  </body>
</html>
```

---

## Nav rail — détail

**Dimensions** : `width: 248px`, `flex: none`, `height: 100vh`, `overflow-y: auto`.

**Couleurs** : fond `#15271f`, texte `#e8e4d8`.

**En-tête (logo)** :
- Logo SVG arbre généalogique (icône actuelle, stroke `#c9a86a`, fond dégradé `#2f5142→#1c3528`)
- Titre « Géonéalogie » — font Newsreader 21px weight 600
- Sous-titre « Famille Dudouyt » — 10.5px, letter-spacing .18em, uppercase, couleur `#9aa89b`

**Sections nav** (labels en majuscules 10px `#6f8073`) :
- Principal : Accueil, Arbre, Carte des origines, Recherche
- Explorer : Réseau de relations, Anniversaires, Chemin de parenté, Parcours migratoire
- Qualité des données : Anomalies, Doublons
- Administration : Géocodage, Suggestions reçues

**Item de nav** :
```tsx
// Style de base
"flex items-center gap-[11px] w-full text-left border-0 cursor-pointer font-sans 
 text-[13.5px] font-semibold px-[11px] py-[9px] rounded-[10px] transition-colors"

// Inactif  : bg transparent, couleur #a9b6a9
// Actif    : bg rgba(201,168,106,.16), couleur #f0e6cf
// Hover    : bg rgba(255,255,255,.07)
```
Détection de route active : `usePathname()` côté client, ou `pathname === '/arbre'` etc.

**Pied de nav** (profil utilisateur) :
- Avatar initiales « CD » (32px, rounded-full, bg `#2f5142`, texte doré)
- Nom « Clément Dudouyt » 12.5px bold + « Administrateur » 10.5px
- Bouton déconnexion (icône logout SVG)
- Séparé du reste par `border-top: 1px solid rgba(255,255,255,.09)`

---

## Header global — détail

**Dimensions** : `height: 66px`, `flex: none`.
**Fond** : `rgba(244,241,234,.85)` + `backdrop-filter: blur(8px)`.
**Bordure** : `border-bottom: 1px solid #e4ddcd`.
**Padding** : `0 30px`.

**Search bar** :
- Max-width 460px, flex:1
- Input height 40px, radius 11px, border `#e0d8c6`, fond `#fffdf9`
- Icône loupe positionnée `left: 14px`
- Placeholder : « Rechercher une personne, un lieu, une date… »
- Focus : border `#2f5142` + `box-shadow: 0 0 0 3px rgba(47,81,66,.12)`
- `onFocus` → naviguer vers `/search`

**Boutons à droite** :
- « Suggérer » : bouton outline avec icône crayon → `/feedback`
- « Exporter » : bouton primaire (fond `#1e3a2f`, texte `#f1ede2`) avec icône download

---

## Scrollbar custom (globals.css)

```css
::-webkit-scrollbar { width: 10px; height: 10px; }
::-webkit-scrollbar-thumb { background: #c9c0ac; border-radius: 8px; border: 2px solid transparent; background-clip: content-box; }
::-webkit-scrollbar-track { background: transparent; }
nav::-webkit-scrollbar { width: 6px; }
nav::-webkit-scrollbar-thumb { background: rgba(255,255,255,.16); }
```

---

## Implémentation

### `layout.tsx`
```tsx
// 1. Remplacer fonts Geist par Newsreader + Hanken_Grotesk
// 2. Structure :
export default function RootLayout({ children }) {
  return (
    <html lang="fr">
      <body className="bg-[#e9e4d8]">
        <div className="flex h-screen overflow-hidden">
          <NavRail />          {/* Composant Server Component */}
          <main className="flex-1 flex flex-col min-w-0">
            <GlobalHeader />   {/* Client Component (search state) */}
            <div className="flex-1 overflow-y-auto">
              {children}
            </div>
          </main>
        </div>
      </body>
    </html>
  );
}
```

### `src/components/NavRail.tsx` (nouveau, Server Component)
- Importer `usePathname` → doit être Client Component (`"use client"`)
- Rendre les liens avec `<Link href="...">` Next.js
- Groupes : Principal / Explorer / Qualité des données / Administration
- Profil utilisateur en bas

### `src/components/GlobalHeader.tsx` (nouveau, Client Component)
- Search input avec `useRouter` pour `onFocus → push('/search')`
- Bouton Suggérer → `Link href="/feedback"`
- Bouton Exporter → déclenche export (API existante `/api/export`)

---

## Notes critiques
- La `LogoutButton` actuelle flottante doit être intégrée dans le pied du nav rail.
- Le layout actuel wrap les pages avec `<body>{children}</body>` — l'ajout du nav rail
  impose de remplacer ce pattern. S'assurer que `/login` et l'overlay login restent
  full-screen (ne pas inclure le nav rail sur `/login`).
- Conditionner le nav rail : `if (pathname === '/login') return <>{children}</>` dans le layout.
