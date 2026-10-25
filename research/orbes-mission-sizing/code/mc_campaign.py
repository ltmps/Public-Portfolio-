"""Monte Carlo + ablation + bias-sweep campaign (lens-model camera cone)
(Localization-Aware Mission Design for a Fan-Actuated Free-Flyer).

Produces, in the paper's figures folder:
  mc_results.csv   one row per run (stage, mode, seed, params, metrics, pass)
  mc_summary.md    per-mode MC table (Wilson 95%), ablation table, sweep table
  fig_sweep.svg    residual accel bias vs min floor clearance, 2 curves + band

Per-episode randomisation (LSM6DS grade throughout, bench-calibrated unless a
stage says otherwise): turn-on bias + walk via the seed, vehicle mass uniform
in [1.98, 2.7] kg (controller keeps its 2.7 kg model: deliberate mismatch),
true tag-camera extrinsics perturbed +-1 deg / +-5 mm while the filter keeps
the nominal model. Episodes are capped at a 20 s parabola window where the
profile allows; Mode 3 flies ONE 2 m leg per episode (out+hold and back as
separate episode types).

Usage:
  uv run python mc_campaign.py --stage smoke          # plumbing check
  uv run python mc_campaign.py --stage mc             # 50 seeds x 7 episodes
  uv run python mc_campaign.py --stage ablation       # 20 seeds per arm
  uv run python mc_campaign.py --stage sweep          # 7 bias points x 2 x 20
  uv run python mc_campaign.py --stage summarize      # tables + figure
"""
import argparse
import csv
import math
import os
import sys
import time

import numpy as np
from scipy.spatial.transform import Rotation

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from frame_adapter import (MODE3_TAG_FIELD, TAG_W, UPRIGHT_HOVER_W,
                           Figure8Path, FloorIrConfig, FloorOrbitPath,
                           TwoCamIrTracker, calibrate_imu_bias,
                           two_cam_floor_sim)
from sim_harness import (HALF_FOV_X, HALF_FOV_Y, TAG_CAM_R_B_C,
                         TAG_CAM_T_B_C, SensorConfig, quat_to_matrix)

PAPER_FIG = os.environ.get("ORBES_DATA_DIR", os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "data"))
CSV_PATH = os.path.join(PAPER_FIG, "mc_results.csv")
CSV_COLS = ["stage", "arm", "mode", "seed", "mass_kg", "ext_rot_deg",
            "ext_off_mm", "bias_resid", "key_metric", "key_value",
            "pass", "z_min", "max_fix_gap", "extra", "sim_s", "wall_s"]
IDENTITY_Q = (1.0, 0.0, 0.0, 0.0)


# ---------------------------------------------------------------------------
# randomisation helpers
# ---------------------------------------------------------------------------

def perturbed_sim(seed, tags=None, perturb=True):
    """Two-cam sim with LSM6DS sensors and the per-episode physical draws."""
    sim = two_cam_floor_sim(seed=seed, sensor_config=SensorConfig.lsm6ds(),
                            tags=tags)
    # corners-in-view gate: real detector needs all four corners in frame;
    # the campaign models the 0.149 m flight tag
    sim.vio.cfg.tag_size = 0.149
    rng = np.random.default_rng(seed + 90001)
    mass = 2.7
    rot_deg = 0.0
    off_mm = 0.0
    if perturb:
        import mujoco
        mass = float(rng.uniform(1.98, 2.7))
        bid = mujoco.mj_name2id(sim.model, mujoco.mjtObj.mjOBJ_BODY, "drone")
        scale = mass / float(sim.model.body_mass[bid])
        sim.model.body_mass[bid] = mass
        sim.model.body_inertia[bid] = sim.model.body_inertia[bid] * scale
        # true tag-camera extrinsics off-nominal; the FILTER keeps nominal
        rot_deg = float(rng.uniform(0.2, 1.0))
        axis = rng.normal(size=3)
        axis /= np.linalg.norm(axis)
        dR = Rotation.from_rotvec(np.radians(rot_deg) * axis).as_matrix()
        off = rng.uniform(-0.005, 0.005, 3)
        off_mm = float(np.linalg.norm(off) * 1000.0)
        sim.vio.cfg.cam_R_B_C = dR @ TAG_CAM_R_B_C
        sim.vio.cfg.cam_T_B_C = TAG_CAM_T_B_C + off
    return sim, mass, rot_deg, off_mm


def max_gap(log):
    t = np.asarray(log.t)
    vio = np.asarray(log.vio_t)
    return float(np.diff(np.concatenate([[0.0], vio, [t[-1]]])).max())


def rp_max(log, t_min=2.0):
    t = np.asarray(log.t)
    q = np.asarray(log.quat)
    rp = np.degrees(np.abs(
        Rotation.from_quat(q[:, [1, 2, 3, 0]]).as_euler("xyz")[:, :2]))
    return float(rp[t > t_min].max())


class OneLegPath:
    """One Mode-3 leg inside a 20 s parabola window: trapezoid x0 -> x1
    (0.1 m/s^2 to 0.2 m/s), then hold. blind_ok on the move only."""

    blind_ok = True

    def __init__(self, x0, x1, settle=4.0, alt=1.0):
        self.x0, self.x1, self.alt = float(x0), float(x1), float(alt)
        d = abs(x1 - x0)
        self.tr = 2.0
        self.tc = max(0.0, (d - 0.4) / 0.2)
        self.leg_T = 2 * self.tr + self.tc
        self.settle = float(settle)
        self.duration = self.settle + self.leg_T + 4.0
        self.start = np.array([x0, 0.0, alt])
        self.end = np.array([x1, 0.0, alt])

    def blind_ok_at(self, t):
        return self.settle < t < self.settle + self.leg_T

    def __call__(self, t):
        s = np.sign(self.x1 - self.x0)
        if t < self.settle:
            return np.array([self.x0, 0, self.alt]), np.zeros(3), 0.0
        tau = min(t - self.settle, self.leg_T)
        a, tr, tc, vp = 0.1, self.tr, self.tc, 0.2
        if tau < tr:
            dx, vx = 0.5 * a * tau * tau, a * tau
        elif tau < tr + tc:
            dx, vx = 0.5 * a * tr * tr + vp * (tau - tr), vp
        else:
            t3 = min(tau - tr - tc, tr)
            dx = 0.5 * a * tr * tr + vp * tc + vp * t3 - 0.5 * a * t3 * t3
            vx = vp - a * t3
        x = self.x0 + s * dx
        if t >= self.settle + self.leg_T:
            return np.array([self.x1, 0, self.alt]), np.zeros(3), 0.0
        return np.array([x, 0, self.alt]), np.array([s * vx, 0, 0]), 0.0


# ---------------------------------------------------------------------------
# episode definitions: each returns (key_metric, key_value, pass, z_min, extra)
# ---------------------------------------------------------------------------

def ep_hold(sim):
    sim.reset(pos=tuple(UPRIGHT_HOVER_W))
    sim.ekf.init_from_truth(UPRIGHT_HOVER_W, IDENTITY_Q, [0, 0, 0])
    calibrate_imu_bias(sim)
    log = sim.run(20.0, target=tuple(UPRIGHT_HOVER_W))
    t = np.asarray(log.t)
    err = float(log.pos_error(tuple(UPRIGHT_HOVER_W))[t > 2.0].max())
    ok = err < 0.2 and rp_max(log) < 5.0 and max_gap(log) < 0.5
    return log, "hold_err_m", err, ok, ""


def ep_track(sim):
    sim.ir = TwoCamIrTracker(sim.rng, FloorIrConfig(rate=0.1))
    sim.reset(pos=tuple(UPRIGHT_HOVER_W))
    sim.ekf.init_from_truth(UPRIGHT_HOVER_W, IDENTITY_Q, [0, 0, 0])
    calibrate_imu_bias(sim)
    log = sim.run(20.0, target=tuple(UPRIGHT_HOVER_W))
    tt = np.asarray(log.ir_t)
    e = np.abs(np.asarray(log.ir_az_err_deg))
    key = float(np.median(e[tt > 15.0]))
    t = np.asarray(log.t)
    hold = float(log.pos_error(tuple(UPRIGHT_HOVER_W))[t > 2.0].max())
    ok = key < 12.0 and hold < 0.2 and max_gap(log) < 0.5
    return log, "track_med_deg", key, ok, f"hold={hold:.3f}"


def ep_m3(sim, direction, tags_used):
    x0, x1 = (0.0, 2.0) if direction == "out" else (2.0, 0.0)
    path = OneLegPath(x0, x1)
    sim.reset(pos=tuple(path.start))
    sim.ekf.init_from_truth(path.start, IDENTITY_Q, [0, 0, 0])
    calibrate_imu_bias(sim)
    log = sim.run(path.duration, path=path)
    t = np.asarray(log.t)
    pos = np.asarray(log.pos)
    z_min = float(pos[:, 2].min())
    tail = float(log.pos_error(tuple(path.end))[t > t[-1] - 2.0].max())
    ok = z_min > 0.5 and tail < 0.3
    key = z_min
    return log, "min_floor_clear_m", key, ok, f"tail={tail:.3f}"


def ep_m4(sim, point_inward=True, radius=None):
    if radius is None:
        radius = 0.55 if point_inward else 0.45
    path = FloorOrbitPath(radius=radius, omega=0.3,
                          alt=1.0, point_inward=point_inward)
    start = path(0.0)[0]
    sim.reset(pos=tuple(start))
    sim.ekf.init_from_truth(start, IDENTITY_Q, path(0.0)[1])
    calibrate_imu_bias(sim)
    log = sim.run(20.0, path=path)
    t = np.asarray(log.t)
    pos = np.asarray(log.pos)
    quat = np.asarray(log.quat)
    # max tag image offset (fraction of the binding half-FOV)
    worst_off = 0.0
    for i in range(0, len(pos), 250):
        q = quat[i]
        R = quat_to_matrix(q)
        p_C = TAG_CAM_R_B_C.T @ (R.T @ (TAG_W - pos[i]) - TAG_CAM_T_B_C)
        if p_C[2] > 0.3:    # range guard: near the camera plane the
            # angular ratio explodes without carrying information
            f = max(abs(p_C[0] / p_C[2]) / np.tan(HALF_FOV_X),
                    abs(p_C[1] / p_C[2]) / np.tan(HALF_FOV_Y))
            worst_off = max(worst_off, float(f))
    ref = np.array([path(x)[0] for x in t[::100]])
    dev = float(np.linalg.norm(pos[::100] - ref, axis=1)
                [len(t[::100]) // 3:].max())
    ok = dev < 0.2 and max_gap(log) < 0.5
    key = worst_off
    return log, "tag_img_offset_frac", key, ok, f"dev={dev:.3f}"


def ep_m5(sim):
    v0 = np.array([0.35, 0.2, 0.0])
    start = np.array([-2.0, -1.0, 1.2])
    sim.ir = TwoCamIrTracker(sim.rng, FloorIrConfig(rate=0.0, az0=0.5),
                             maintain_drift=True)
    sim.reset(pos=tuple(start), vel=tuple(v0), angvel=(1.8, 1.5, 1.0))
    sim.ekf.init_from_truth(start, IDENTITY_Q, v0)
    calibrate_imu_bias(sim)
    log = sim.run(12.0, target=tuple(start))
    t = np.asarray(log.t)
    pos = np.asarray(log.pos)
    v_end = (pos[-1] - pos[-1500]) / (t[-1] - t[-1500])
    key = float(np.linalg.norm(v_end - v0))
    duty = float(np.asarray(log.ir_search, bool).mean())
    ok = key < 0.08 and duty < 0.3
    return log, "drift_dev_mps", key, ok, f"duty={duty:.2f}"


def ep_m6(sim, amp_override=None):
    path = Figure8Path(plane="xy", loops=1.0, yaw_mode="velocity")
    if amp_override is not None:
        path.A = path.Bh = float(amp_override)
        path.rate = 0.2 / path.A
        path.duration = 2.0 * np.pi / path.rate
        path.start = path(0.0)[0]
    sim.reset(pos=tuple(path.start))
    sim.ekf.init_from_truth(path.start, IDENTITY_Q, path(0.0)[1])
    calibrate_imu_bias(sim)
    dur = min(path.duration + 2.0, 20.0)
    log = sim.run(dur, path=path)
    t = np.asarray(log.t)
    vio = np.asarray(log.vio_t)
    # fix-loss fraction: time with fix age > 0.2 s
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
    ref = np.array([path(x)[0] for x in t[::100][live]])
    dev = float(np.linalg.norm(pos[live] - ref, axis=1).max()) if live.any() \
        else 0.0
    ok = loss < 0.05 and dev < 0.35
    return log, "fix_loss_frac", loss, ok, f"dev={dev:.3f}"


# ---------------------------------------------------------------------------
# campaign stages
# ---------------------------------------------------------------------------

def write_row(row):
    new = not os.path.exists(CSV_PATH)
    os.makedirs(PAPER_FIG, exist_ok=True)
    with open(CSV_PATH, "a", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=CSV_COLS)
        if new:
            w.writeheader()
        w.writerow(row)


def run_episode(stage, arm, mode, seed, fn, tags=None, perturb=True,
                bias_resid=""):
    t0 = time.time()
    sim, mass, rot, off = perturbed_sim(seed, tags=tags, perturb=perturb)
    log, key, val, ok, extra = fn(sim)
    t = np.asarray(log.t)
    pos = np.asarray(log.pos)
    row = dict(stage=stage, arm=arm, mode=mode, seed=seed,
               mass_kg=round(mass, 3), ext_rot_deg=round(rot, 3),
               ext_off_mm=round(off, 2), bias_resid=bias_resid,
               key_metric=key, key_value=round(val, 4),
               **{"pass": int(ok)},
               z_min=round(float(pos[:, 2].min()), 3),
               max_fix_gap=round(max_gap(log), 2), extra=extra,
               sim_s=round(float(t[-1]), 1), wall_s=round(time.time() - t0, 1))
    write_row(row)
    print(f"{stage}/{arm}/{mode} seed {seed}: {key}={val:.4f} "
          f"pass={int(ok)} ({row['wall_s']}s)", flush=True)
    return row


def stage_mc(seeds):
    eps = [
        ("m1_hold", lambda s: ep_hold(s), None),
        ("m2_track", lambda s: ep_track(s), None),
        ("m3_out", lambda s: ep_m3(s, "out", "field"), MODE3_TAG_FIELD),
        ("m3_back", lambda s: ep_m3(s, "back", "field"), MODE3_TAG_FIELD),
        ("m4_orbit", lambda s: ep_m4(s, True), None),
        ("m5_toss", lambda s: ep_m5(s), None),
        ("m6_fig8", lambda s: ep_m6(s), None),
    ]
    for mode, fn, tags in eps:
        for seed in range(100, 100 + seeds):
            run_episode("mc", "nominal", mode, seed, fn, tags=tags)


def stage_ablation(seeds):
    for seed in range(300, 300 + seeds):
        run_episode("ablation", "m3_single_tag", "m3_out", seed,
                    lambda s: ep_m3(s, "out", "single"), tags=None)
        run_episode("ablation", "m3_tag_field", "m3_out", seed,
                    lambda s: ep_m3(s, "out", "field"), tags=MODE3_TAG_FIELD)
        run_episode("ablation", "m4_fixed_yaw", "m4_orbit", seed,
                    lambda s: ep_m4(s, False))
        run_episode("ablation", "m4_inward_yaw", "m4_orbit", seed,
                    lambda s: ep_m4(s, True))
        run_episode("ablation", "m6_amp_wide", "m6_fig8", seed,
                    lambda s: ep_m6(s, amp_override=0.76))
        run_episode("ablation", "m6_amp_anyyaw", "m6_fig8", seed,
                    lambda s: ep_m6(s, amp_override=0.476))
    # chi-square escape ladder arms (switch by monkeypatching the escape)
    import ekf15 as _e

    def patched(mode_name):
        orig = _e.SimEKF15._update_core

        def core(self, z, _mode=mode_name, _orig=orig):
            self._ladder_mode = _mode
            return _orig(self, z)
        return core

    def with_ladder(mode_name, seed):
        # ladder variants: none = never inflate; att = original attitude/bias
        # first; posvel = shipped position/velocity-first ladder
        orig_core = _e.SimEKF15._update_core

        def core(self, z):
            d2_gate = _e.CHI2_GATE_6DOF
            h, H = self.calculate_h_and_H_jacobian(self.x)
            if h is None or H is None:
                return False
            y = z - h
            for idx in range(3, 6):
                y[idx, 0] = self._wrap_angle(y[idx, 0])
            S = H @ self.P @ H.T + self.R_pose
            try:
                S_inv = np.linalg.inv(S)
            except np.linalg.LinAlgError:
                return False
            d2 = float((y.T @ S_inv @ y).item())
            if d2 > d2_gate:
                self._gated_streak += 1
                if self._gated_streak >= 10:
                    if mode_name == "att_first":
                        self.P[6:15, 6:15] *= 10.0
                    elif mode_name == "posvel_first":
                        if not self._latch_escalated:
                            self.P[0:6, 0:6] *= 10.0
                            self._latch_escalated = True
                        else:
                            self.P[6:15, 6:15] *= 10.0
                            self._latch_escalated = False
                    self._gated_streak = 0
                return False
            self._gated_streak = 0
            self._latch_escalated = False
            K = self.P @ H.T @ S_inv
            self.x = self.x + K @ y
            self.x[6:9, 0] = np.vectorize(self._wrap_angle)(self.x[6:9, 0])
            IKH = np.eye(15) - K @ H
            self.P = IKH @ self.P @ IKH.T + K @ self.R_pose @ K.T
            self.P = 0.5 * (self.P + self.P.T)
            return True
        _e.SimEKF15._update_core = core
        try:
            return run_episode("ablation", f"ladder_{mode_name}", "m3_back",
                               seed, lambda s: ep_m3(s, "back", "single"),
                               tags=None)
        finally:
            _e.SimEKF15._update_core = orig_core

    for seed in range(300, 300 + seeds):
        for mode_name in ("none", "att_first", "posvel_first"):
            with_ladder(mode_name, seed)


def stage_sweep(seeds):
    import frame_adapter as fa
    orig = fa.calibrate_imu_bias
    for resid in np.linspace(0.0, 0.03, 7):
        def cal(sim, accel_residual=float(resid), gyro_residual=0.003):
            return orig(sim, accel_residual=accel_residual,
                        gyro_residual=gyro_residual)
        # episodes call calibrate_imu_bias from this module's import
        global calibrate_imu_bias
        calibrate_imu_bias = cal
        for seed in range(500, 500 + seeds):
            run_episode("sweep", "single_tag", "m3_out", seed,
                        lambda s: ep_m3(s, "out", "single"), tags=None,
                        bias_resid=round(float(resid), 4))
            run_episode("sweep", "tag_field", "m3_out", seed,
                        lambda s: ep_m3(s, "out", "field"),
                        tags=MODE3_TAG_FIELD,
                        bias_resid=round(float(resid), 4))
    calibrate_imu_bias = orig


# ---------------------------------------------------------------------------
# summary + figure
# ---------------------------------------------------------------------------

def wilson(k, n, z=1.96):
    if n == 0:
        return (0.0, 0.0, 0.0)
    p = k / n
    d = 1 + z * z / n
    c = (p + z * z / (2 * n)) / d
    h = z * math.sqrt(p * (1 - p) / n + z * z / (4 * n * n)) / d
    return p, max(0.0, c - h), min(1.0, c + h)


def summarize():
    rows = list(csv.DictReader(open(CSV_PATH, encoding="utf-8")))
    for r in rows:
        r["key_value"] = float(r["key_value"])
        r["pass"] = int(r["pass"])
        r["z_min"] = float(r["z_min"])
        r["max_fix_gap"] = float(r["max_fix_gap"])
    out = ["# Monte Carlo campaign summary", "",
           f"Total runs: {len(rows)}; total sim time "
           f"{sum(float(r['sim_s']) for r in rows):.0f} s; total wall "
           f"{sum(float(r['wall_s']) for r in rows)/3600:.2f} h.", "",
           "All runs use the corners-in-view gate (0.149 m tag: the usable",
           "footprint shrinks by half a tag per side, corners-in-view gate),",
           "LSM6DS bias + walk, bench calibration, mass randomized in",
           "[1.98, 2.7] kg against the fixed 2.7 kg controller model, and",
           "true tag-camera extrinsics perturbed +-1 deg / +-5 mm while the",
           "filter keeps the nominal model.", "",
           "Notes: (1) Mode 4 pointing-inward at r = 0.55 m is MARGINAL",
           "under the corners gate: the tag rides the narrow image axis,",
           "whose tag-center footprint at 1 m is 0.590 m, leaving 4 cm of",
           "margin; the fixed-yaw r = 0.45 m arm passes where inward fails.",
           "Inward pointing needs r <= ~0.50 m with the 0.149 m tag.",
           "(2) The chi-square ladder arms are statistically identical in",
           "the blind single-tag return scenario: no gated-fix stream ever",
           "occurs there, so the escape policy cannot act; the ladder",
           "differences documented in ekf15.py arise in edge-fix regimes",
           "this scenario does not produce.", ""]

    out += ["## Monte Carlo (LSM6DS + bench cal, randomized mass and "
            "extrinsics)", "",
            "| Mode | n | pass rate [Wilson 95%] | key metric | "
            "mean +- std | worst | min z | max fix gap |",
            "|---|---|---|---|---|---|---|---|"]
    mc = [r for r in rows if r["stage"] == "mc"]
    for mode, arm in sorted({(r["mode"], r["arm"]) for r in mc}):
        g = [r for r in mc if r["mode"] == mode and r["arm"] == arm]
        p, lo, hi = wilson(sum(r["pass"] for r in g), len(g))
        v = np.array([r["key_value"] for r in g])
        worst = v.max() if "clear" not in g[0]["key_metric"] else v.min()
        label = mode if arm == "nominal" else f"{mode} [{arm}]"
        zmn = min(r["z_min"] for r in g)
        gap = max(r["max_fix_gap"] for r in g)
        out.append(f"| {label} | {len(g)} | {p:.2f} [{lo:.2f}, {hi:.2f}] | "
                   f"{g[0]['key_metric']} | {v.mean():.3f} +- {v.std():.3f} "
                   f"| {worst:.3f} | {zmn:.2f} | {gap:.2f} s |")

    out += ["", "## Ablations (20 seeds per arm)", "",
            "| Arm | n | pass rate [95%] | key mean +- std | "
            "min floor clear | longest fix gap |", "|---|---|---|---|---|---|"]
    ab = [r for r in rows if r["stage"] == "ablation"]
    for arm in sorted({r["arm"] for r in ab}):
        g = [r for r in ab if r["arm"] == arm]
        p, lo, hi = wilson(sum(r["pass"] for r in g), len(g))
        v = np.array([r["key_value"] for r in g])
        out.append(f"| {arm} | {len(g)} | {p:.2f} [{lo:.2f}, {hi:.2f}] | "
                   f"{v.mean():.3f} +- {v.std():.3f} | "
                   f"{min(r['z_min'] for r in g):.2f} | "
                   f"{max(r['max_fix_gap'] for r in g):.2f} s |")

    out += ["", "## Bias sweep (Mode 3 out-leg, 20 seeds per point)", "",
            "| residual bias [m/s^2] | arm | pass rate | "
            "min floor clearance mean +- std |", "|---|---|---|---|"]
    sw = [r for r in rows if r["stage"] == "sweep"]
    pts = sorted({r["bias_resid"] for r in sw})
    for b in pts:
        for arm in ("single_tag", "tag_field"):
            g = [r for r in sw if r["bias_resid"] == b and r["arm"] == arm]
            if not g:
                continue
            v = np.array([r["key_value"] for r in g])
            p, lo, hi = wilson(sum(r["pass"] for r in g), len(g))
            out.append(f"| {b} | {arm} | {p:.2f} [{lo:.2f}, {hi:.2f}] | "
                       f"{v.mean():.2f} +- {v.std():.2f} |")

    open(os.path.join(PAPER_FIG, "mc_summary.md"), "w",
         encoding="utf-8").write("\n".join(out) + "\n")
    print("wrote mc_summary.md")
    make_fig(sw, pts)


def make_fig(sw, pts):
    import matplotlib
    matplotlib.use("Agg")
    import matplotlib.pyplot as plt
    plt.rcParams.update({
        "svg.fonttype": "path", "font.family": "serif",
        "font.size": 8, "axes.labelsize": 8, "legend.fontsize": 7,
        "xtick.labelsize": 7, "ytick.labelsize": 7})
    fig, ax = plt.subplots(figsize=(3.5, 2.4))
    for arm, color, label in (("single_tag", "#2a78d6", "single tag"),
                              ("tag_field", "#1a9c6b", "tag field")):
        xs, mu, lo, hi = [], [], [], []
        for b in pts:
            g = [r for r in sw if r["bias_resid"] == b and r["arm"] == arm]
            if not g:
                continue
            v = np.array([r["key_value"] for r in g])
            xs.append(float(b))
            mu.append(v.mean())
            s = 1.96 * v.std() / max(1.0, math.sqrt(len(v)))
            lo.append(v.mean() - s)
            hi.append(v.mean() + s)
        ax.plot(xs, mu, color=color, lw=1.4, label=label)
        ax.fill_between(xs, lo, hi, color=color, alpha=0.18, lw=0)
    ax.axhline(0.5, color="#888888", lw=0.8, ls="--")
    ax.text(0.0005, 0.53, "floor-strike margin", fontsize=6.5,
            color="#666666")
    ax.set_xlabel(r"residual accelerometer bias [m s$^{-2}$]")
    ax.set_ylabel("min floor clearance [m]")
    ax.set_ylim(0.0, 1.05)
    ax.legend(frameon=False, loc="lower left")
    fig.tight_layout()
    fig.savefig(os.path.join(PAPER_FIG, "fig_sweep.svg"))
    print("wrote fig_sweep.svg")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--stage", required=True,
                    choices=["smoke", "mc", "ablation", "sweep",
                             "summarize", "all", "m4redo", "m4radius"])
    ap.add_argument("--seeds", type=int, default=None)
    a = ap.parse_args()
    t0 = time.time()
    if a.stage == "smoke":
        stage_mc(a.seeds or 1)
        stage_ablation(a.seeds or 1)
        stage_sweep(1)
        summarize()
    elif a.stage == "mc":
        stage_mc(a.seeds or 50)
    elif a.stage == "ablation":
        stage_ablation(a.seeds or 20)
    elif a.stage == "sweep":
        stage_sweep(a.seeds or 20)
    elif a.stage == "m4redo":
        # strip every m4 row (the pre-guard image-offset metric was
        # unbounded near the camera plane), rerun m4 MC + ablation arms
        rows = list(csv.DictReader(open(CSV_PATH, encoding="utf-8")))
        keep = [r for r in rows if r["mode"] != "m4_orbit"]
        with open(CSV_PATH, "w", newline="", encoding="utf-8") as f:
            w = csv.DictWriter(f, fieldnames=CSV_COLS)
            w.writeheader()
            w.writerows(keep)
        for seed in range(100, 100 + (a.seeds or 50)):
            run_episode("mc", "nominal", "m4_orbit", seed,
                        lambda s: ep_m4(s, True))
        for seed in range(300, 300 + 20):
            run_episode("ablation", "m4_fixed_yaw", "m4_orbit", seed,
                        lambda s: ep_m4(s, False))
            run_episode("ablation", "m4_inward_yaw", "m4_orbit", seed,
                        lambda s: ep_m4(s, True))
        summarize()
    elif a.stage == "m4radius":
        # inward-yaw orbit pass rate across radius (paper follow-up):
        # r = 0.50 and r = 0.45 cells, same MC randomisation as m4_orbit
        for seed in range(100, 100 + (a.seeds or 50)):
            run_episode("mc", "r050", "m4_orbit", seed,
                        lambda s: ep_m4(s, True, radius=0.50))
            run_episode("mc", "r045", "m4_orbit", seed,
                        lambda s: ep_m4(s, True, radius=0.45))
        summarize()
    elif a.stage == "summarize":
        summarize()
    elif a.stage == "all":
        stage_mc(a.seeds or 50)
        stage_ablation(a.seeds or 20)
        stage_sweep(a.seeds or 20)
        summarize()
    print(f"stage {a.stage} done in {(time.time()-t0)/60:.1f} min")


if __name__ == "__main__":
    import warnings
    warnings.filterwarnings("ignore")
    main()
