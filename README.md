# Engineering portfolio

Static HTML and CSS following the "Portfolio Directions" drafting-table design. Light is the default theme; the dark mesh-field theme is a toggle at the top right of every page, stored in `localStorage` under `gy-theme` and synced across open pages. Shared styles and behavior live in `assets/css/gy.css`, `assets/js/gy.js` (theme, crosshair and loupe, card glow, hover-to-play media, hover-zoom figures) and `assets/js/gy-mesh.js` (hero mesh refinement). Mission studies and the systems architecture study add `mission-studies.js` and `architecture-study.js`. Every page reads fully without JavaScript and respects `prefers-reduced-motion`. No build step, package installation or external dependency is needed. Serve the repository root with any static server to preview the homepage, the simulations overview, three study pages, the playback viewer and four project pages.

## Checks

With Node.js available, run:

```sh
node scripts/check-site.cjs
node scripts/check-modeling-media.cjs
node --check assets/js/gy.js
node --check assets/js/gy-mesh.js
node --check assets/js/mission-studies.js
node --check assets/js/architecture-study.js
```

`check-site.cjs` covers all ten entry points: local resources and fragments, project-base paths, page metadata, image alt attributes, focusable skip-link targets, project and contact navigation, the shared theme assets and toggle, and the no-em-dash copy rule. `check-modeling-media.cjs` covers media dependencies, no autoplay, muted hover-to-play media, caption-strip labels, CAPCOM phase-jump timing and v5 media, the architecture scenario data and envelope grid, playback-viewer privacy guards and approved media hashes. Neither renders pages or verifies external services.

Before merging visual changes, check desktop and phone layouts in both themes, keyboard navigation and horizontal overflow in a browser, and preserve the reduced-motion behavior. Headless Chromium builds without H.264 cannot play the MP4s; use a full Chrome or substitute a WebM when testing playback.
