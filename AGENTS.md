# AGENTS.md

Guidance for anyone, human or agent, editing this portfolio.

## Writing and layout

Avoid unnecessary secondary labels and descriptions. Let the layout do the explaining.

On this site that means:

- A heading stands on its own. Do not add a kicker or tagline beside or above it (for example "Detail B · Score against references", "Part", "Sheet 03").
- Do not repeat what the breadcrumb, the spec strip (Role, Team, Tools, Work) or the lead paragraph already says. Put dates and organizations in the spec strip once.
- Do not tell the reader how to operate the page ("Hover to play", "Click to enlarge", "Select a legend entry"). Controls explain themselves through their form and label.
- Do not label media by format ("Video, muted", "0:46 / Silent / 24 fps"). A caption says what the picture shows.
- Keep labels that carry facts found nowhere else: test conditions, units, legends that decode color, and form-field labels.

## Checks before a commit

- Run `node scripts/check-site.cjs`.
- Run `node --check` on any changed file in `assets/js/`.
- Every `assets/css` and `assets/js` reference carries `?v=` set to the first 10 characters of the SHA-256 of the file with LF line endings. Update it whenever the file changes.
