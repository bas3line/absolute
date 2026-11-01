# Contributing

Thanks for wanting to make the site better. Fixes, accessibility and performance work, and ideas for the drawings or the panel are all welcome.

## Setup

You need Node 20.9 or later.

```sh
git clone https://github.com/bas3line/absolute
cd absolute
npm install
npm run dev        # http://localhost:3000
```

The landing page is `/`, and the control panel is `/dashboard` (or `/dashboard?demo`, which unlocks it for you).

## How it fits together

- `src/app/page.tsx`: the landing page, top to bottom, in sections.
- `src/components/sections/`: one file per section (`Hero.tsx`, `Blackbox.tsx`, `Regions.tsx`, `Pricing.tsx`, ...), and the drawings each one uses (`HeroIsland.tsx`, `RegionsMap.tsx`, `ClosingRack.tsx`, ...).
- `src/components/kit.tsx`: what the sections share: `Wide`, `Section`, `Kicker`, `Title`, the buttons, `useInView`, `Reveal` and `usePrefersReducedMotion`.
- `src/app/dashboard/`: one route per panel page. `layout.tsx` mounts the session above all of them, so it survives moving between pages.
- `src/components/dashboard/`: the panel.
  - `store.tsx`: the whole session, one reducer with a one-second heartbeat that drives the clock, the telemetry and every boot, reboot and reinstall.
  - `data.ts`: the demo account (its boxes, keys and invoices) and the pure helpers around it.
  - `Shell.tsx`, `Gate.tsx`, `Palette.tsx`: the frame, the credential screen and ⌘K.
  - `ui.tsx` and `glyphs.ts`: the panel's buttons, panels, LEDs, and the pixel drawings as strings.
  - one file per page: `Overview.tsx`, `Servers.tsx`, `ServerDetail.tsx`, `Deploy.tsx`, `Billing.tsx`, `Keys.tsx`, `Activity.tsx`, `CanaryView.tsx`.
- `src/lib/catalog.ts`: plans, prices, locations, systems and ways to pay. `src/lib/brand.ts`: the name, the onion address and the canary date.
- `src/app/globals.css`: the palette as CSS variables and Tailwind tokens, and the few classes Tailwind can't express (`notch`, the dot and hatch backgrounds).

## The rules the site follows

- **One palette.** Grey paper, slate ink, mint, lime, pink and periwinkle, with `accent` (a deep mint) for text. Use the tokens (`bg-paper`, `text-ink-2`, `bg-mint`, `text-accent`), not new hex values.
- **Drawn in code.** Pictures are SVG, canvas or CSS, built from numbers in the component. No raster images, photos, dithering or halftones.
- **One catalogue.** Plans, prices, locations and payment methods live only in `catalog.ts`, and both the landing page and the panel read them from there, so the two never disagree.
- **The panel stays a demo.** Nothing leaves the tab: no requests, no cookies, no storage. Anything that looks like an address, key, hash or payment is plainly fake: IPs from the documentation ranges (`203.0.113.0/24`, `2001:db8::/32`), `.example` domains, QR codes that scan as nothing.
- **The site is static.** `next build` exports every page as HTML. No server actions, route handlers, cookies or dynamic route segments; anything that varies per box or per visit is read in the browser (a server's page is `/dashboard/servers?id=<name>`).
- **Reduced motion is respected.** Anything that moves on its own checks `usePrefersReducedMotion()` (or `motion-safe:` in CSS) and shows its finished frame instead.
- **No new runtime dependencies without a reason.** If something needs a library, say why in the pull request.
- **Copy says what things are.** Plain verbs, sentence case, no filler.

## Checks

```sh
npm run check      # typecheck, lint, production build
npm run preview    # the build, served by Wrangler like Cloudflare serves it
```

CI runs `npm run check` on every pull request. Before you open one, also look at your change in a browser at a phone width (390 px) and a laptop one (1440 px), and with reduced motion on (in Chrome's DevTools, Rendering, "Emulate CSS media feature prefers-reduced-motion"). If you touched the panel, click through it from `/dashboard?demo` without reloading: a reload forgets the session by design.

## Pull requests

Keep each one to one change, and say what it changes, how you checked it, and include a screenshot for anything visual. Commits in the imperative ("Add a reinstall confirmation"), one idea each.
