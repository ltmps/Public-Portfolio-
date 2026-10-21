# Engineering portfolio

Static HTML and CSS with a small interaction script for the ORBES case study. B1LV uses native disclosure controls and needs no JavaScript. Satellite and Singularity are compact text-first project pages with no JavaScript dependency. Modeling & Simulation is a curated overview of architecture, dynamics, mission studies and integration, also usable without JavaScript. No build step or package installation is needed. Serve the repository root with an existing static server to preview the homepage and all five project pages with their relative links.

## Checks

With Node.js available, run:

```sh
node scripts/check-site.cjs
node --check assets/js/orbes.js
node --check assets/js/project-selector.js
node scripts/check-project-selector.cjs
```

The dependency-free checker covers all six entry points: local resources and fragments, project-base paths, page metadata, image alt attributes, focusable skip-link targets and project/contact navigation. It does not render pages or verify external services.

Before merging visual changes, check desktop and phone layouts, keyboard navigation and horizontal overflow in a browser. Confirm the fixed outer-gutter ORBES index at 1640px or wider and its compact fallback below that width. Preserve the existing reduced-motion behavior.

The homepage rocket-project selector synchronizes sector/row hover, focus and tap with a full-logo display and highlighted project row. It keeps all descriptions visible and falls back to static headings and logos without JavaScript. `check-project-selector.cjs` verifies event handling, pressed states, logo mappings, ARIA targets and fallback source markup without a browser. It does not verify rendered layout, focus visibility or real touch behavior. Logo provenance is recorded in `assets/images/projects/README.md`.
