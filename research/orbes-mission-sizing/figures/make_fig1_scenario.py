"""New Fig. 1: mission scenario with constraint geometry (IROS 2027 draft).
(a) Cabin side view along the translation axis: vehicle at altitude H, downward
camera cone at the measured narrow half-angle, effective (corners-in-view)
footprints of the tag field, a Mode 3 leg, blind gaps between footprints.
(b) Twenty-second window: fix availability along one 2 m leg, predicted from
the same geometry, for the single tag and the tag field.

All geometry comes from the constants below; update them from mc2_summary.md.
Output: fig1_scenario.svg (text as paths) -> Inkscape EMF.
"""
import os
import sys
import numpy as np
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.patches import Rectangle, Polygon, FancyArrowPatch

# ---- parameters (measured flight cone, worst side; tag; layout) -------------
HALF_X_DEG = 21.4          # narrow image axis along body X (translation axis), worst side
TAG_S = 0.149              # tag edge [m]
H = 1.0                    # working altitude [m]
FIELD = [-2.0, -1.27, -0.63, 0.0, 0.63, 1.27, 2.0]   # rule layout at the measured footprint [m]
LEG = (0.0, 2.0)           # one Mode 3 leg [m]
V_CRUISE = 0.2             # [m/s]
ACC = 0.1                  # ramp acceleration [m/s^2]
WINDOW = 20.0              # microgravity window [s]
T_SETTLE = 4.0             # hold before the leg [s]

INK, INK2, MUTED, GRID = "#0b0b0b", "#52514e", "#898781", "#d9d8d0"
BLUE, GREEN, AMBER, RED = "#2a78d6", "#1a9c6b", "#d08f00", "#d64545"
BLUE_T, GREEN_T, RED_T = "#dbe8f8", "#d9f0e6", "#f8dcdc"
plt.rcParams.update({
    "font.family": ["Times New Roman", "DejaVu Serif", "serif"],
    "mathtext.fontset": "stix", "svg.fonttype": "path",
    "font.size": 8, "axes.labelsize": 8, "xtick.labelsize": 7.5, "ytick.labelsize": 7.5,
    "axes.edgecolor": MUTED, "axes.labelcolor": INK, "xtick.color": INK2, "ytick.color": INK2,
    "axes.spines.top": False, "axes.spines.right": False, "axes.linewidth": 0.8,
})

w_geo = H * np.tan(np.radians(HALF_X_DEG))
w_eff = w_geo - TAG_S / 2


def leg_profile():
    """Trapezoidal 2 m leg after a settle hold, sampled at 50 Hz."""
    d = LEG[1] - LEG[0]
    t_acc = V_CRUISE / ACC
    d_acc = 0.5 * ACC * t_acc ** 2
    t_cruise = (d - 2 * d_acc) / V_CRUISE
    t_leg = 2 * t_acc + t_cruise
    t = np.linspace(0, WINDOW, 1001)
    x = np.empty_like(t)
    for i, ti in enumerate(t):
        s = ti - T_SETTLE
        if s <= 0:
            x[i] = 0
        elif s < t_acc:
            x[i] = 0.5 * ACC * s ** 2
        elif s < t_acc + t_cruise:
            x[i] = d_acc + V_CRUISE * (s - t_acc)
        elif s < t_leg:
            r = t_leg - s
            x[i] = d - 0.5 * ACC * r ** 2
        else:
            x[i] = d
    return t, LEG[0] + x, T_SETTLE + t_leg


def visible(x, tags):
    return np.any(np.abs(x[:, None] - np.asarray(tags)[None, :]) <= w_eff, axis=1)


fig = plt.figure(figsize=(3.5, 2.55))
gs = fig.add_gridspec(2, 1, height_ratios=[2.1, 1.0], hspace=0.55)
a = fig.add_subplot(gs[0])
b = fig.add_subplot(gs[1])

# ---- (a) side view -----------------------------------------------------------
a.set_xlim(-2.55, 2.55)
a.set_ylim(-0.12, 1.42)
a.set_aspect("equal")
a.axis("off")
a.text(-2.55, 1.42, "(a)", fontsize=8, va="top")
a.plot([-2.55, 2.55], [0, 0], color=INK, lw=1.0)
# effective footprints and blind gaps on the floor (leg span only shaded)
for tx in FIELD:
    a.add_patch(Rectangle((tx - w_eff, 0.0), 2 * w_eff, 0.09, fc=GREEN_T, ec=GREEN, lw=0.6, zorder=2))
    a.add_patch(Rectangle((tx - TAG_S / 2, 0.0), TAG_S, 0.03, fc=INK, ec="none", zorder=4))
gaps = []
for l, r in zip(FIELD[:-1], FIELD[1:]):
    g0, g1 = l + w_eff, r - w_eff
    if g1 > g0:
        gaps.append((g0, g1))
        a.add_patch(Rectangle((g0, 0.0), g1 - g0, 0.09, fc=RED_T, ec="none", zorder=2))
# vehicle at the leg midpoint of a gap, with its downward cone
xv = 0.5
a.add_patch(Polygon([[xv, H - 0.08], [xv - w_geo, 0], [xv + w_geo, 0]], closed=True,
                    fc=BLUE_T, ec=BLUE, lw=0.6, alpha=1.0, zorder=1))
a.add_patch(Rectangle((xv - 0.08, H - 0.08), 0.16, 0.16, fc="white", ec=INK, lw=0.9, zorder=3))

# the leg
a.add_patch(FancyArrowPatch((LEG[0], H + 0.22), (LEG[1], H + 0.22), arrowstyle="-|>",
                            mutation_scale=7, lw=1.0, color=INK2))
a.text(np.mean(LEG), H + 0.27, "one 2 m leg per parabola", fontsize=6.5, color=INK2, ha="center", va="bottom")
# annotations
a.annotate("", (xv + w_geo, 0.35), (xv, 0.35), arrowprops=dict(arrowstyle="<->", color=BLUE, lw=0.7))
a.text(xv + w_geo / 2, 0.39, r"$h\tan\theta_x$", fontsize=6.5, color=BLUE, ha="center", va="bottom")
a.text(xv + 0.12, H, r"$h$ = %.1f m" % H, fontsize=6.5, color=INK2, va="center")
a.text(-2.5, -0.1, "tag field, effective footprints", fontsize=6.5, color=GREEN, va="top")
if gaps:
    g = min(gaps, key=lambda gg: abs(np.mean(gg) - 1.5))
    a.text(np.mean(g), 0.11, "blind", fontsize=6.5, color=RED, ha="center", va="bottom")

# ---- (b) 20 s window: fix availability --------------------------------------
t, x, t_end = leg_profile()
rows = [("single tag", [0.0], BLUE), ("seven tags", FIELD, GREEN)]
TRACE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "data", "mc2_traces.npz")
for k, (lab, tags, col) in enumerate(rows):
    vis = visible(x, tags)
    if k == 1:
        try:
            d = np.load(TRACE)
            vt = d["m3t7_vio_t"]
            idx = np.searchsorted(vt, t, side="right") - 1
            age = np.where(idx >= 0, t - vt[np.clip(idx, 0, None)], 99.0)
            vis = age <= 0.2
        except Exception as e:
            print("trace not used:", e)
    y = 1 - k
    edges = np.flatnonzero(np.diff(np.r_[0, vis.astype(int), 0]))
    for s, e in zip(edges[::2], edges[1::2]):
        b.add_patch(Rectangle((t[s], y - 0.3), t[min(e, len(t) - 1)] - t[s], 0.6, fc=col, ec="none"))
    nv = ~vis
    edges = np.flatnonzero(np.diff(np.r_[0, nv.astype(int), 0]))
    longest = 0.0
    for s, e in zip(edges[::2], edges[1::2]):
        d = t[min(e, len(t) - 1)] - t[s]
        longest = max(longest, d)
        b.add_patch(Rectangle((t[s], y - 0.3), d, 0.6, fc=RED_T, ec="none"))
    b.text(WINDOW + 0.3, y, "longest gap %.1f s" % longest, fontsize=6.5, color=INK2, va="center")
b.axvline(T_SETTLE, color=MUTED, lw=0.6, ls=(0, (3, 2)))
b.axvline(t_end, color=MUTED, lw=0.6, ls=(0, (3, 2)))
b.set_xlim(0, WINDOW)
b.set_ylim(-0.6, 1.6)
b.set_yticks([1, 0])
b.set_yticklabels(["single tag\n(geometry)", "seven tags\n(simulated)"])
b.set_xlabel("time in the 20 s microgravity window [s]")
b.set_xticks([0, 5, 10, 15, 20])
b.spines["left"].set_visible(False)
b.tick_params(axis="y", length=0)
b.text(0, 1.62, "(b)  fix available", fontsize=8, va="bottom")

out = sys.argv[1] if len(sys.argv) > 1 else "fig1_scenario.svg"
fig.savefig(out, bbox_inches="tight", pad_inches=0.06)
print("wrote", out, "w_geo=%.3f w_eff=%.3f" % (w_geo, w_eff))
