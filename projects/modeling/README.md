# Modeling & Simulation overview

This curated overview includes the cleared SCExample recorded playback and traceability diagram, plus two selected Simscape videos and their posters, and three views of the selected Earth–Mars–Encke reconstruction. Private source documents, raw model bundles, kernels, third-party source code, private source URLs and unapproved artifacts are excluded. The reconstruction sequence is original HTML text, not a recovered trajectory or a simulation result.

## Source basis

- **SCExample:** local historical repository files include `Ingenuity.slx`, `IngenuityReq.slreqx`, operational/functional models and `System Composers.txt`. Read-only Git history identifies Gavin-attributed 2023 work, including `58aac55` (allocation diagram), `93247e1` (stereotypes) and `b4fa4fc` (System Composer). The inherited educational example is distinguished from the 2026 additions described in `SCexampleEnriched/README-enrichment.md`; the latter uses synthetic events and educational assumptions. No flight-validation or full requirement-coverage claim is made.
- **Reaction-wheel study:** `ORBES-Simscape` contains the multibody model `orbes/orbes_phase1_sim.slx`, reaction-wheel CAD references, sizing scripts and PID analysis. Its October 2026 `REVIEW.md` records unit, inertia and controller-objective issues. The user's supplied project history establishes quaternion PID and log-analysis work. This page makes no numerical performance claim and does not transfer the fan-platform result to a simulation.
- **Mission configurations:** scoped local inventory confirms saved MALTO configurations including `Comet_000.mat`, `Comet_001.mat`, `Encke_000.mat` and `Psyche_000.mat`. These are configurations for an existing tool, not evidence of optimizer authorship.
- **Earth–Encke reconstruction:** supplied text review of `heliocentric_context.m`, `watch_four_trajectories.html` and the accompanying path CSV supports plot reconstruction, estimated timing, assumed Z and separate SPICE/Horizons reference tracks. No optimized or propagated spacecraft solution, mass meaning or date-based performance is asserted. The selected Encke recordings and posters were subsequently inspected locally and cleared for publication as described below.
- **SHERPA:** the read-only archive's `ARO 4200/NASA RASC-AL Proposal Paper.docx` names Gavin in the team and describes an Earth–Moon L1 servicing/refueling/relay concept, operations, architecture and planning estimates. Individual section ownership and numerical trajectory performance are not established by this review. The concept remains attributed to the team.
- **ROS2:** the supplied prior inspection summary establishes CSV/IMU replay and synthetic camera inputs. This pass does not assert a fresh full pipeline review or physical sensing validation. The overview links to the existing ORBES page for that project's hardware narrative.

All source inspection was read-only. No uploaded code or simulations were executed for this page. Selected media were subsequently cleared for publication; the media provenance below records the scope. Automated checks cover source markup, local routes and existing fallback guards.


## Cleared media selection

The user explicitly cleared SCExample operational playback and traceability-example.svg, plus Simscape case01 and case10 CAD videos and posters. Source originals are unchanged. No SHERPA or confidential CDR media are included. Encke publication was separately cleared for the three-view selection below.

- `playback/index.html` is a public adaptation of the SCExample enriched operational time-domain viewer. It embeds only the data used for playback, omits provenance/source inventories and machine paths, and removes raw trace/frame download links. Native architecture context, educational assumptions, signal-proxy fault scope and scenario outcomes remain. No external data dependencies are required. A static diagram and synopsis remain available without JavaScript; reduced-motion users can scrub manually.
- `assets/media/modeling/traceability-example.svg` preserves the source diagram unchanged. Native relationships and the proposed metric remain labeled. Attribution: inherited SCExample educational model with continued development in 2026; not sole authorship of the original teaching example.
- `case01_cad.mp4`, `case10_cad.mp4` and their `_preview.png` posters are byte-for-byte selections from `ORBES_simulations_2026-10-15.zip`, SHA256 `253a527cee3ca4493a2d5b130e1822948d5933ac6366296fd81d85a5c6411fbf`, under `ORBES/outputs/cad_tracking_15_cases_2026-10-15/videos/`. Credits: reaction-wheel simulation study using imported STEP geometry and saved simulation states. Underlying third-party CAD is not distributed separately. These are selected cases, not a claim that every stress case passed.
- Existing FFmpeg decoded both complete recordings without errors. Both are silent, 1600 x 902 at 20 fps; case01 is 23.05 seconds and case10 is 31.05 seconds. Contact sheets at one-second intervals across their full durations were visually inspected, along with the original posters. This is sampled visual review plus full decoding, not frame-by-frame playback inspection.

Browser verification used installed Chrome with isolated temporary profiles. The overview and playback viewer were checked at 390px, and the viewer at 1440px, with no page-level horizontal overflow. All five scenarios rendered, reduced-motion playback transferred focus to the time slider, keyboard Tab/Enter reached the skip destination, and both native videos loaded their expected metadata without autoplay. The static no-JavaScript synopsis and diagram were visually inspected. These checks do not establish screen-reader compatibility or full cross-browser behavior.

## Encke reconstruction recordings

The user cleared the selected Encke viewer, three recordings and three posters. The six media files were recovered from the user-supplied `Trajectory_portfolio_all_media_2026-10-21.zip`; all six match the SHA256 hashes of the separately cleared `Encke_portfolio_2026-10-21.zip` selection. Source originals and published media bytes are unchanged. The public viewer is a small portfolio adaptation, with heliocentric default, angled/original choices, native controls and direct recording links without JavaScript. View changes preserve the current time and remain paused, including for reduced-motion users.

Source mappings into `assets/media/modeling/encke/`:

- `original.mp4` / `original.png`: root `Encke_10s.mp4` / `Encke_animation_preview.png`.
- `angled.mp4` / `angled.png`: `presentation_v6/Encke_10s.mp4` / `presentation_v6/Encke_animation_preview.png`.
- `heliocentric.mp4` / `heliocentric.png`: `presentation_v6/Encke_heliocentric_10s.mp4` / `presentation_v6/Encke_heliocentric_animation_preview.png`.

Attribution and scope: Gavin's supplied ARO 3090 Earth–Mars–Encke visualization package, with Earth/Mars DE405 SPICE and separate Encke JPL Horizons reference tracks. Spacecraft coordinates are plot reconstructions, timing is estimated from path length and unknown spacecraft Z is shown as zero. Source mass/date labels remain embedded annotations; no mass-model interpretation or numerical trajectory-performance claim is added. Additional route studies, porkchop studies, native figures and source PDFs in the larger archive are excluded.

All three silent recordings fully decoded with installed FFmpeg: 10 seconds, 1500 × 900, 15 fps. Original posters and one-second samples throughout each video were visually inspected. This is complete decoding and sampled visual review. No uploaded code or model was executed.

Encke browser checks in installed Chrome: 390px and 1440px layouts without horizontal overflow; all three view selections, playback, pause and seek to five seconds; keyboard Tab/Enter selection; paused view changes with reduced motion; and a visually inspected no-JavaScript native player with direct links. This does not cover screen readers or other browser engines.
