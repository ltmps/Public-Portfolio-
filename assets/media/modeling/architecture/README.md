# SCExample systems architecture media

Cleared for public release by Gavin on 2026-10-22; planar flight was cleared on 2026-10-23. Sources are in `ltmps/SCexample` at commit `153d087` under `SCexampleEnriched/`, except planar flight (below). Source files are unchanged.

- `mission-cycle.mp4` and `mission-cycle.jpg`: from `mission_cycle/animation/MissionCycle.gif` (1583 × 848, 15 s). Re-encoded with FFmpeg to H.264, yuv420p, 1280 px wide, CRF 26, faststart, no audio. The poster is the final frame.
- `coupled-domains.mp4` and `coupled-domains.jpg`: from `constraints/trajectory/animation/CoupledDomains.gif` (1417 × 848, 22 s). Same encoding; the poster is the final frame.
- `catalog-couplings.png`: `mission_cycle/animation/CatalogCouplings.png`, copied unchanged (2909 × 2520).

- `planar-flight.mp4` and `planar-flight.jpg`: compressed MP4 (H.264, 1500 × 848, 23.5 s, no audio) and poster of `SCexampleEnriched/planar_flight/animation/PlanarFlight.gif` and `PlanarFlightPoster.png` from Gavin's local SCexample-personal repository, which is not on GitHub. Both were taken unchanged from the "Portfolio Directions" design canvas assets. The video fully decodes with FFmpeg, and the poster shows the complete nominal and reduced-power run.

Attribution and scope: SCExample is an inherited educational Mars-helicopter example with continued development in 2026. The animations show simulated behavior under educational assumptions, with power steps and boundary-signal fault injection rather than component physics failures. They are not flight validation.
