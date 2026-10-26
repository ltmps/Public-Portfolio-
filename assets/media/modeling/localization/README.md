# ORBES localization study media

These files back Study 07, Localization-aware mission design, on the Simulations page. Gavin approved the file list on 2026-10-25. They were copied byte for byte from the `portfolio-media` branch of ltmps/ORBES-sim (head 0fc670d), and each SHA-256 matches that branch's `release/portfolio/manifest.json`. All five were produced at ORBES-sim commit fd1579e. `scripts/check-modeling-media.cjs` pins every hash.

| File | Source script | Content |
|---|---|---|
| fig_mc2_sizing.png | src/mc2_figs.py | Pass rate versus inward-orbit radius and lemniscate amplitude on the design and measured cones, with the predicted bound dotted |
| fig_mc2_sweep.png | src/mc2_figs.py | Mode 3 pass rate versus residual acceleration for one, three, five and seven tags, with Wilson bands |
| fig_mc2_trace.png | src/mc2_figs.py | Mode 3 exemplar on the seven-tag field: estimated position error and fix age with BLIND shaded |
| orbes_modes.mp4 | src/mode_video.py | 78 s MuJoCo recording of the six flight modes with a fix-age overlay; H.264 High, 960 x 540, 15 fps, no audio, faststart |
| orbes_modes_poster.png | src/mode_video.py | Poster frame for the video |

Added 2026-10-26 from `portfolio-media` head 5a122d1 (Gavin-approved, producing commit c78430b). The manifest hashes match the MP4s exactly:

| File | Source script | Content |
|---|---|---|
| mc_mode3_design.mp4 | src/mc_anim.py | 9.9 s animation of 50 design-cone (44.3 x 33.6 deg) Mode 3 runs on the three-tag field, top and side views, colored by outcome: 44 pass, 6 fail |
| mc_mode3_design_3d.mp4 | src/mc_anim3d.py | The same 50 runs from an orbiting 3D camera |
| mc_mode3_design_poster.png, mc_mode3_design_3d_poster.png | ffmpeg final frame | Posters taken from the last frame of each MP4 here, so they show the complete outcome count. They are not part of the manifest. |

The GIF versions are not published because the MP4s carry the same frames at about 5% of the size.

The PNGs are published instead of the SVGs because the branch stores the SVGs with LF line endings, while the manifest hashes were taken over CRLF bytes. The PNGs match their manifest hashes exactly.

Run totals come from the manifest: 910 design-cone runs and 2,907 measured-cone runs, 3,817 in all. Conditions: 1 m altitude, 0.149 m tag, corners-in-view gate, 28.8 x 21.4 deg measured worst-side cone, 0.075 s fix latency, LSM6DS-class IMU with bench calibration, mass randomized from 1.98 to 2.7 kg against a fixed 2.7 kg controller model, and camera extrinsics perturbed by up to 1 deg and 5 mm per axis.

`mc2_results.csv`, `mc2_summary.md` and `mc2_traces.npz` are not published. All results are simulation, not hardware flights.
