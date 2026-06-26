# Design tokens & conventions globales

Source de vérité : `Géonéalogie.dc.html` (ZIP fourni par le client).

---

## Couleurs

```css
/* Fond */
--color-bg-body:   #e9e4d8;   /* <body> */
--color-bg-main:   #f4f1ea;   /* zone <main> */
--color-bg-card:   #fffdf9;   /* cartes, inputs */
--color-bg-hover:  #f3efe5;   /* row hover */

/* Navigation rail */
--color-nav-bg:    #15271f;
--color-nav-text:  #e8e4d8;
--color-nav-muted: #9aa89b;
--color-nav-label: #6f8073;
--color-nav-active-bg: rgba(201,168,106,.16);
--color-nav-active-text: #f0e6cf;
--color-nav-hover-bg: rgba(255,255,255,.07);

/* Vert principal */
--color-green-dark: #15271f;
--color-green-mid:  #1e3a2f;
--color-green:      #2f5142;
--color-green-light: #4a7058;
--color-green-tint: #eef2ec;

/* Or accent */
--color-gold:        #c9a86a;
--color-gold-text:   #d6bd8e;

/* Texte */
--color-text-body:   #1c1f1c;
--color-text-muted:  #8a8474;
--color-text-subtle: #6c7064;
--color-text-label:  #9a9080;

/* Bordures */
--color-border-card:  #e7e0d0;
--color-border-item:  #e9e2d2;
--color-border-input: #e0d8c6;
--color-border-divider: rgba(255,255,255,.09);

/* Sexe */
--color-male-tint: #e4ecf3;  --color-male-ink: #3f617f;  /* bleu acier */
--color-female-tint: #f4e3e0; --color-female-ink: #9c5a52; /* rose terracotta */

/* Sévérités */
--color-err-accent: #d98b82;   --color-err-badge-bg: #fae6e3; --color-err-badge: #b03a2e;
--color-warn-accent: #e3c685;  --color-warn-badge-bg: #f8eecf; --color-warn-badge: #8a6d12;
--color-info-accent: #d8d0bd;  --color-info-badge-bg: #efeadd; --color-info-badge: #6b6557;
```

## Typographie

```
Titres h1/h2  : Newsreader, serif — weight 500/600, letter-spacing -.02em
Corps         : Hanken Grotesk, sans-serif — weight 400/600/700
Monospace     : ui-monospace (logs géocodage)
```

Import Google Fonts dans `layout.tsx` :
```ts
import { Newsreader, Hanken_Grotesk } from 'next/font/google';
const newsreader = Newsreader({ subsets: ['latin'], weight: ['400','500','600'], style: ['normal','italic'], variable: '--font-serif' });
const hanken = Hanken_Grotesk({ subsets: ['latin'], weight: ['400','500','600','700'], variable: '--font-sans' });
```

**Remplacer** les fonts actuelles (Geist/Geist_Mono/Playfair) — elles ne correspondent pas au DC.

## Border-radius

| Contexte | Valeur |
|----------|--------|
| Cards principales | 16px |
| Cards hero/arbre | 20px |
| Items de liste | 13px |
| Bouton primaire | 10–12px |
| Inputs | 10–11px |
| Badges/tags | 999px |
| Avatars/initiales | 50% |
| Avatars carrés | 10–12px |

## Animations

```css
@keyframes geo-fade {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: none; }
}
/* Appliquer sur chaque <section> d'écran : animation: geo-fade .4s ease both */
```

## Patron de carte (`card`)

```tsx
<div className="bg-[#fffdf9] border border-[#e9e2d2] rounded-2xl p-6 hover:border-[#c9a86a] transition-colors">
  ...
</div>
```

## Pattern grille de fond (zones arbre/réseau)

```css
background-image: radial-gradient(#e4dcc8 1px, transparent 1px);
background-size: 22px 22px;
background-color: #fbf9f3;
```
