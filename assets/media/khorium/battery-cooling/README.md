# Battery-cooling findings

Selected figures and summary data from the completed illustrative two-pack thermal study, cleared for the portfolio by the user. The website separates numerical verification from conditional thermal requirements and missing hardware validation.

## Public selection

- `thermal-response.png`: unchanged final hot/cold response figure.
- `numerical-checks.png`: unchanged scoped mesh/time comparison figure.
- `summary.json`: public numerical results, declared inputs, scope and figure SHA256 hashes.

The assessment was closed on 31 October 2026. Cold mesh/time comparisons were independently reproduced locally and all 800 fine fields replayed. Hot records contain the scoped native geometric audits and documented local checks. Differences are numerical comparisons, not statistical uncertainty bounds. Hot/cold conditions differ in initial state, ambient, flow and documented discretization history. No actual aircraft, full flight envelope or semiconductor junction temperatures were validated. The 54-state ROM fails its withheld representation test and has no independent mission acceptance.

Recommendations describe candidate conduction, duct and ventilation-control changes; no temperature benefit is claimed. No new simulation was performed for this page. Source archives, machine paths, AWS identifiers, private study URLs and full raw outputs are intentionally excluded from the public selection. The source study remains preserved in the user's local delivery package.

## VTK screenshot

`khorium-vtk-diagnostic.jpg` is an authentic, unedited viewport capture from the signed-in Khorium web viewer on 31 October 2026. It shows the original CHT geometry with coolant hidden, nine solids visible, opacity 100%, and streamlines/probe line off. The original setup used a 25 C inlet and 40 W per pack, unlike the final external thermal histories. Its legacy Converged badge conflicts with detailed NOT_CONVERGED verification and an unacceptable energy balance. The website states this discrepancy explicitly. This image supports geometry/workflow illustration only, never thermal acceptance. The narrow viewport clips the right edge of the model/legend; the full-size image preserves exactly what the viewer displayed.

## Interactive CAD

`cad-geometry.json` exports the retained end-fin CAD as 46 orthogonal primitive boxes across 17 solids. Each solid volume was compared with the CAD manifest and agrees within a relative tolerance of 1e-10. Source STEP SHA256: `fa088e8ca7d546c092bada71f7a0d36650376666e44958f10da07ba5cc4f726c`. The export uses the retained geometry definition rather than the older Khorium screenshot geometry. This is a display representation, not a new mesh or solve; internal shared primitive faces may remain. `cad-poster.svg` is a static projection of the same geometry for no-JavaScript or failed-load fallback.

The dependency-free canvas viewer supports pointer rotation, two-touch pinch zoom, focused wheel zoom, keyboard arrows/+/-/Home/Space, zoom/reset buttons, optional spin and a hide-cover cutaway. Spin is paused by default, pauses on direct manipulation, stops rendering offscreen/when the tab is hidden and stops on a changed reduced-motion preference. Component colors have a text legend and do not encode temperatures.
