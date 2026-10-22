# CAPCOM linked mission study v5

Selected unchanged media from the user-cleared `CAPCOM_linked_mission_study_v5.zip`, rooted at `CAPCOM_Mission_Explorer/mission_profiles_120s/`. `manifest.json` records each selected archive entry, size and SHA256. Four `mission_01–04_120s_capture_v3.mp4` recordings and their posters supersede the previous mission exports. Direct routes A/B map to 01/02; Mars-assisted A/B map to 03/04. Additional selection: arrival 01, neighboring-window comparison plot and C3 launch-to-arrival animation, with supplied posters. No duplicate GIFs, original reports, raw states or regeneration code are distributed.

## Mission and capture scope

The archive `assumptions_and_sources.md`, “Report-supported values,” cites original report pages 4/10 for launch concept, page 9 for proposed polar orbit and page 6 for the historical assumed comet gravity model. Those references are retained from the package; the original report is not in this ZIP. Solar routes use digitized XY, assumed zero Z and estimated between-event timing. Local conics and capture are separate from the heliocentric endpoint; scene transitions change frames and scale. `arrival_geometry.json` retains endpoint differences against the reference ephemeris.

“Arrival reference comparison,” `capture_validation.json` and `state_validation.json` describe an assumed local two-body capture: incoming hyperbola, braking into an ellipse, then circularization and a plane change. Its assumed incoming speed, nucleus pole and spherical gravity do not establish operational capture, stability or mission fuel requirements. Published prose describes the local example separately. Numerical checks are supplied package results, not newly rerun model validation.

Chapter timing from “Presentation timing”: launch 0 s, parking 22 s, departure 32 s, transfer 40 s, Mars cutaway 58 s where applicable, approach 85 s, capture braking 91 s, circularization/plane-change display 100 s and final orbit 103 s. Screen durations compress different physical time scales; the displayed impulse hold is not a finite burn duration.

## Window and launch-vehicle comparison

`design/windows.html` and `design/window_comparison.json`: lowest sampled local C3 minimum per calendar year for 2029/2030/2031 at fixed 550-Earth-day duration, with unconstrained arrival speed. Sun-centered geometric Horizons states, prograde zero-revolution solar two-body Lambert; four-day departure and five-day flight-time grid. The selected 2030 candidate has the lowest C3 and arrival speed among these three. This is separate from the historical low-thrust/Mars-assisted profiles and is not a global optimum. C3 is fixed at departure, not a time-varying cruise quantity. The comparison plot supplies accessible text values in its alt text.

`design/launch_vehicle.html`, “The report's energy argument,” and `design/launch_vehicle_audit.json` distinguish the original 1,000 kg Atlas V 541 rationale from later variants using C3 = 49. The report estimate, saved 2029 solution and four later plots differ. Public prose describes the need for configuration-specific payload-energy assessment, without claiming vehicle feasibility or reproducing unverified screening limits. No new NASA performance-table claims are made. Those external query results were not independently re-queried for this portfolio pass.

## Attribution and presentation

CAPCOM is a team mission concept; this package does not establish sole individual ownership of every analysis. Earth imagery: NASA/Goddard SVS Blue Marble, https://svs.gsfc.nasa.gov/2915. Mars imagery: NASA/JPL-Caltech/USGS Viking mosaic, documented in `landmark_sources.json` (https://space.jpl.nasa.gov/tmaps/mars.html). Launch reference: ULA Atlas V User's Guide (2010). Body and vehicle geometry are schematic; geographic orientation and local flyby plane are illustrative. Jupiter/Saturn references supply scale, not added encounters. Original burned-in annotations remain unchanged.

All ten new package MP4s decoded successfully during read-only review; representative plots, posters and frames were inspected. This selection contains six videos. Native controls and paused chapter jumps are retained; switching missions keeps the current time and stays paused. The default mission plays with native controls without JavaScript. Switching has no animation. Source archive and original files remain untouched.
