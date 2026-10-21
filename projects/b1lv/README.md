# Bronco 1 case study

Static page at `projects/b1lv/`. It uses the existing case-study palette and typography from `assets/css/orbes.css`, with B1LV-specific rules in `assets/css/b1lv.css`. No JavaScript or build step is required. ORBES remains the first selected project on the homepage.

## Content scope

Gavin's documented contribution covers meeting notes, design-change records, inventory support and shared technical reporting. The final report contributor table credits shared sections VII, VIII, XV and Appendix I. The FMEA appendix also explicitly credits Gavin among its authors. Team tests and model results are distinguished from individual work, and model predictions are not presented as measured service life or flight achievements.

Sources are named on the page, including the final report's contribution table (p. 275), personal reflection (pp. 137–138), and FMEA appendix (pp. 145–146). Page references follow the source report. The complete report and test procedures are not included in this repository.

## Approved media

The page uses seven approved visual panels: the wider test stand, piping replica CAD, hardware detail, annotated piping photograph, pressure-flow evidence, combined-stress model and team work area.

See the [complete asset provenance](../../assets/images/b1lv/README.md) for source documents, figure/page locations, approval scope, crop bounds and image processing. One visible credit covers all team visuals; concise captions distinguish team evidence, personal reporting and model predictions. Detailed qualifications remain in the source disclosure. Technical figures have full-size links.

## Validation

Copy tightening comparison against `8bedb6b`: default-visible body text decreased from **757 to 458 words**; excluding captions, **527 to 342**. Main-content-only counts are **733 to 434**, or **503 to 318** excluding captions. Method: parse HTML text nodes, join with spaces, then count whitespace-delimited tokens containing a Unicode letter or digit. Include headings, navigation, captions, credits, link labels and footer; exclude head metadata, attributes/alt text, scripts/styles, hidden elements, the offscreen skip link, and closed `details` content except its `summary`. These are consistent source-based counts, not browser-rendered measurements.

Column image `sizes` follow the CSS grid: hardware detail uses 60% of the available row after its gap; the team photo uses 50%. The 600px breakpoint stacks both at full content width. At an 800px viewport and 1× pixel density, declared slots are 436.8px and 364px respectively, allowing the 600px candidates; higher pixel density may correctly request larger files.

Run `node scripts/check-site.cjs` from the repository root. The checker covers the homepage and both case studies, project-base paths, local links, image alt text, metadata and focusable skip destinations. Native `details` elements provide source/evidence notes with no JavaScript dependency. Browser layout and keyboard checks should cover desktop, phone and zoomed views before merge.
