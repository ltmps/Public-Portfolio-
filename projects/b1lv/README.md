# Bronco 1 case study

Static page at `projects/b1lv/`. It uses the existing case-study palette and typography from `assets/css/orbes.css`, with B1LV-specific rules in `assets/css/b1lv.css`. No JavaScript or build step is required. ORBES remains the first selected project on the homepage.

## Content scope

Gavin's documented contribution covers meeting notes, design-change records, inventory support and shared technical reporting. The final report contributor table credits shared sections VII, VIII, XV and Appendix I. The FMEA appendix also explicitly credits Gavin among its authors. Team tests and model results are distinguished from individual work, and model predictions are not presented as measured service life or flight achievements.

Sources are named on the page, including the final report's contribution table (p. 275), personal reflection (pp. 137–138), and FMEA appendix (pp. 145–146). Page references follow the source report. The complete report and test procedures are not included in this repository.

## Approved media

Selected from the April 2023 B1LV Senior Project Symposium Presentation, with credit to the B1LV team, Cal Poly Pomona Liquid Rocket Lab, 2022–2023:

- Slide 17, `image30.jpeg`: water-flow test hardware from 17 March 2023. Exported as `water-flow-test.jpg` (1824 × 1368) and `water-flow-test-600.jpg` (600 × 450), preserving the full frame and aspect ratio.
- Slide 13, `image22.png`: tank pressure versus mass flow, Block 1. Exported as `pressure-flow-analysis.png` (947 × 602), with unchanged pixels, including axes, units, legend and error bars.

Exports omit source metadata. Each displayed image includes team credit; the analysis figure has a full-size link. The page states the reported leakage and test inconsistencies alongside the plot.

## Validation

Run `node scripts/check-site.cjs` from the repository root. The checker covers the homepage and both case studies, project-base paths, local links, image alt text, metadata and focusable skip destinations. Native `details` elements provide source/evidence notes with no JavaScript dependency. Browser layout and keyboard checks should cover desktop, phone and zoomed views before merge.
