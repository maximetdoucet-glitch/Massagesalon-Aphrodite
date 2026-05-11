# Massagesalon Aphrodite — demo site

Pitch-quality demo site for **Massagesalon Aphrodite**, Hertogstraat 67 in Nijmegen-Centrum. Built off the `solo-massage-practitioner-template` skeleton with a dark wine + gold + sand palette swap for the sensual / editorial vibe that fits a centrum-located massagesalon. Cal.com booking system pre-wired.

**Status:** demo / cold-pitch only. Photos are Unsplash stock. Service prices, hours and copy are positioned as plausible defaults — Aphrodite verifies on sign-on.

## Structure

```
massagesalon-aphrodite/
├── index.html              ← hero, salon-teaser, 3 signature massages (sensueel/duo/hotstone), cadeau strip, reviews, locatie-teaser, boeken
├── over-ons.html           ← Aphrodite-verhaal, 4 principle-cards (discretie/tempo/ambiance/respect), 5 wat-ons-anders-maakt-rijen, suite-galerij
├── behandelingen.html      ← 6 massages + tarieven + cadeaubonnen sectie + praktisch (6 cards)
├── locaties.html           ← Hertogstraat 67 + Google Maps embed + bereikbaarheid (fiets/OV/auto)
├── js/booking.js           ← Cal.com booking modal (SHOP_HOURS 7d/wk + 6 SERVICES configured for Aphrodite)
├── api/                    ← Cal.com proxy (/event-types, /slots, /bookings)
├── images/                 ← leeg in demo — foto's laden direct vanaf Unsplash CDN
├── package.json
├── vercel.json
├── DESIGN.md
└── README.md (dit bestand)
```

## Shop config

| Veld | Waarde |
|---|---|
| Volledige naam | Massagesalon Aphrodite |
| Adres | Hertogstraat 67, 6511 RW Nijmegen-Centrum |
| Telefoon | 06 5276 6898 (display) · +31652766898 (E.164) |
| E-mail | info@massagesalonaphrodite.nl *(placeholder — verify)* |
| KvK | 63212471 (gevonden via Oozo) |
| Openingstijden | Ma–Vr 11:00–23:00 · Za 12:00–23:00 · Zo 12:00–22:00 |
| Massages (slug → naam) | `klassiek` Klassieke massage · `ontspanning` Ontspanningsmassage · `sensueel` Sensuele massage · `duo` Duomassage · `hotstone` Hot Stone · `thai` Thaise massage |
| Tarieven | 60 min €85 · 90 min €115 · Duo 60 €170 · Duo 90 €230 |

## Palette

Dark wine + gold + sand variant on top of the solo-practitioner skeleton:

| Token | Hex |
|---|---|
| `bg.deep` | `#1A0E14` (dark wine) |
| `bg.surface` | `#28161E` |
| `bg.elevated` | `#371F2A` |
| `border.subtle` | `#4A2935` |
| `ink.primary` | `#EFE5D2` (warm cream on dark) |
| `ink.muted` | `#B09A82` |
| `gold.DEFAULT` | `#D4A55A` (warm sensual gold) |
| `botanical` | `#C49A6E` (warm sand instead of sage) |

CTAs are `bg-gold text-bg-deep` (dark text on gold) — premium contrast on dark.

## ⚠️ Verify before livegang

Items that are **placeholder/assumed** in the demo and must be confirmed with the shop:

- [ ] **E-mail** — `info@massagesalonaphrodite.nl` is a guess. Bevestig of vervang.
- [ ] **Domein** — `massagesalonaphrodite.nl` is geclaimd? Anders alternatief (aphrodite-nijmegen.nl, salon-aphrodite.nl).
- [ ] **Foto's** — alle img-tags wijzen naar Unsplash-stock dark/moody photos. Voor productie: eigen suite-fotografie (geen mensen i.v.m. discretie + Vercel AUP).
- [ ] **Openingstijden** — Ma–Vr 11:00–23:00, weekend 12:00–22:00/23:00 is een typische centrum-salon aanname. Bevestig actueel.
- [ ] **Aantal suites** — site claimt "twee privé-suites met eigen badkamer". Bevestig of aanpassen (1, 3, …).
- [ ] **Tarieven** — €85/€115/€170/€230 zijn marktconform voor centrum-Nijmegen maar niet bevestigd.
- [ ] **Champagne bij duomassage** — claim "inclusief glas champagne na afloop". Bevestig of weglaten.
- [ ] **Loyaliteitsvoordeel** — "na 5 bezoeken complimentaire upgrade naar 90 min" — aanname. Bevestig of weglaten.
- [ ] **Reviews** — alle 5 quotes zijn placeholder. Vervang door echte reacties (vraag toestemming).
- [ ] **Vertical positioning** — site is "sensueel maar respectvol" gepositioneerd. Stem af met eigenaar: gaat hun werk meer richting erotisch/sensueel, of klassiek/wellness? Per richting passen we de copy aan en kiezen we hosting (Vercel vs Hetzner+Caddy bij volledig erotisch — i.v.m. Vercel AUP).

## Vercel-AUP-waarschuwing

Als Aphrodite's daadwerkelijke service-mix erotisch werk omvat (lingam, body-to-body, happy-end), kan deze site op Vercel suspended worden. In dat geval:

1. Migreer naar **Hetzner Cloud + Caddy** (~€6/maand) of een andere host zonder strikte adult-policy
2. Vervang Cal.com booking met een **request-only systeem** (Cal.com is in principe OK met adult mits geen expliciete content, maar het is grey area)
3. Hou de copy *suggestief* maar nooit *expliciet* — geen prijzen voor extra's, geen anatomische termen

De huidige demo blijft binnen Vercel/Cal.com policy zolang de positionering "sensueel maar niet expliciet" blijft.

## Local preview

```bash
python -m http.server 8000
# http://localhost:8000
```

## Going live

1. Aphrodite maakt een Cal.com-account aan (let op AUP-status van content)
2. Voor elke service een Event Type met slug `<key>-<duur>` (bv. `sensueel-60`, `duo-90`)
3. Availability in Cal.com matchen met `SHOP_HOURS` in `js/booking.js` (7 dagen, 11:00–23:00)
4. `npx vercel` → `vercel env add CALCOM_API_KEY production` → `vercel --prod`
5. Custom domein via Vercel dashboard

Tot Cal.com is gekoppeld werkt de modal als demo: stappen 1–3 laden, stap 4 (tijd) toont "Online boeken nog niet geactiveerd — bel 06 5276 6898". Bel/WhatsApp/mail blijven altijd zichtbaar.
