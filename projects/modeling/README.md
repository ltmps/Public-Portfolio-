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

Attribution and scope: Gavin's supplied ARO 3090 Earth–Mars–Encke visualization package, with Earth/Mars DE405 SPICE and separate Encke JPL Horizons reference tracks. Spacecraft coordinates are plot reconstructions, timing is estimated from path length and unknown spacecraft Z is shown as zero. Source mass/date labels remain embedded annotations; no mass-model interpretation or numerical trajectory-performance claim is added. The subsequent route and launch-window selection is documented below; native figures and source PDFs remain excluded.

All three silent recordings fully decoded with installed FFmpeg: 10 seconds, 1500 × 900, 15 fps. Original posters and one-second samples throughout each video were visually inspected. This is complete decoding and sampled visual review. No uploaded code or model was executed.

Encke browser checks in installed Chrome: 390px and 1440px layouts without horizontal overflow; all three view selections, playback, pause and seek to five seconds; keyboard Tab/Enter selection; paused view changes with reduced motion; and a visually inspected no-JavaScript native player with direct links. This does not cover screen readers or other browser engines.

## Route and launch-window comparison

The user separately cleared the latest three additional route replays and six porkchop case recordings/posters from `Trajectory_portfolio_all_media_2026-10-21.zip`. The public `trajectories/index.html` adapts the ideas in `watch_four_trajectories.html` and `porkchop/index.html` into two distinct players with local dependencies. All selected media bytes are unchanged; `assets/media/modeling/trajectories/manifest.json` records source-relative names, sizes and SHA256 hashes.

- `presentation_v6/Final_Low_thrust`, `Low_Thurst` and `Fly_by` heliocentric/angled recordings map to `direct-a`, `direct-b` and `mars-assisted`. The fourth route reuses existing Encke assets. These are plot-derived path reconstructions with estimated timing and assumed zero spacecraft Z. Mass labels are source annotations with no wet/dry/payload interpretation. Reference tracks: Earth/Mars DE405 SPICE and Encke JPL Horizons.
- `porkchop/media_contours/case_{1,2,3}_{2,3}d` recordings and previews map to `window-{1,2,3}-{2,3}d`. The supplied study uses solar two-body, prograde, zero-revolution Lambert transfers and Horizons states. The three cases emphasize departure energy, speed sum and flight time. The study's numerical annotations are retained, not independently recomputed. Individual calculation authorship is not established; the page attributes the supplied study without assigning sole ownership.
- The new selection is 24 files / 19,440,446 bytes. GIFs, PDFs, the rotating contour map, earlier versions, native figures, models and QA/reference stills are excluded. No external data fetches or original script execution are required. Original archive and source projects are unchanged.
- All twelve selected silent MP4s fully decode: 10 seconds at 15 fps; route videos are 1500 × 900 and Lambert videos 1600 × 900. All posters and one-second samples spanning every recording were visually inspected. No models or optimizations were rerun.

Browser validation in installed Chrome covered 390px and 1440px without horizontal overflow; all 14 route/case/view combinations played, paused and sought to five seconds. Ten rapid view/study switches left the final selection paused under reduced motion. Native keyboard selectors and return navigation worked; no-JavaScript player and recording disclosure were visually inspected. Cross-browser and screen-reader testing remain outside this check.

## Playback implementation and qualification notes

The public player summarizes model assumptions affirmatively. Original detailed qualifications remain here for maintenance:

- Timing, capacity and landing delays are explicit educational assumptions.
- Physical failure modes are proxied by boundary-signal injection; there is no component physics failure model.
- Airborne landing authority is assumed for sensor, link and degraded-bus cases; touchdown is scripted after the landing delay.
- A return to preflight readiness does not complete the interrupted mission. Automatic reflight is inhibited.
- Function activity lanes are inferred from operation allocations plus continuous monitoring; they are not CPU utilization or a contention-aware task schedule.
- Startup configuration confirmation remains pending before commissioning and in latched-safe mode; it is asserted after the commissioning delay and maintained in active modes.
- Powered rotor speed is prescribed; unpowered shafts follow an assumed viscous coast law. This model is not coupled to the electrical/thermal energy budget or validated hardware. Latched safe mode does not by itself assert both rotors stopped.
- Readiness diagnostics describe entry-mode gates; accepted-plan and invalid-time logging uses zero sentinels paired with validity flags. Histories survive reset. These are integrated software boundary records, not independent sensor hardware simulations.
- Explicit educational 64-byte metadata frames use stop-and-wait acknowledgment without automatic retry. Unused interval capacity is discarded. Native Frame output is uint8[64]; frame-complete metadata distinguishes zero placeholders. RF coding, propagation, camera imagery and radio electrical power are not modeled.
- Spin-up is grounded until ascent authorization. spinup_complete means the illustrative qualification delay elapsed, separately from ready feedback. Signed dimensionless motor commands are bounded; powered shaft speed is prescribed and electrical load is not command-dependent.
- Potential operational hazards are traced qualitatively; their flight-dynamic consequences are not simulated.
- PASS refers to selected response/resource procedures; full requirement verification and operational validation are not asserted.

The R2024a createActivity command returns no model object, and the newer activity node-programming API was unavailable. Playback executes SCexample_OperationalExecution linked Simulink behavior. Recorded time series and check results are unchanged by the copy pass.

## Trajectory presentation wording

Public headings use neutral trajectory-study and playback labels. The recordings remain the same plot-derived paths with estimated timing and zero assumed spacecraft Z; the method, reference-track origins and source mass-label qualifications above still apply. No trajectory was recomputed or newly validated for this presentation change. The separate Lambert study retains its solar two-body model description. Media pixels, captions embedded in videos and all recorded data are unchanged.


## SHERPA presentation media

User-uploaded original media from main commit `667eef8` remains at its original repository paths. The overview uses six inspected PNGs and `VID_20251220_200405.mp4`; source bytes are unchanged. Artwork and presentation belong to the Cal Poly Pomona SHERPA team. Embedded capabilities, timelines and costs describe a mission concept.

- `6cef784d-f6e6-4ffb-ae6e-0b2495440058.png`: deployed spacecraft CAD.
- `539bf43b-6241-4011-b080-32d3fa018781.png`: launch-fairing packaging CAD.
- `ed53db83-58f1-477b-8959-66ef3227676c.png`: servicing deck CAD.
- `a5a1ff89-22f1-48f2-b422-f697dd5d80f5.png`: concept trajectory plot.
- `c92aeacc-b140-4346-8b61-f70ab5af3ed5.png`: concept summary slide.
- `79a8cc65-9590-4903-b6f3-e5a069ac212b.png`: team photograph; no individual identities inferred.

The B1LV poster (`2909f74a-9fd8-402b-bf50-c75e32117b7e.png`) and SHERPA layout containing placeholder body text (`7cfad0f4-6cb3-422d-a268-af98e451e197.png`) remain unchanged as uploaded and are omitted from this gallery.

The 117.77-second video fully decoded with FFmpeg; representative frames throughout its duration and the six images were visually inspected. Audio has not been independently reviewed or transcribed; synchronized captions remain outstanding. Native controls, an accompanying visual summary and a direct video link are provided. No autoplay or gallery script is used.


## Inline recording reels

The overview and trajectory page share `modeling-reels.js`. Previous/next controls cycle existing cases; the view control switches only between supplied recordings. The short flip is a UI transition, not a generated camera view. Case/view changes stay paused; offscreen players and background tabs pause. Starting one video pauses the others. Reduced-motion switches are instantaneous. Without JavaScript, original figures, native controls, posters and direct recording links remain available.

This interface pass uses only previously published media and public copy. It adds no report-derived claims or new upload embeds. Route and Lambert sections are intentionally kept in sync across the two entry points.


## CAPCOM mission context

Source: *Close Approach Primary Cometary Outburst Mapper (CAPCOM)*, team project report, August 12, 2021. Public summary authorized by the user; original PDF and report figures are not included. Page references below are physical PDF pages (matching printed labels for these cited pages):

- Page 1: full mission name; authors Hayley Davies, Cheyenne Marcelin Stone, Alejandro Rodriguez and Kwan Hang Gavin Yam.
- Pages 2–4: section attribution and mission purpose. Mission Overview and Introduction credit Kwan Hang Gavin Yam; the concept targets close-range observation of 2P/Encke and cometary outbursts.
- Pages 7–9: Transfer Analysis credits Cheyenne Marcelin Stone and Hayley Davies; compares direct low-thrust and Mars-assisted approaches, including flight time and propellant tradeoffs.
- Page 10: Launch Vehicle Selection credits Kwan Hang Gavin Yam and Alejandro Rodriguez; discusses escape capability and propellant requirements.

Context was verified against Library page text. Local PDF materialization failed, and returned page-image references were not viewable pixels in this executor. No figure interpretation or quantitative result was added. Existing trajectory recordings and the separate Lambert comparison remain unchanged; their provenance and assumptions above still apply. The report context does not independently validate those recordings or the later Lambert outputs.
