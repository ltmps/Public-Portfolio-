"""Residual-acceleration sweep (Mode 3 out-leg) at the measured cone, three tag
layouts. (a) pass rate with Wilson 95 % interval; (b) minimum floor clearance,
median with interquartile band (tag field) or dashed quartiles. The 0.01-0.02 g
parabolic-flight residual band is shaded. Data: mc2_results.csv stage == 'sweep'.
Output: fig_resg.svg (text as paths) -> Inkscape EMF.
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
BLUE, GREEN, AMBER = "#2a78d6", "#1a9c6b", "#d08f00"
GREEN_T, BAND = "#d9f0e6", "#efeee8"
plt.rcParams.update({
    "font.family": ["Times New Roman", "DejaVu Serif", "serif"],
    "mathtext.fontset": "stix", "svg.fonttype": "path",
    "font.size": 8.5, "axes.labelsize": 8, "xtick.labelsize": 7.5, "ytick.labelsize": 7.5,
    "legend.fontsize": 7.5, "axes.edgecolor": MUTED, "axes.labelcolor": INK,
    "xtick.color": INK2, "ytick.color": INK2, "axes.spines.top": False,
    "axes.spines.right": False, "legend.frameon": False, "axes.linewidth": 0.8,
})
G = 9.80665


def wilson(k, n, z=1.96):
    p = k / n
    d = 1 + z * z / n
    c = (p + z * z / (2 * n)) / d
    h = z * math.sqrt(p * (1 - p) / n + z * z / (4 * n * n)) / d
    return p, max(0.0, c - h), min(1.0, c + h)


src = sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "data", "mc2_results.csv")
out = sys.argv[2] if len(sys.argv) > 2 else "fig_resg.svg"
rows = [r for r in csv.DictReader(open(src)) if r["stage"] == "sweep"]
g = collections.defaultdict(list)
for r in rows:
    g[(r["arm"], float(r["bias_resid"]) * 1000)].append(r)

fig, (a, b) = plt.subplots(2, 1, figsize=(3.5, 2.8), sharex=True, gridspec_kw={"hspace": 0.18})
for ax in (a, b):
    ax.axvspan(0.01 * G * 1000, 0.02 * G * 1000, color=BAND, lw=0, zorder=0)
    ax.set_xscale("symlog", linthresh=10, linscale=0.6)
    ax.grid(color=GRID, lw=0.5)
VIOLET = "#6b4fbb"
arms = (("single_tag", BLUE, "single tag"), ("tags3", AMBER, "three tags"), ("tags5", GREEN, "five tags, 1 m"), ("tags7", VIOLET, "seven tags, rule"))
for arm, col, label in arms:
    xs = sorted(x for (ar, x) in g if ar == arm)
    pr, lo, hi, med, q1, q3 = [], [], [], [], [], []
    for x in xs:
        v = g[(arm, x)]
        p, l, h = wilson(sum(int(r["pass"]) for r in v), len(v))
        pr.append(p); lo.append(l); hi.append(h)
        z = np.array([float(r["z_min"]) for r in v])
        med.append(np.median(z)); q1.append(np.percentile(z, 25)); q3.append(np.percentile(z, 75))
    pr, lo, hi = map(np.array, (pr, lo, hi))
    a.errorbar(xs, pr, yerr=[pr - lo, hi - pr], color=col, lw=1.5, marker="o", ms=3,
               capsize=1.8, elinewidth=0.7, label=label, zorder=3)
    if arm == "tags5":
        b.fill_between(xs, q1, q3, color=GREEN_T, lw=0, zorder=1)
    else:
        b.plot(xs, q1, color=col, lw=0.7, ls=(0, (3, 2)), zorder=2)
    b.plot(xs, med, color=col, lw=1.5, marker="o", ms=3, zorder=3)
a.set_ylabel("pass rate")
a.set_ylim(-0.05, 1.08)
h, l = a.get_legend_handles_labels()
b.legend(h, l, loc="lower left", bbox_to_anchor=(0.0, 0.0), handlelength=1.3)
a.set_title("(a)", loc="left", fontsize=8, pad=2)
a.text(0.015 * G * 1000, 1.02, "0.01-0.02 g", fontsize=6.5, color=INK2, ha="center", va="bottom")
b.axhline(0.5, color=MUTED, lw=0.8, ls=(0, (3, 2)), zorder=2)
b.text(60, 0.52, "floor margin", fontsize=6.5, color=INK2, va="bottom")
b.set_ylabel("min floor clearance [m]")
b.set_ylim(0, 1.05)
b.set_xlabel(r"residual acceleration [mm s$^{-2}$]")
b.set_xticks([0, 5, 10, 20, 50, 100, 200])
b.set_xticklabels(["0", "5", "10", "20", "50", "100", "200"])
b.set_xlim(-0.5, 230)
b.set_title("(b)", loc="left", fontsize=8, pad=2)
fig.savefig(out, bbox_inches="tight", pad_inches=0.06)
print("wrote", out)
