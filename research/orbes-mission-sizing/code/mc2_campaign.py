"""Monte Carlo campaign 2: the MEASURED flight-pipeline camera cone.

Bench calibration measured the flight camera pipeline ~1.5x narrower in
half-angle than the lens model the design was first sized from. This
driver re-sizes every maneuver with the paper's rule at the measured cone
and reruns, with the measured fix latency. Each run logs its full
configuration, pointing and end-point error, BLIND and gated-streak
accounting, capture-time fix gaps and a failure class.

Fixed config: measured worst-side cone 28.8 x 21.4 deg half-FOV
(per-side asymmetry documented in sim_harness), corners-in-view gate
with the 0.149 m tag, LSM6DS + bench calibration, mass U[1.98, 2.7] kg
vs the fixed 2.7 kg controller, true tag-camera extrinsics perturbed
+-1 deg / +-5 mm (filter nominal), fix latency 0.075 s unless swept
(delivery quantizes up to the ~67 ms VIO attempt tick; fix gaps count
from CAPTURE time).

Sizing rules : h_min = 1.0 m, visibility margin
m_vis = 0.9, tracking budget e = 0.12 m. Any-yaw lemniscate
A = m_vis * h_min * tan(theta_narrow) - e. The orbit bound is probed
empirically by the radius sweep against the corners-gate trip.

Stages (arms that are compared share seeds: the mc, layout, latency and
cone-transfer arms use 1000+; sizing, sweep, design-cone sizing and the
camera ablation draw their own ranges):
  size_m4   (100+)  inward-yaw orbit r in {0.10..0.40}, 20 seeds/point
  size_m6   (100+)  any-yaw amplitude 7-point grid around the bound
  size_m3   (100+)  tag layout 3 vs 5 tags, out+back, 50 seeds
  mc        (1000+) sized params, 50 seeds/mode + single-tag and
                    unsized-lemniscate ablation arms at n = 50
  latency   (2000+) Modes 1/2/3-out/4 at 0 / 0.05 / 0.10 s, 20 seeds
  designcone(4000+) wide 44.3x33.6 cone at the SIZED orbit/amplitude
                    (rule-transfer check), 20 seeds
  sweep     (3000+) residual accel bias {0..0.03 x7, 0.05, 0.10, 0.20}
                    x {single, tags3, tags5}, 20 seeds/point
  traces    one exemplar Mode-3 and Mode-4 run -> mc2_traces.npz
  perf      OSQP solve + EKF step timing p95 -> mc2_perf.txt
  summarize tables -> mc2_summary.md

Outputs (new files; the Oct 18 wide-cone set stays intact):
  Research Paper/figures/mc2_results.csv / mc2_summary.md /
  mc2_traces.npz / mc2_perf.txt
"""
import argparse
import csv
import os
import time

import numpy as np

import mc_campaign as mc1
from mc_campaign import ep_hold, ep_m3, ep_m5, ep_track, wilson
from sim_harness import (HALF_FOV_X, HALF_FOV_Y, MEASURED_FIX_LATENCY,
                         MEASURED_HALF_FOV_X, MEASURED_HALF_FOV_Y)

PAPER_FIG = os.environ.get("ORBES_DATA_DIR", os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "data"))
CSV_PATH = os.path.join(PAPER_FIG, "mc2_results.csv")
FLOOR_CONTACT_Z = 0.097   # body-center height at physical floor contact


CSV_COLS = [
    "stage", "arm", "mode", "seed",
    # per-run config 
    "fov_long_bodyY_deg", "fov_narrow_bodyX_deg", "tag_m", "gate", "latency_s", "cruise_v_mps",
    "ramp_accel_mps2", "h_min_m", "margin_m", "tag_layout", "orbit_r_m",
    "fig8_A_m", "control_hz", "detector_hz", "dropout_rate",
    # randomization draws
    "mass_kg", "ext_rot_deg", "ext_off_mm", "bias_resid",
    # outcomes
    "key_metric", "key_value", "pass", "end_err_m", "yaw_err_p95_deg",
    "yaw_err_max_deg", "tilt_max_deg", "z_min", "max_fix_gap",
    "n_blind_entries", "blind_time_s", "longest_blind_s",
    "tilt_blind_mean_deg", "floor_contact",
    "n_gated", "longest_gated_streak", "ladder_fired",
    "failure_class", "extra", "sim_s", "wall_s",
]

TAGS_3 = ((0.0, 0.0, 0.0), (2.0, 0.0, 0.0), (-2.0, 0.0, 0.0))
# Five-tag layouts, both sized at n = 50 in the size stage:
# NAIVE (minimize the maximum gap, tags at +-1 m) measured BEST
# (out 0.88 / back 0.96 at the 0.2 m spec) and is the chosen layout.
# The ARRIVAL-COVERED variant (+-1.35 m, continuous endpoint coverage)
# was motivated by a real failure mode - the naive layout parks the
# final blind window on the arrival segment, the estimate runs ahead,
# the loop stops short of the endpoint footprint and the anchor pull
# drags the vehicle back to the mid tag - but that mode bites only
# ~12% of naive runs, while moving the mid tags out lengthens the
# FIRST gap and costs more overall (0.82 / 0.64). Kept for the record.
TAGS_5 = ((0.0, 0.0, 0.0), (1.0, 0.0, 0.0), (-1.0, 0.0, 0.0),
          (2.0, 0.0, 0.0), (-2.0, 0.0, 0.0))
TAGS_5_NAIVE = TAGS_5
TAGS_5_ARRIVAL = ((0.0, 0.0, 0.0), (1.35, 0.0, 0.0), (-1.35, 0.0, 0.0),
                  (2.0, 0.0, 0.0), (-2.0, 0.0, 0.0))
# the arrival layout above was built from the OLD 0.66 m footprint.
# At the measured effective half-width (0.317 m) continuous coverage of
# the 2 m leg takes tags every <= 0.634 m: the SEVEN-tag rule layout.
TAGS_7_CONT = tuple((x, 0.0, 0.0) for x in
                    (0.0, 0.63, -0.63, 1.27, -1.27, 2.0, -2.0))

H_MIN = 1.0
M_VIS = 0.9
E_TRACK = 0.12
# the margin in the paper's LINEAR corners-gate form
# A = w_eff - m, with w_eff = h*tan(theta_narrow) - s/2 = 0.317 m:
# m = w_eff - A = 0.317 - 0.233 = 0.084 m (equivalently the M_VIS/E
# form above). margin_m logs THIS m.
MARGIN_LINEAR = round(
    (H_MIN * float(np.tan(np.radians(21.4))) - 0.149 / 2.0)
    - (M_VIS * H_MIN * float(np.tan(np.radians(21.4))) - E_TRACK), 3)
M3_TAIL_SPEC = 0.2          # CONOPS endpoint spec [m]
M6_AMP_SIZED = round(M_VIS * H_MIN * float(np.tan(MEASURED_HALF_FOV_Y))
                     - E_TRACK, 3)
M6_AMP_UNSIZED = 0.476      # the old wide-cone sizing (ablation arm)
M4_GRID = (0.10, 0.15, 0.20, 0.25, 0.27, 0.28, 0.30, 0.35, 0.40)
M6_GRID = (0.11, 0.16, 0.21, M6_AMP_SIZED, 0.24, 0.25, 0.26, 0.31, 0.36)

TAG_HALF = 0.149 / 2.0
CORNER_TRIP_X = (float(np.tan(MEASURED_HALF_FOV_X)) - TAG_HALF) \
    / float(np.tan(MEASURED_HALF_FOV_X))
CORNER_TRIP_Y = (float(np.tan(MEASURED_HALF_FOV_Y)) - TAG_HALF) \
    / float(np.tan(MEASURED_HALF_FOV_Y))


def footprint_table():
    rows = []
    for name, deg in (("long (body Y), worst side", 28.8),
                      ("long (body Y), far side", 33.7),
                      ("narrow (body X), worst side", 21.4),
                      ("narrow (body X), far side", 27.6)):
        c = float(np.tan(np.radians(deg)))
        rows.append((name, deg, c, c - TAG_HALF))
    return rows


# ---------------------------------------------------------------------------
# episodes
# ---------------------------------------------------------------------------

def ep_m4_measured(sim, radius, cone="measured"):
    """Mode 4 inward orbit, metrics against the ACTIVE cone: key = worst
    tag-center offset as a fraction of that cone's half-FOV (near-plane
    z_C > 0.3 guard); extra carries the corners-gate margin fraction
    (1.0 = gate trips) and the inward-pointing error p95/max [deg]
    (CONOPS spec < 10). Pass: path deviation < 0.2 m, max fix gap
    < 0.5 s."""
    from scipy.spatial.transform import Rotation

    from frame_adapter import FloorOrbitPath
    from sim_harness import TAG_CAM_R_B_C, TAG_CAM_T_B_C, quat_to_matrix
    path = FloorOrbitPath(radius=radius, omega=0.3, alt=1.0,
                          point_inward=True)
    start = path(0.0)[0]
    sim.reset(pos=tuple(start))
    sim.ekf.init_from_truth(start, mc1.IDENTITY_Q, path(0.0)[1])
    mc1.calibrate_imu_bias(sim)
    log = sim.run(20.0, path=path)
    t = np.asarray(log.t)
    pos = np.asarray(log.pos)
    quat = np.asarray(log.quat)
    if cone == "measured":
        tx, ty = float(np.tan(MEASURED_HALF_FOV_X)), \
            float(np.tan(MEASURED_HALF_FOV_Y))
    else:
        tx, ty = float(np.tan(HALF_FOV_X)), float(np.tan(HALF_FOV_Y))
    trip_x = (tx - TAG_HALF) / tx
    trip_y = (ty - TAG_HALF) / ty
    worst_off, worst_corner = 0.0, 0.0
    point_err = []
    for i in range(len(pos) // 3, len(pos), 250):
        q = quat[i]
        R = quat_to_matrix(q)
        p_C = TAG_CAM_R_B_C.T @ (R.T @ (-pos[i]) - TAG_CAM_T_B_C)
        if p_C[2] > 0.3:
            fx = abs(p_C[0] / p_C[2]) / tx
            fy = abs(p_C[1] / p_C[2]) / ty
            worst_off = max(worst_off, float(max(fx, fy)))
            worst_corner = max(worst_corner, float(
                max(fx / trip_x, fy / trip_y)))
        yaw = Rotation.from_quat([q[1], q[2], q[3], q[0]]).as_euler(
            "xyz")[2]
        # the inward heading for FloorOrbitPath(point_inward) is
        # yaw = omega*t (the earlier +pi reference logged 178-180 deg on
        # every PASSING run - validated against conops_acceptance)
        inward = 0.3 * t[i]
        e = abs((yaw - inward + np.pi) % (2 * np.pi) - np.pi)
        point_err.append(np.degrees(e))
    p95 = float(np.percentile(point_err, 95))
    pmax = float(np.max(point_err))
    ref = np.array([path(x)[0] for x in t[::100]])
    dev = float(np.linalg.norm(pos[::100] - ref, axis=1)
                [len(t[::100]) // 3:].max())
    ok = dev < 0.2 and mc1.max_gap(log) < 0.5
    return (log, "tag_off_frac", worst_off, ok,
            f"dev={dev:.3f} p95point={p95:.2f} maxpoint={pmax:.2f} "
            f"cornfrac={worst_corner:.3f}")


# ---------------------------------------------------------------------------
# sim construction + enriched logging
# ---------------------------------------------------------------------------

def built_sim(seed, tags=None, latency=MEASURED_FIX_LATENCY,
              cone="measured"):
    sim, mass, rot, off = mc1.perturbed_sim(seed, tags=tags)
    if cone == "measured":
        sim.vio.cfg.half_fov_x = MEASURED_HALF_FOV_X
        sim.vio.cfg.half_fov_y = MEASURED_HALF_FOV_Y
    sim.vio.cfg.latency = float(latency)
    return sim, mass, rot, off


def _extra_field(extra, name):
    for part in extra.split():
        if part.startswith(name + "="):
            try:
                return float(part.split("=", 1)[1])
            except ValueError:
                return None
    return None


def _blind_stats(log):
    """BLIND accounting from the 10 Hz supervisor-mode log, plus the
    mean roll/pitch tilt DURING blind (blind reacquisition
    transients, not the paced leg, are where large tilts live)."""
    from scipy.spatial.transform import Rotation
    modes = np.asarray(log.ctrl_mode)
    blind = modes == "BLIND"
    if not blind.any():
        return 0, 0.0, 0.0, 0.0
    dt = 0.1
    entries = int(((~blind[:-1]) & blind[1:]).sum() + int(blind[0]))
    total = float(blind.sum() * dt)
    longest, run = 0, 0
    for b in blind:
        run = run + 1 if b else 0
        longest = max(longest, run)
    quat = np.asarray(log.quat)
    stride = max(1, len(quat) // max(len(modes), 1))
    q10 = quat[::stride][:len(modes)][blind[:len(quat[::stride])]]
    tilt_mean = 0.0
    if len(q10):
        rp = np.degrees(np.abs(Rotation.from_quat(
            q10[:, [1, 2, 3, 0]]).as_euler("xyz")[:, :2]))
        tilt_mean = float(rp.max(axis=1).mean())
    return entries, total, float(longest * dt), tilt_mean


_DONE = None


def _load_done():
    global _DONE
    _DONE = set()
    if os.path.exists(CSV_PATH):
        for r in csv.DictReader(open(CSV_PATH, encoding="utf-8")):
            _DONE.add((r["stage"], r["arm"], r["mode"], r["seed"],
                       r["latency_s"], r["bias_resid"]))
    print(f"resume: {len(_DONE)} completed rows will be skipped",
          flush=True)


def run2(stage, arm, mode, seed, fn, tags=None,
         latency=MEASURED_FIX_LATENCY, bias_resid="", cone="measured",
         orbit_r="", fig8_A=""):
    if _DONE is not None and (stage, arm, mode, str(seed), str(latency),
                              str(bias_resid)) in _DONE:
        return None, None
    t0 = time.time()
    sim, mass, rot, off = built_sim(seed, tags=tags, latency=latency,
                                    cone=cone)
    log, key, val, ok, extra = fn(sim)
    t = np.asarray(log.t)
    pos = np.asarray(log.pos)
    end_err = _extra_field(extra, "tail")
    p95 = _extra_field(extra, "p95point")
    pmax = _extra_field(extra, "maxpoint")
    tilt = mc1.rp_max(log)
    nb, bt, lb, tbm = _blind_stats(log)
    z_min = float(pos[:, 2].min())
    gap = mc1.max_gap(log)
    # CONOPS-spec grade for Mode 3 (tail 0.2 m, not the episode's 0.3)
    if mode.startswith("m3_") and end_err is not None:
        ok = z_min > 0.5 and end_err < M3_TAIL_SPEC
    # failure classes : attitude_divergence / floor_breach /
    # drift_past_tag / fix_gap / pointing / other
    if ok:
        fail = ""
    elif tilt >= 45.0:
        fail = "attitude_divergence"
    elif z_min <= 0.5:
        fail = "floor_breach"
    elif end_err is not None and end_err >= M3_TAIL_SPEC:
        fail = "drift_past_tag"
    elif gap >= 0.5:
        fail = "fix_gap"
    elif p95 is not None and p95 >= 10.0:
        fail = "pointing"
    else:
        fail = "other"
    layout = "single" if tags is None else         "tags[" + ",".join(f"{p[0]:g}" for p in tags) + "]"
    row = dict(stage=stage, arm=arm, mode=mode, seed=seed,
               fov_long_bodyY_deg=28.8 if cone == "measured"
               else 44.3,
               fov_narrow_bodyX_deg=21.4 if cone == "measured" else 33.6,
               tag_m=0.149, gate="corners",
               latency_s=latency, cruise_v_mps=0.2, ramp_accel_mps2=0.1,
               h_min_m=H_MIN, margin_m=MARGIN_LINEAR, tag_layout=layout,
               orbit_r_m=orbit_r, fig8_A_m=fig8_A, control_hz=10,
               detector_hz=15, dropout_rate=0,
               mass_kg=round(mass, 3), ext_rot_deg=round(rot, 3),
               ext_off_mm=round(off, 2), bias_resid=bias_resid,
               key_metric=key, key_value=round(val, 4),
               **{"pass": int(ok)},
               end_err_m="" if end_err is None else round(end_err, 4),
               yaw_err_p95_deg="" if p95 is None else round(p95, 2),
               yaw_err_max_deg="" if pmax is None else round(pmax, 2),
               tilt_max_deg=round(float(tilt), 2),
               z_min=round(z_min, 3), max_fix_gap=round(gap, 2),
               n_blind_entries=nb, blind_time_s=round(bt, 1),
               longest_blind_s=round(lb, 1),
               tilt_blind_mean_deg=round(tbm, 2),
               floor_contact=int(z_min <= FLOOR_CONTACT_Z),
               n_gated=getattr(sim.ekf, "n_gated_total", 0),
               longest_gated_streak=getattr(sim.ekf,
                                            "longest_gated_streak", 0),
               ladder_fired=getattr(sim.ekf, "n_ladder_fired", 0),
               failure_class=fail, extra=extra,
               sim_s=round(float(t[-1]), 1),
               wall_s=round(time.time() - t0, 1))
    new = not os.path.exists(CSV_PATH)
    os.makedirs(PAPER_FIG, exist_ok=True)
    with open(CSV_PATH, "a", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=CSV_COLS)
        if new:
            w.writeheader()
        w.writerow(row)
    print(f"{stage}/{arm}/{mode} seed {seed}: {key}={val:.4f} "
          f"pass={int(ok)} ({row['wall_s']}s)", flush=True)
    return row, log


# ---------------------------------------------------------------------------
# stages
# ---------------------------------------------------------------------------

def stage_size_m4(seeds):
    for r in M4_GRID:
        for seed in range(100, 100 + seeds):
            run2("size", f"m4_r{int(round(r * 100)):03d}", "m4_orbit",
                 seed, lambda s, _r=r: ep_m4_measured(s, _r), orbit_r=r)


M6_RATE_CAP = 0.45   # [rad/s] phase-rate cap: heading rate ~2*rate at
                     # the crossings must stay under the 1.0 rad/s blur
                     # gate with margin; uncapped rate = 0.2/A trips it
                     # for every A < 0.44 m (measured: A = 0.11 and 0.16
                     # pass 0/20 purely on fix loss)


def ep_m6_capped(sim, amp):
    """mc1.ep_m6 with the amplitude override AND the phase-rate cap -
    small lemniscates fly slower than the 0.2 m/s cruise cap instead of
    spinning the yaw through the blur gate."""
    from frame_adapter import Figure8Path
    path = Figure8Path(plane="xy", loops=1.0, yaw_mode="velocity")
    path.A = path.Bh = float(amp)
    path.rate = min(0.2 / path.A, M6_RATE_CAP)
    path.duration = 2.0 * np.pi / path.rate
    path.start = path(0.0)[0]
    sim.reset(pos=tuple(path.start))
    sim.ekf.init_from_truth(path.start, mc1.IDENTITY_Q, path(0.0)[1])
    mc1.calibrate_imu_bias(sim)
    dur = min(path.duration + 2.0, 20.0)
    log = sim.run(dur, path=path)
    t = np.asarray(log.t)
    vio = np.asarray(log.vio_t)
    ages = []
    last = 0.0
    k = 0
    for ts in t[::50]:
        while k < len(vio) and vio[k] <= ts:
            last = vio[k]
            k += 1
        ages.append(ts - last)
    loss = float(np.mean(np.asarray(ages) > 0.2))
    pos = np.asarray(log.pos)[::100]
    live = t[::100] < path.duration
    dev = float(np.linalg.norm(
        pos[live] - np.array([path(x)[0] for x in t[::100][live]]),
        axis=1).max()) if live.any() else 0.0
    ok = loss < 0.05 and dev < 0.35
    return log, "fix_loss_frac", loss, ok, f"dev={dev:.3f}"


def stage_size_m6(seeds):
    for amp in M6_GRID:
        for seed in range(100, 100 + seeds):
            run2("size", f"m6_a{int(round(amp * 1000)):03d}", "m6_fig8",
                 seed, lambda s, _a=amp: ep_m6_capped(s, _a),
                 fig8_A=amp)


def stage_size_m3(seeds):
    for tags, arm in ((TAGS_3, "m3_tags3"),
                      (TAGS_5_NAIVE, "m3_tags5naive"),
                      (TAGS_5_ARRIVAL, "m3_tags5arrival"),
                      (TAGS_7_CONT, "m3_tags7cont")):
        for seed in range(100, 100 + seeds):
            run2("size", f"{arm}_out", "m3_out", seed,
                 lambda s: ep_m3(s, "out", "field"), tags=tags)
            run2("size", f"{arm}_back", "m3_back", seed,
                 lambda s: ep_m3(s, "back", "field"), tags=tags)


def stage_mc(seeds, m4_radius, m6_amp, m3_tags):
    tags = TAGS_5 if m3_tags == "tags5" else TAGS_3
    eps = [
        ("sized", "m1_hold", lambda s: ep_hold(s), None, "", ""),
        ("sized", "m2_track", lambda s: ep_track(s), None, "", ""),
        ("sized", "m3_out", lambda s: ep_m3(s, "out", "field"), tags,
         "", ""),
        ("sized", "m3_back", lambda s: ep_m3(s, "back", "field"), tags,
         "", ""),
        ("sized", "m4_orbit",
         lambda s: ep_m4_measured(s, m4_radius), None, m4_radius, ""),
        ("sized", "m5_toss", lambda s: ep_m5(s), None, "", ""),
        ("sized", "m6_fig8",
         lambda s: ep_m6_capped(s, m6_amp), None, "", m6_amp),
        # ablation arms at full n, seeds paired with the sized arms
        ("m3_single", "m3_out",
         lambda s: ep_m3(s, "out", "single"), None, "", ""),
        ("m6_unsized", "m6_fig8",
         lambda s: ep_m6_capped(s, M6_AMP_UNSIZED), None, "",
         M6_AMP_UNSIZED),
        # A = 0.233 (the rule value) sits ON the cliff (0.76 at n = 50);
        # the one-step-safer 0.21 m is the operational choice
        ("sized_a210", "m6_fig8",
         lambda s: ep_m6_capped(s, 0.21), None, "", 0.21),
    ]
    for arm, mode, fn, tg, orb, amp in eps:
        for seed in range(1000, 1000 + seeds):
            run2("mc", arm, mode, seed, fn, tags=tg, orbit_r=orb,
                 fig8_A=amp)


def stage_latency(seeds, m4_radius, m3_tags):
    tags = TAGS_5 if m3_tags == "tags5" else TAGS_3
    for lat in (0.0, 0.05, 0.10):
        arm = f"lat{int(lat * 1000):03d}"
        for seed in range(1000, 1000 + seeds):
            run2("latency", arm, "m1_hold", seed, lambda s: ep_hold(s),
                 latency=lat)
            run2("latency", arm, "m2_track", seed, lambda s: ep_track(s),
                 latency=lat)
            run2("latency", arm, "m3_out", seed,
                 lambda s: ep_m3(s, "out", "field"), tags=tags,
                 latency=lat)
            run2("latency", arm, "m4_orbit", seed,
                 lambda s, _r=m4_radius: ep_m4_measured(s, _r),
                 latency=lat, orbit_r=m4_radius)


def stage_designcone(seeds, m4_radius, m6_amp):
    """Rule-transfer check: the measured-cone SIZED values flown at the
    DESIGN cone (44.3 x 33.6) - the rule predicts comfortable passes."""
    for seed in range(1000, 1000 + seeds):
        run2("designcone", "wide_m4", "m4_orbit", seed,
             lambda s: ep_m4_measured(s, m4_radius, cone="design"),
             cone="design", orbit_r=m4_radius)
        run2("designcone", "wide_m6", "m6_fig8", seed,
             lambda s: ep_m6_capped(s, m6_amp), cone="design",
             fig8_A=m6_amp)


def stage_sweep(seeds, m3_tags):
    arms = [("single_tag", None), ("tags3", TAGS_3)]
    if m3_tags == "tags5":
        arms.append(("tags5", TAGS_5))
    orig = mc1.calibrate_imu_bias
    try:
        # 0..0.03 ladder plus the residual-cabin-acceleration points
        # (0.05 / 0.10 / 0.20 m/s^2 = 5-20 mg)
        for resid in list(np.linspace(0.0, 0.03, 7)) + [0.05, 0.10, 0.20]:
            def cal(sim, accel_residual=float(resid), gyro_residual=0.003):
                return orig(sim, accel_residual=accel_residual,
                            gyro_residual=gyro_residual)
            mc1.calibrate_imu_bias = cal
            for arm, tags in arms:
                for seed in range(3000, 3000 + seeds):
                    run2("sweep", arm, "m3_out", seed,
                         lambda s, _t=tags: ep_m3(
                             s, "out", "single" if _t is None else "field"),
                         tags=tags, bias_resid=round(float(resid), 4))
    finally:
        mc1.calibrate_imu_bias = orig


def stage_mc_tags7(seeds):
    """seven-tag Mode 3 on the MC stage's own
    seeds (1000+), so Table III quotes one stage."""
    for seed in range(1000, 1000 + seeds):
        run2("mc", "sized_tags7", "m3_out", seed,
             lambda s: ep_m3(s, "out", "field"), tags=TAGS_7_CONT)
        run2("mc", "sized_tags7", "m3_back", seed,
             lambda s: ep_m3(s, "back", "field"), tags=TAGS_7_CONT)


def ep_m2_single_cam(sim):
    """Camera-architecture ablation: Mode 2 tracking through the LEGACY
    single forward lens (mission world: wall tag + the walking IR ring
    target through the same cone). Tracking yaws the fiducial out of
    frame - the documented beyond-sector localization trade the two-cam
    build removes."""
    log = sim.run(20.0, target=(0.0, 0.0, 0.5))
    t = np.asarray(log.t)
    vio = np.asarray(log.vio_t)
    gaps = np.diff(np.concatenate([[0.0], vio, [t[-1]]])) if len(vio)         else np.array([t[-1]])
    est = float(np.asarray(log.est_pos_err).max())
    tt = np.asarray(log.ir_t)
    e = np.abs(np.asarray(log.ir_az_err_deg))
    key = float(np.median(e[tt > 10.0])) if (tt > 10.0).any() else 180.0
    ok = key < 12.0 and est < 0.3
    return (log, "track_med_deg", key, ok,
            f"estmax={est:.3f} gapmax={float(gaps.max()):.2f}")


def stage_cam_ablation(seeds):
    """stage=ablation: single-forward-lens vs two-camera Mode 2, paired
    seeds 5000+. The single-cam arm runs the legacy mission world
    (HeadlessSim defaults + IrTracker); the two-cam arm is the as-built
    world at the measured cone."""
    from sim_harness import HeadlessSim, IrTargetConfig, SensorConfig
    for seed in range(5000, 5000 + seeds):
        # single forward lens (legacy architecture)
        t0 = time.time()
        sim = HeadlessSim(seed=seed, sensor_config=SensorConfig.lsm6ds(),
                          control_source="estimator",
                          ir_config=IrTargetConfig(rate=0.1))
        log, key, val, ok, extra = ep_m2_single_cam(sim)
        t = np.asarray(log.t)
        pos = np.asarray(log.pos)
        row = {c: "" for c in CSV_COLS}
        row.update(stage="ablation", arm="single_cam_m2", mode="m2_track",
                   seed=seed, fov_x_deg=44.3, fov_y_deg=33.6,
                   tag_m=0.149, gate="center", latency_s=0.0,
                   tag_layout="wall_single", control_hz=10, detector_hz=15,
                   dropout_rate=0, key_metric=key, key_value=round(val, 4),
                   **{"pass": int(ok)},
                   tilt_max_deg=round(float(mc1.rp_max(log)), 2),
                   z_min=round(float(pos[:, 2].min()), 3),
                   max_fix_gap=round(mc1.max_gap(log), 2),
                   failure_class="" if ok else "tag_loss", extra=extra,
                   sim_s=round(float(t[-1]), 1),
                   wall_s=round(time.time() - t0, 1))
        with open(CSV_PATH, "a", newline="", encoding="utf-8") as f:
            w = csv.DictWriter(f, fieldnames=CSV_COLS)
            w.writerow(row)
        print(f"ablation/single_cam_m2 seed {seed}: {key}={val:.2f} "
              f"pass={int(ok)}", flush=True)
        # two-camera arm, same seed, measured cone
        run2("ablation", "two_cam_m2", "m2_track", seed,
             lambda s: ep_track(s))


DC_GRID = (0.45, 0.51, 0.55, 0.60)   # design-cone rule bound ~0.506 m


def stage_designcone_size(seeds):
    """the sizing bound probed AT THE DESIGN CONE too
    (w_eff = tan(33.6 deg) - s/2 = 0.590 m; A = w_eff - m = 0.506 m),
    plus Mode 3 with the design-cone rule layout (three tags suffice at
    the wide footprint) and the seven-tag field."""
    for r in DC_GRID:
        for seed in range(4000, 4000 + seeds):
            run2("designcone", f"dc_m4_r{int(round(r * 100)):03d}",
                 "m4_orbit", seed,
                 lambda s, _r=r: ep_m4_measured(s, _r, cone="design"),
                 cone="design", orbit_r=r)
    for amp in DC_GRID:
        for seed in range(4000, 4000 + seeds):
            run2("designcone", f"dc_m6_a{int(round(amp * 1000)):03d}",
                 "m6_fig8", seed,
                 lambda s, _a=amp: ep_m6_capped(s, _a), cone="design",
                 fig8_A=amp)
    for tags, arm in ((TAGS_3, "dc_m3_tags3"), (TAGS_7_CONT, "dc_m3_tags7")):
        for seed in range(4000, 4000 + seeds):
            run2("designcone", f"{arm}_out", "m3_out", seed,
                 lambda s: ep_m3(s, "out", "field"), tags=tags,
                 cone="design")
            run2("designcone", f"{arm}_back", "m3_back", seed,
                 lambda s: ep_m3(s, "back", "field"), tags=tags,
                 cone="design")


def ep_m3_hold(sim, direction, extra_hold=8.0):
    """Mode 3 out-leg with the TERMINAL HOLD extended (
    does a longer covered hold at the end tag absorb the lateral error
    accumulated through the blind gap + reacquisition snap?)."""
    x0, x1 = (0.0, 2.0) if direction == "out" else (2.0, 0.0)
    path = mc1.OneLegPath(x0, x1)
    path.duration += float(extra_hold)
    sim.reset(pos=tuple(path.start))
    sim.ekf.init_from_truth(path.start, mc1.IDENTITY_Q, [0, 0, 0])
    mc1.calibrate_imu_bias(sim)
    log = sim.run(path.duration, path=path)
    t = np.asarray(log.t)
    pos = np.asarray(log.pos)
    z_min = float(pos[:, 2].min())
    tail = float(log.pos_error(tuple(path.end))[t > t[-1] - 2.0].max())
    ok = z_min > 0.5 and tail < M3_TAIL_SPEC
    return log, "min_floor_clear_m", z_min, ok, f"tail={tail:.3f}"


def stage_sweep_hold(seeds):
    """item B arm: five-tag field at 0.10 m/s^2 with +8 s end hold."""
    orig = mc1.calibrate_imu_bias

    def cal(sim, accel_residual=0.10, gyro_residual=0.003):
        return orig(sim, accel_residual=accel_residual,
                    gyro_residual=gyro_residual)
    mc1.calibrate_imu_bias = cal
    try:
        for seed in range(3000, 3000 + seeds):
            run2("sweep", "tags5_hold8", "m3_out", seed,
                 lambda s: ep_m3_hold(s, "out"), tags=TAGS_5,
                 bias_resid=0.10)
    finally:
        mc1.calibrate_imu_bias = orig


def stage_sweep7(seeds):
    """Residual-g sweep for the RULE layout (tags7cont), Limitations
    follow-up: points 0 / 0.05 / 0.10 / 0.20 m/s^2, same seeds/config
    as the main sweep stage."""
    orig = mc1.calibrate_imu_bias
    try:
        for resid in (0.0, 0.05, 0.10, 0.20):
            def cal(sim, accel_residual=float(resid), gyro_residual=0.003):
                return orig(sim, accel_residual=accel_residual,
                            gyro_residual=gyro_residual)
            mc1.calibrate_imu_bias = cal
            for seed in range(3000, 3000 + seeds):
                run2("sweep", "tags7", "m3_out", seed,
                     lambda s: ep_m3(s, "out", "field"), tags=TAGS_7_CONT,
                     bias_resid=round(float(resid), 4))
    finally:
        mc1.calibrate_imu_bias = orig


# Design-cone rule five-tag layout: w_eff(design) = tan(33.6) - s/2 =
# 0.590 m -> continuous coverage at 2*0.590 = 1.18 m spacing
TAGS_5_DESIGN = ((0.0, 0.0, 0.0), (1.18, 0.0, 0.0), (-1.18, 0.0, 0.0),
                 (2.0, 0.0, 0.0), (-2.0, 0.0, 0.0))


def stage_v5(seeds_small, seeds_mc):
    """locate the design-cone lemniscate crossing
    (A = 0.47, 0.49), fly the design-cone rule layout at the design
    cone, and pair the measured-cone tag block on the MC seeds."""
    for amp in (0.47, 0.49):
        for seed in range(4000, 4000 + seeds_small):
            run2("designcone", f"dc_m6_a{int(round(amp * 1000)):03d}",
                 "m6_fig8", seed,
                 lambda s, _a=amp: ep_m6_capped(s, _a), cone="design",
                 fig8_A=amp)
    for seed in range(4000, 4000 + seeds_small):
        run2("designcone", "dc_m3_tags5rule_out", "m3_out", seed,
             lambda s: ep_m3(s, "out", "field"), tags=TAGS_5_DESIGN,
             cone="design")
        run2("designcone", "dc_m3_tags5rule_back", "m3_back", seed,
             lambda s: ep_m3(s, "back", "field"), tags=TAGS_5_DESIGN,
             cone="design")
    for tags, arm in ((TAGS_3, "sized_tags3"),
                      (TAGS_5_DESIGN, "sized_tags5design")):
        for seed in range(1000, 1000 + seeds_mc):
            run2("mc", f"{arm}", "m3_out", seed,
                 lambda s: ep_m3(s, "out", "field"), tags=tags)
            run2("mc", f"{arm}", "m3_back", seed,
                 lambda s: ep_m3(s, "back", "field"), tags=tags)


def stage_traces(m4_radius, m3_tags):
    """One exemplar Mode-3 and Mode-4 run -> mc2_traces.npz ."""
    tags = TAGS_5 if m3_tags == "tags5" else TAGS_3
    out = {}
    for name, fn, tg, orb, amp in (
            ("m3", lambda s: ep_m3(s, "out", "field"), tags, "", ""),
            ("m3t7", lambda s: ep_m3(s, "out", "field"), TAGS_7_CONT,
             "", ""),
            ("m4", lambda s: ep_m4_measured(s, m4_radius), None,
             m4_radius, ""),
            ("m6", lambda s: ep_m6_capped(s, 0.21), None, "", 0.21)):
        _, log = run2("traces", f"trace_{name}", f"{name}_exemplar",
                      1000, fn, tags=tg, orbit_r=orb, fig8_A=amp)
        if log is None:        # resume skip: rerun unconditionally
            continue
        for f in ("t", "pos", "quat", "vel", "vio_t", "ctrl_mode",
                  "est_t", "est_pos_err"):
            out[f"{name}_{f}"] = np.asarray(getattr(log, f))
    rel = os.path.join(PAPER_FIG, "release")
    os.makedirs(rel, exist_ok=True)
    np.savez(os.path.join(rel, "mc2_traces.npz"), **out)
    print("wrote release/mc2_traces.npz")


def stage_perf():
    """95th-percentile OSQP allocator solve time and EKF step times."""
    from frame_adapter import two_cam_floor_sim
    sim = two_cam_floor_sim(seed=42)
    sim.reset(pos=(0, 0, 1.0))
    sim.ekf.init_from_truth([0, 0, 1.0], [1, 0, 0, 0], [0, 0, 0])
    state = sim.true_state13()
    ctl = getattr(sim.controller, "lqr", sim.controller)
    solves = []
    for _ in range(200):
        r = ctl.compute_control(state, target=(0, 0, 1.0))
        solves.append(r["solve_time"])
    ekf = sim.ekf
    imu = {"accel": np.zeros(3), "gyro": np.zeros(3), "timestamp": 0.01}
    pred, upd = [], []
    t = 0.01
    for _ in range(1000):
        t += 0.01
        imu["timestamp"] = t
        t0 = time.perf_counter()
        ekf.predict(imu)
        pred.append(time.perf_counter() - t0)
    meas = {"valid": True, "position": np.array([0.0, 0.0, 1.0]),
            "quaternion": np.array([1.0, 0.0, 0.0, 0.0]), "timestamp": t}
    for _ in range(200):
        t0 = time.perf_counter()
        ekf.update(meas)
        upd.append(time.perf_counter() - t0)
    txt = (f"OSQP allocator solve: p50 "
           f"{np.percentile(solves, 50) * 1e3:.2f} ms, p95 "
           f"{np.percentile(solves, 95) * 1e3:.2f} ms (n=200)\n"
           f"EKF predict step: p50 {np.percentile(pred, 50) * 1e6:.0f} us, "
           f"p95 {np.percentile(pred, 95) * 1e6:.0f} us (n=1000)\n"
           f"EKF pose update: p50 {np.percentile(upd, 50) * 1e6:.0f} us, "
           f"p95 {np.percentile(upd, 95) * 1e6:.0f} us (n=200)\n")
    open(os.path.join(PAPER_FIG, "mc2_perf.txt"), "w",
         encoding="utf-8").write(txt)
    print(txt)


# ---------------------------------------------------------------------------
# summary
# ---------------------------------------------------------------------------

def summarize():
    rows = list(csv.DictReader(open(CSV_PATH, encoding="utf-8")))
    for r in rows:
        r["key_value"] = float(r["key_value"])
        r["pass"] = int(r["pass"])
        r["z_min"] = float(r["z_min"])
        r["max_fix_gap"] = float(r["max_fix_gap"])
    perf_path = os.path.join(PAPER_FIG, "mc2_perf.txt")
    perf = open(perf_path, encoding="utf-8").read() \
        if os.path.exists(perf_path) else "(perf stage not run)"
    n_runs = len([r for r in rows if r["stage"] != "traces"])
    out = ["# Monte Carlo campaign 2: measured camera cone", "",
           f"Total runs: {n_runs} (+{len(rows) - n_runs} exemplar trace",
           f"rows); total wall "
           f"{sum(float(r['wall_s']) for r in rows) / 3600:.2f} h.", "",
           "Seed ranges: size 100+, sweep 3000+, designcone sizing",
           "4000+, camera ablation 5000+; mc, latency and the design-cone",
           "TRANSFER arms deliberately share seeds 1000+ for paired",
           "comparison. Arms within a stage share seeds. Trace rows are",
           "excluded from the run total below.", "",
           "Extrinsic perturbation is PER-AXIS: rotation +-1 deg about a",
           "random axis, translation uniform +-5 mm per axis (ext_off_mm",
           "logs the norm).", "",
           "Camera: measured worst-side cone 28.8 x 21.4 deg half-FOV",
           "(per-side asymmetry 28.8/33.7 and 21.4/27.6,",
           "bench calibration; the sim gate is symmetric worst-side).",
           "Corners gate, 0.149 m tag. Fix latency 0.075 s unless swept;",
           "delivery quantizes up to the 67 ms VIO tick; fix gaps count",
           "from CAPTURE time. dropout_rate = 0 in every run.", "",
           "z_min reference: BODY CENTER (= CG). Cube half-size 0.115 m,",
           "CG 19 mm above the geometric center -> floor contact at",
           "z ~ 0.096 m; the 0.5 m threshold leaves ~0.4 m true gap.", "",
           f"Mode 3 pass = CONOPS spec: end_err_m < {M3_TAIL_SPEC} AND",
           "z_min > 0.5. Mode 4: yaw_err_p95_deg vs the 10 deg spec;",
           "cornfrac = worst tag-center offset / corners-gate trip (trip",
           f"at {CORNER_TRIP_X:.3f} long / {CORNER_TRIP_Y:.3f} narrow of",
           "the center half-FOV).", "",
           "Sizing rules (B6/B16): h_min = 1.0 m, m_vis = 0.9, tracking",
           "budget e = 0.12 m. Any-yaw amplitude A = m_vis * h_min *",
           f"tan(21.4 deg) - e = {M6_AMP_SIZED} m. Orbit bound probed",
           f"empirically: grids r = {M4_GRID},", f"A = {M6_GRID}.", "",
           "## Footprint half-widths at 1 m", "",
           "| axis / side | half-FOV [deg] | center gate [m] | "
           "corners gate [m] |", "|---|---|---|---|"]
    for name, deg, c, k in footprint_table():
        out.append(f"| {name} | {deg} | {c:.3f} | {k:.3f} |")
    out += ["", "## Solver timing", "", "```", perf.rstrip(), "```"]

    def cell_stats(g):
        p, lo, hi = wilson(sum(r["pass"] for r in g), len(g))
        v = np.array([r["key_value"] for r in g])
        worst = v.min() if "clear" in g[0]["key_metric"] else v.max()
        passes = [r for r in g if r["pass"]]
        gap_pass = max((r["max_fix_gap"] for r in passes), default=0.0)
        fails = {}
        for r in g:
            if r["failure_class"]:
                fails[r["failure_class"]] = \
                    fails.get(r["failure_class"], 0) + 1
        fstr = ",".join(f"{k}:{n}" for k, n in sorted(fails.items())) \
            or "-"
        return (f"| {len(g)} | {p:.2f} [{lo:.2f}, {hi:.2f}] | "
                f"{v.mean():.3f} +- {v.std():.3f} | {worst:.3f} | "
                f"{np.percentile(v, 95):.3f} | "
                f"{min(r['z_min'] for r in g):.2f} | "
                f"{max(r['max_fix_gap'] for r in g):.2f} | "
                f"{gap_pass:.2f} | {fstr} |")

    def table(title, sel, keys):
        o = ["", f"## {title}", "",
             "| " + " | ".join(keys) + " | n | pass [Wilson 95%] | "
             "key mean +- std | worst | p95 | min z | max gap | "
             "max gap (passes) | failures |",
             "|" + "---|" * (len(keys) + 9)]
        for key in sorted({tuple(r[k] for k in keys) for r in sel}):
            g = [r for r in sel if tuple(r[k] for k in keys) == key]
            o.append("| " + " | ".join(key) + " " + cell_stats(g))
        return o

    out += table("Sizing sweeps",
                 [r for r in rows if r["stage"] == "size"], ["arm"])
    out += table("Monte Carlo at sized parameters",
                 [r for r in rows if r["stage"] == "mc"], ["arm", "mode"])
    out += table("Fix-latency ablation",
                 [r for r in rows if r["stage"] == "latency"],
                 ["arm", "mode"])
    out += table("Design-cone rule transfer",
                 [r for r in rows if r["stage"] == "designcone"], ["arm"])
    ab = [r for r in rows if r["stage"] == "ablation"]
    if ab:
        out += table("Camera-architecture ablation (Mode 2, paired "
                     "seeds 5000+)", ab, ["arm"])
    sw = [r for r in rows if r["stage"] == "sweep"]
    if sw:
        out += ["", "## Residual-acceleration sweep (Mode 3 out-leg)", "",
                "| residual [m/s^2] | arm | n | pass rate | "
                "min floor clearance mean +- std | worst |",
                "|---|---|---|---|---|---|"]
        for b in sorted({r["bias_resid"] for r in sw}, key=float):
            for arm in ("single_tag", "tags3", "tags5"):
                g = [r for r in sw
                     if r["bias_resid"] == b and r["arm"] == arm]
                if not g:
                    continue
                v = np.array([r["key_value"] for r in g])
                p, lo, hi = wilson(sum(r["pass"] for r in g), len(g))
                out.append(f"| {b} | {arm} | {len(g)} | "
                           f"{p:.2f} [{lo:.2f}, {hi:.2f}] | "
                           f"{v.mean():.2f} +- {v.std():.2f} | "
                           f"{v.min():.2f} |")
    open(os.path.join(PAPER_FIG, "mc2_summary.md"), "w",
         encoding="utf-8").write("\n".join(out) + "\n")
    print("wrote mc2_summary.md")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--stage", required=True,
                    choices=["size_m4", "size_m6", "size_m3", "size_all",
                             "mc", "latency", "designcone", "sweep",
                             "sweep7", "mc_tags7", "cam_ablation",
                             "designcone_size", "sweep_hold",
                             "v5", "traces", "perf", "summarize"])
    ap.add_argument("--seeds", type=int, default=None)
    ap.add_argument("--m4-radius", type=float, default=0.25)
    ap.add_argument("--m6-amp", type=float, default=M6_AMP_SIZED)
    ap.add_argument("--m3-tags", choices=["tags3", "tags5"],
                    default="tags5")
    ap.add_argument("--resume", action="store_true",
                    help="skip (stage, arm, mode, seed, latency, bias) "
                         "combos already in mc2_results.csv")
    a = ap.parse_args()
    if a.resume:
        _load_done()
    t0 = time.time()
    if a.stage == "size_m4":
        stage_size_m4(a.seeds or 20)
    elif a.stage == "size_m6":
        stage_size_m6(a.seeds or 20)
    elif a.stage == "size_m3":
        stage_size_m3(a.seeds or 50)
    elif a.stage == "size_all":
        stage_size_m4(a.seeds or 20)
        stage_size_m6(a.seeds or 20)
        stage_size_m3(50 if a.seeds is None else a.seeds)
    elif a.stage == "mc":
        stage_mc(a.seeds or 50, a.m4_radius, a.m6_amp, a.m3_tags)
    elif a.stage == "latency":
        stage_latency(a.seeds or 20, a.m4_radius, a.m3_tags)
    elif a.stage == "designcone":
        stage_designcone(a.seeds or 20, a.m4_radius, a.m6_amp)
    elif a.stage == "sweep":
        stage_sweep(a.seeds or 20, a.m3_tags)
    elif a.stage == "sweep7":
        stage_sweep7(a.seeds or 20)
    elif a.stage == "mc_tags7":
        stage_mc_tags7(a.seeds or 50)
    elif a.stage == "cam_ablation":
        stage_cam_ablation(a.seeds or 20)
    elif a.stage == "designcone_size":
        stage_designcone_size(a.seeds or 20)
    elif a.stage == "sweep_hold":
        stage_sweep_hold(a.seeds or 20)
    elif a.stage == "v5":
        stage_v5(20, a.seeds or 50)
    elif a.stage == "traces":
        stage_traces(a.m4_radius, a.m3_tags)
    elif a.stage == "perf":
        stage_perf()
    elif a.stage == "summarize":
        summarize()
    print(f"stage {a.stage} done in {(time.time() - t0) / 60:.1f} min",
          flush=True)


if __name__ == "__main__":
    import warnings
    warnings.filterwarnings("ignore")
    main()
