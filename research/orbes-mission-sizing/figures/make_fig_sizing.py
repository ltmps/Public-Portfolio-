"""Sizing-curve figure: Monte Carlo pass rate versus inward-orbit radius and
lemniscate amplitude at the measured cone, with the closed-form bound and the
flown value marked. Data: mc2_results.csv, stage == 'size'.
Output: fig_sizing.svg (text as paths) -> Inkscape EMF.
"""
import csv
import collections
import math
import os
import sys

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np

INK, INK2, MUTED, GRID = "#0b0b0b", "#52514e", "#898781", "#d9d8d0"
BLUE, GREEN = "#2a78d6", "#1a9c6b"
plt.rcParams.update({
    "font.family": ["Times New Roman", "DejaVu Serif", "serif"],
    "mathtext.fontset": "stix", "svg.fonttype": "path",
    "font.size": 8.5, "axes.labelsize": 8, "xtick.labelsize": 7.5, "ytick.labelsize": 7.5,
    "axes.edgecolor": MUTED, "axes.labelcolor": INK, "xtick.color": INK2, "ytick.color": INK2,
    "axes.spines.top": False, "axes.spines.right": False, "axes.linewidth": 0.8,
})

H, HALF_X, TAG, M = 1.0, 21.4, 0.149, 0.084
BOUND = H * math.tan(math.radians(HALF_X)) - TAG / 2 - M    # 0.233 m
FLOWN = {"m4_orbit": 0.25, "m6_fig8": 0.21}


def wilson(k, n, z=1.96):
    p = k / n
    d = 1 + z * z / n
    c = (p + z * z / (2 * n)) / d
    h = z * math.sqrt(p * (1 - p) / n + z * z / (4 * n * n)) / d
    return p, max(0.0, c - h), min(1.0, c + h)


src = sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "data", "mc2_results.csv")
out = sys.argv[2] if len(sys.argv) > 2 else "fig_sizing.svg"
allrows = list(csv.DictReader(open(src)))
rows = [r for r in allrows if r["stage"] == "size" and r["mode"] in FLOWN]
drows = [r for r in allrows if r["stage"] == "designcone" and r["arm"].startswith(("dc_m4", "dc_m6"))]
BOUND_D = H * math.tan(math.radians(33.6)) - TAG / 2 - M    # 0.506 m
gd = collections.defaultdict(list)
for r in drows:
    x = float(r["orbit_r_m"] if r["mode"] == "m4_orbit" else r["fig8_A_m"])
    gd[(r["mode"], round(x, 3))].append(int(r["pass"]))
g = collections.defaultdict(list)
for r in rows:
    x = float(r["orbit_r_m"] if r["mode"] == "m4_orbit" else r["fig8_A_m"])
    g[(r["mode"], round(x, 3))].append(int(r["pass"]))

fig, axs = plt.subplots(1, 2, figsize=(3.5, 1.85), sharey=True, gridspec_kw={"wspace": 0.12})
for ax, mode, col, title, xl in ((axs[0], "m4_orbit", BLUE, "(a) inward orbit", r"radius $r$ [m]"),
                                  (axs[1], "m6_fig8", GREEN, "(b) figure-eight", r"amplitude $A$ [m]")):
    xs = sorted(x for (m, x) in g if m == mode)
    p, lo, hi = zip(*(wilson(sum(g[(mode, x)]), len(g[(mode, x)])) for x in xs))
    p, lo, hi = np.array(p), np.array(lo), np.array(hi)
    ax.axvline(BOUND, color=INK2, lw=0.9, ls=(0, (4, 2)), zorder=1)
    ax.axvline(BOUND_D, color=MUTED, lw=0.9, ls=(0, (1, 2)), zorder=1)
    xd = sorted(x for (m, x) in gd if m == mode)
    pd_ = np.array([sum(gd[(mode, x)]) / len(gd[(mode, x)]) for x in xd])
    ax.plot(xd, pd_, color=col, lw=1.0, ls=(0, (3, 2)), marker="o", ms=3.2, mfc="white", mec=col, zorder=2)
    ax.errorbar(xs, p, yerr=[p - lo, hi - p], color=col, lw=1.6, marker="o", ms=3.2,
                capsize=1.8, elinewidth=0.8, zorder=3)
    fx = FLOWN[mode]
    if (mode, fx) in g:
        fp = sum(g[(mode, fx)]) / len(g[(mode, fx)])
        ax.plot([fx], [fp], marker="*", ms=8, color=col, mec=INK, mew=0.5, zorder=4)
    ax.set_xlim(0.06, 0.64)
    ax.set_xticks([0.1, 0.2, 0.3, 0.4, 0.5, 0.6])
    ax.set_ylim(-0.05, 1.08)
    ax.grid(color=GRID, lw=0.5)
    ax.set_xlabel(xl)
    ax.set_title(title, loc="left", fontsize=8, pad=2)
axs[0].set_ylabel("pass rate")
axs[0].text(BOUND - 0.012, 0.45, "measured\nbound", fontsize=6.2, color=INK2, va="center", ha="right")
axs[0].text(BOUND_D - 0.012, 0.45, "lens\nbound", fontsize=6.2, color=MUTED, va="center", ha="right")


fig.savefig(out, bbox_inches="tight", pad_inches=0.06)
print("wrote", out, "bound=%.3f" % BOUND)
