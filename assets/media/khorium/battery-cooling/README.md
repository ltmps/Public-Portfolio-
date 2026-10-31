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
