# Engineering portfolio

Static HTML and CSS with a small interaction script for the ORBES case study. B1LV uses native disclosure controls and needs no JavaScript. No build step or package installation is needed. Serve the repository root with an existing static server to preview the homepage and both case studies with their relative links.

## Checks

With Node.js available, run:

```sh
node scripts/check-site.cjs
node --check assets/js/orbes.js
```

The dependency-free checker covers all three entry points: local resources and fragments, project-base paths, page metadata, image alt attributes, focusable skip-link targets and project/contact navigation. It does not render pages or verify external services.

Before merging visual changes, check desktop and phone layouts, keyboard navigation and horizontal overflow in a browser. Confirm the fixed outer-gutter ORBES index at 1640px or wider and its compact fallback below that width. Preserve the existing reduced-motion behavior.
