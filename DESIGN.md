# DESIGN.md — Massagesalon Aphrodite (Massagesalon Blueprint, warm-earth variant)

> Design system voor de site van Massagesalon Aphrodite in Nijmegen-Centrum. Variant op de massagesalon-blueprint die ook Royal Thai aandrijft. Lees dit bestand voordat je een nieuwe sectie of variant bouwt.

---

## 1. Visual Theme & Atmosphere

**Mood:** Donkere, geaarde rust. Warm-aardse near-black achtergrond met cremekleurige typografie en een zachte koper-bronzen accent. Voelt als een lichte praktijkruimte bij avond — eenvoudig, premium, lichaamsgericht-zonder-zweverig. Botanische motieven als subtiele decoratie.

**Inspiratie:** De donkere-spa-blueprint van Royal Thai, maar verschoven van burgundy-Thai-luxe naar Hollandse-holistische warmte. Geen exotisch goud meer maar een geaarde koper (alsof gepolijst hout in een licht houden). Past bij een 1-op-1 lichaamsgericht practitioner — niet bij een hotelspa.

**Don't:** Stockfoto-cliché met witte handdoeken op witte achtergrond. Geen kitscherige "wellness"-fonts of pastel. Geen new-age-iconografie.

---

## 2. Color Palette & Roles

| Token | Hex | Rol |
|---|---|---|
| `--bg-deep` | `#16110D` | Page background — warm near-black met bruine ondertoon |
| `--bg-surface` | `#221A14` | Cards, elevated panels |
| `--bg-elevated` | `#2E241B` | Hover state, secondary cards |
| `--border-subtle` | `#3D3024` | Divider lines, card borders |
| `--text-primary` | `#EFE5D2` | Body text — warm cream |
| `--text-muted` | `#B09A82` | Secondary text, captions |
| `--text-faint` | `#6F5C4F` | Disabled, fine print |
| `--accent-gold` | `#C9A06B` | Primary CTA, statlines, dividers — warm bronzen koper (i.p.v. Royal Thai goud) |
| `--accent-gold-soft` | `#A38150` | Hover state op accent |
| `--accent-botanical` | `#8FA68A` | "Op afspraak"-indicator, levende-aarde-toets |

> Tailwind-class blijft `gold` heten om dezelfde markup te kunnen reuse'n; alleen de hex-waarde verschilt van Royal Thai.

**Ratio (60-30-10):**
- 60% `--bg-deep` + `--bg-surface` (page + cards)
- 30% `--text-primary` (typografie)
- 10% `--accent-gold` (CTAs, accenten)

**WCAG check:** `--text-primary` op `--bg-deep` ≈ 12:1 ✅. Accent op deep bg ≈ 7:1 ✅.

---

## 3. Typography Rules

| Use | Font | Weight | Size mobile | Size desktop |
|---|---|---|---|---|
| Display H1 | Cormorant Garamond | 500 (italic accent) | 44px | 76px |
| H2 | Cormorant Garamond | 500 | 32px | 52px |
| H3 | Cormorant Garamond | 500 | 22px | 28px |
| Kicker | Manrope | 600 uppercase, letter-spacing 0.18em | 11–12px | 12px |
| Body | Manrope | 400/500 | 16px | 18px |
| Caption | Manrope | 400 | 13px | 14px |

**Italic rule:** Eén woord per kop wordt cursief in accent-koper — werkt als visuele rust-pauze. ("Ontspan en maak *verbinding*...")

**Logo-mark:** wordmark "Massagesalon Aphrodite" + tagline "Massage" in tracking-kicker. Geen apart logobestand — typografie is het logo. Kleine ronde "gj"-mark in koper-rand-cirkel ernaast.

---

## 4. Layout System

- **Max-width:** 1280px content; full-bleed accents (gradients, sfeerbeelden).
- **Gutters:** `px-6 lg:px-12`.
- **Vertical rhythm:** `py-20 lg:py-32` voor sectie-spacing; `py-16 lg:py-24` voor compactere strips.
- **Card radii:** 20–32px (Tailwind `rounded-[24px]` is meest gebruikt).
- **Grid bias:** 12-kolom op desktop; 7/5 of 6/6 splits voor hero/teaser-secties.

---

## 5. Components

### Buttons
- **Primary CTA:** Solid `--accent-gold` bg, `--bg-deep` text, pill (rounded-full), gold shimmer-overlay bij hover (`.cta-gold`).
- **Secondary:** Ghost-button met `--border-subtle` border, hover → border en text naar accent.

### Cards
- `bg-bg-surface` + `border-border-subtle` + `rounded-[24px]`.
- Hover state: border accent/40 + `translate-y(-1px)`.
- Iconen worden in `icon-tile` (gradient-subtle accent-bg + accent-border).

### Pricing pills
- Outline-pill `border-border-subtle` met label `60 min · €65`. Geen filled chips — houdt de pagina rustig.

### Reveal animations
- `.reveal` → fade + 28px y-translate (GSAP ScrollTrigger).
- `.reveal-img` → clip-path inset reveal (links → rechts).
- Both honor `prefers-reduced-motion`.

### Nav
- Vast bovenaan, transparant bovenpagina, scrolled state krijgt blur + dark surface.
- Mobile: full-screen drawer met display-font links.

---

## 6. Decorative Elements

- **Leaf-deco SVG:** abstracte blad-vorm in `--accent-gold` met 5% opacity en `mix-blend-mode: screen` — werkt als sfeer in hoeken.
- **Pulse-dot:** botanical-groen "Op afspraak"-indicator (langzame opacity-pulse).
- **Selection:** custom geel selecteerd background voor body-tekst.

---

## 7. Voice / Copy Principes

- **Toon:** Direct, lichaamsbewust, rustig. Gebruikt "ik" (de salon zelf) i.p.v. "wij" — het is een 1-op-1 praktijk.
- **Geen marketing-clichés:** niet "ultieme luxe-ervaring" maar "een goed contact is de voorwaarde".
- **Sleutelwoorden:** aandacht, aanraking, verbinding, lichaam, gevoel, ademhaling.
- **Vermijd:** te etherisch ("aura's", "chakra's"), te klinisch ("therapie"), te commercieel ("deals", "actie").

---

## 8. Bestanden & Stack

- `index.html` — homepage (~600 regels)
- `over-ons.html` — het verhaal van Aphrodite + 4 aanpak-cards + opleidingen-timeline
- `behandelingen.html` — 6 massages + tarieven + cadeaubonnen + praktisch
- `locaties.html` — single-location detail + map + bereikbaarheid
- `vercel.json` — clean URLs + security headers
- `images/` — leeg, foto's worden geladen van massagesalonaphrodite.nl WP CDN

**Stack:** HTML + Tailwind Play CDN + GSAP/ScrollTrigger + Lenis. Geen build.

---

## 9. Verschillen t.o.v. Royal Thai instance

| Aspect | Royal Thai | Massagesalon Aphrodite |
|---|---|---|
| Palet | Burgundy-deep + warm gold | Earth-deep + warm bronze/koper |
| Locaties | Twee (Arnhem + Nijmegen) | Eén (Nijmegen-Centrum) |
| Behandelingen | 12 massages + 5 pakketten | 6 massages, prijs naar duur |
| Voice | "Wij" (team van therapeuten) | "Ik" (solo-practitioner) |
| Decoratief | Thai-script in kicker (`ไ`) | Geen — Dutch holistic context |
| USP | 15+ jaar Thai-traditie | 17+ jaar lichaamsgericht + oncologische specialisatie |
| Logo | PNG-wordmark | Pure typografie + "gj"-ringmarker |
