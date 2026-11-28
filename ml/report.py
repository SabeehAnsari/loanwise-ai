"""Figures and an auto-generated REPORT.md from results.json. No numbers are typed by hand."""
import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt  # noqa: E402
import numpy as np  # noqa: E402

from . import config  # noqa: E402

INK, MUTED, PASS, FAIL, LINE = "#0E1116", "#5B6472", "#177A4C", "#C23B26", "#D5DAE1"
plt.rcParams.update({
    "font.family": "DejaVu Sans", "font.size": 10, "axes.edgecolor": LINE, "axes.labelcolor": MUTED,
    "xtick.color": MUTED, "ytick.color": MUTED, "axes.spines.top": False, "axes.spines.right": False,
    "figure.dpi": 150, "savefig.bbox": "tight",
})


def pct(x, d=1):
    return f"{x * 100:.{d}f}%"


def ci(t, d=3, scale=1.0):
    point, lo, hi = t
    return f"{point * scale:+.{d}f} [{lo * scale:+.{d}f}, {hi * scale:+.{d}f}]"


def fig_leakage(r, out):
    fig, ax = plt.subplots(figsize=(6.4, 2.4))
    names = ["Honest features", "+ post-decision columns"]
    vals = [r["leakage"]["honest_auc"], r["leakage"]["leaky_auc"]]
    ax.barh(names, vals, color=[INK, FAIL], height=0.5)
    for i, v in enumerate(vals):
        ax.text(v + 0.005, i, f"{v:.3f}", va="center", color=INK)
    ax.set_xlim(0.5, 1.05)
    ax.set_xlabel("ROC-AUC on the 2023 holdout")
    ax.set_title("Leaked columns make a model look near-perfect", loc="left", color=INK)
    fig.savefig(out / "leakage.png")
    plt.close(fig)


def fig_comparison(r, out):
    rows = [c for c in r["comparison"] if "roc_auc_ci" in c]
    fig, ax = plt.subplots(figsize=(6.4, 2.8))
    for i, c in enumerate(rows):
        lo, hi = c["roc_auc_ci"]
        ax.plot([lo, hi], [i, i], color=MUTED, lw=2)
        ax.plot(c["roc_auc"], i, "o", color=INK if "XGBoost (mono" in c["name"] else MUTED, ms=7)
        ax.text(hi + 0.004, i, f"{c['roc_auc']:.3f}", va="center", color=INK)
    ax.set_yticks(range(len(rows)), [c["name"] for c in rows])
    ax.set_xlabel("ROC-AUC on 2023 (95% bootstrap CI)")
    ax.set_title("Trained on 2022, tested on 2023", loc="left", color=INK)
    fig.savefig(out / "comparison.png")
    plt.close(fig)


def fig_calibration(r, out):
    b = r["calibration"]
    fig, ax = plt.subplots(figsize=(3.6, 3.4))
    ax.plot([0, 1], [0, 1], color=LINE, lw=1)
    ax.plot([x["predicted"] for x in b], [x["observed"] for x in b], "o-", color=INK)
    ax.set_xlabel("Predicted approval probability")
    ax.set_ylabel("Observed approval rate")
    ax.set_title(f"Calibration (ECE {r['variants']['base']['ece']:.3f})", loc="left", color=INK)
    fig.savefig(out / "calibration.png")
    plt.close(fig)


def fig_automation(r, out):
    c = r["automation"]["curve"]
    fig, ax = plt.subplots(figsize=(5.2, 3.2))
    ax.plot([x["auto_approved_share"] for x in c], [x["wrong_auto_approval"] for x in c], color=INK)
    for key, lab in (("at_2pct", "2%"), ("at_5pct", "5%")):
        a = r["automation"][key]
        ax.plot(a["auto_approved_share"], a["wrong_auto_approval"], "o", color=PASS)
        ax.annotate(f"t={a['threshold']:.3f}: {pct(a['auto_approved_share'], 0)} automated",
                    (a["auto_approved_share"], a["wrong_auto_approval"]), xytext=(6, -12),
                    textcoords="offset points", color=INK, fontsize=9)
    ax.set_xlabel("Share of applications auto-approved")
    ax.set_ylabel("Auto-approved but lender denied")
    ax.set_title("Automate approvals, refer the rest to a person", loc="left", color=INK)
    fig.savefig(out / "automation.png")
    plt.close(fig)


def fig_fairness(r, out):
    rows = []
    for attr, f in r["fairness"].items():
        for g in f["gaps"]:
            rows.append((f"{g['group']} vs {f['reference']}", g["lender_gap"], g["base__mean_p_gap"]))
    fig, ax = plt.subplots(figsize=(6.6, 0.42 * len(rows) + 0.9))
    for i, (lab, lender, model) in enumerate(rows):
        for (pt, lo, hi), off, col in ((lender, -0.15, MUTED), (model, 0.15, INK)):
            ax.plot([lo * 100, hi * 100], [i + off] * 2, color=col, lw=2)
            ax.plot(pt * 100, i + off, "o", color=col, ms=5)
    ax.axvline(0, color=LINE, lw=1)
    ax.set_yticks(range(len(rows)), [r_[0] for r_ in rows])
    ax.invert_yaxis()
    ax.set_xlabel("Approval-rate gap vs reference group (percentage points, 95% CI)")
    ax.plot([], [], "o-", color=MUTED, label="Lenders (actual decisions)")
    ax.plot([], [], "o-", color=INK, label="Model (mean predicted approval)")
    ax.legend(frameon=False, loc="lower left", fontsize=8)
    ax.set_title("How much of each gap do applicant financials explain?", loc="left", color=INK)
    fig.savefig(out / "fairness.png")
    plt.close(fig)


def fig_explain(r, out):
    imp = list(r["explanations"]["shap_importance"].items())[:8][::-1]
    rea = list(r["explanations"]["denial_reasons"].items())[:6][::-1]
    fig, (a, b) = plt.subplots(1, 2, figsize=(8.4, 2.8))
    a.barh([k for k, _ in imp], [v for _, v in imp], color=INK, height=0.6)
    a.set_title("What the model uses (mean |SHAP|)", loc="left", color=INK)
    b.barh([k for k, _ in rea], [v * 100 for _, v in rea], color=MUTED, height=0.6)
    b.set_title("Why lenders said they denied (%)", loc="left", color=INK)
    fig.tight_layout()
    fig.savefig(out / "explanations.png")
    plt.close(fig)


def fig_drift(r, out):
    rows = r["robustness"]["drift"]["rows"]
    fig, (a, b) = plt.subplots(1, 2, figsize=(8.4, 2.8))
    labels = [f"{x['train_year']}→{x['test_year']}" for x in rows]
    a.bar(labels, [x["roc_auc"] for x in rows], color=INK, width=0.55)
    a.set_ylim(0.6, 0.85)
    a.set_title("ROC-AUC, train year → test year", loc="left", color=INK)
    b.bar(labels, [x["wrong_auto_approval"] * 100 for x in rows], color=MUTED, width=0.55)
    b.axhline(5, color=FAIL, lw=1, ls="--")
    b.set_title("Wrong auto-approvals (%), 5% budget", loc="left", color=INK)
    fig.tight_layout()
    fig.savefig(out / "drift.png")
    plt.close(fig)


def fig_states(r, out):
    st = r["robustness"]["states"]
    labels = [r["setup"]["state"] + " (home)"] + [x["state"] for x in st]
    home_gap = next(g for g in r["fairness"]["derived_race"]["gaps"] if g["group"].startswith("Black"))
    gaps = [home_gap["base__false_referral_gap"]] + [
        next((f["false_referral_gap"] for f in x["fairness"] if f["group"].startswith("Black")), (np.nan,) * 3) for x in st]
    fig, (a, b) = plt.subplots(1, 2, figsize=(8.4, 2.8))
    loc = [None] + [x["holdout_auc_local"] for x in st]
    tr = [r["variants"]["base"]["roc_auc"]] + [x["holdout_auc_transfer"] for x in st]
    xs = np.arange(len(labels))
    a.bar(xs - 0.18, tr, width=0.36, color=INK, label="Georgia model")
    a.bar(xs[1:] + 0.18, loc[1:], width=0.36, color=MUTED, label="Trained in-state")
    a.set_xticks(xs, labels)
    a.set_ylim(0.6, 0.9)
    a.legend(frameon=False, fontsize=8)
    a.set_title("ROC-AUC on each state's 2023", loc="left", color=INK)
    for i, (pt, lo, hi) in enumerate(gaps):
        b.plot([lo * 100, hi * 100], [i, i], color=INK, lw=2)
        b.plot(pt * 100, i, "o", color=INK)
    b.set_yticks(range(len(labels)), labels)
    b.invert_yaxis()
    b.axvline(0, color=LINE)
    b.set_title("Black–White false-referral gap (pp)", loc="left", color=INK)
    fig.tight_layout()
    fig.savefig(out / "states.png")
    plt.close(fig)


def write_report(r):
    out = config.REPORT_DIR
    for f in (fig_leakage, fig_comparison, fig_calibration, fig_automation, fig_fairness, fig_explain, fig_drift, fig_states):
        f(r, out)

    s = r["data"]["scope"]
    tr, te = s[str(r["setup"]["train_year"])] if str(r["setup"]["train_year"]) in s else s[r["setup"]["train_year"]], \
        s[str(r["setup"]["test_year"])] if str(r["setup"]["test_year"]) in s else s[r["setup"]["test_year"]]
    lines = [
        "# LoanWise ML v2: results (auto-generated by `python -m ml.run`)", "",
        f"Data: HMDA {r['setup']['state']} home-purchase decisions. Train {r['setup']['train_year']} "
        f"({tr['rows']:,} applications, {tr['denials']:,} denials), test {r['setup']['test_year']} "
        f"({te['rows']:,}, {te['denials']:,} denials). v1 had {r['v1']['rows']} rows and {r['v1']['female']} women.", "",
        "## Scope", "", "| Rule | Removed (train) |", "|---|---|",
        *[f"| {x['label']} | {x['removed']:,} |" for x in tr["steps"]], "",
        "## Leakage", "",
        f"Honest features: ROC-AUC **{r['leakage']['honest_auc']:.3f}**. Adding post-decision columns: "
        f"**{r['leakage']['leaky_auc']:.3f}**.", "", "![](leakage.png)", "",
        "| Column | Post-decision | Missing when denied | Missing when approved | Missingness AUC |", "|---|---|---|---|---|",
        *[f"| {a['column']} | {'yes' if a['post_decision'] else 'no'} | {pct(a['missing_share_denied'])} | "
          f"{pct(a['missing_share_approved'])} | {a['missingness_auc']:.3f} |" for a in r["leakage"]["audit"][:12]], "",
        "### Separation audit (category levels with a single outcome)", "",
        "| Column | Level | n | Approval rate | Used as a feature |", "|---|---|---|---|---|",
        *[f"| {x['column']} | {x['level']} | {x['n']:,} | {pct(x['approval_rate'])} | {'yes' if x['in_features'] else 'no (excluded)'} |"
          for x in r["leakage"]["separation"]], "",
        "Effect of the `preapproval` selection leak on the chosen (monotonic) model: " + "; ".join(
            f"{k}: ROC-AUC {v['roc_auc']:.3f}, {pct(v['auto_approved_share_2pct'])} automated at <= 2% wrong approvals"
            for k, v in r["leakage"]["selection_leak"].items()) + ".", "",
        "## Model comparison (test year)", "",
        "| Model | ROC-AUC [95% CI] | PR-AUC (denials) | Brier | ECE |", "|---|---|---|---|---|",
        *[f"| {c['name']} | {c['roc_auc']:.3f}" + (f" [{c['roc_auc_ci'][0]:.3f}, {c['roc_auc_ci'][1]:.3f}]" if 'roc_auc_ci' in c else "")
          + f" | {c['pr_auc_denial']:.3f} | {c['brier']:.4f} | {c['ece']:.4f} |" for c in r["comparison"]], "",
        "![](comparison.png)", "", "![](calibration.png)", "",
        "## Automation policy", "",
        f"Thresholds are chosen on {r['automation']['threshold_chosen_on']} for a wrong-auto-approval budget, "
        "then applied unchanged to the test year.", "",
        "| Budget | Threshold | Automated (train, OOF) | Wrong (train, OOF) | Automated (test) | Wrong (test) | Denials referred (test) |",
        "|---|---|---|---|---|---|---|",
        *[f"| {lab} | {a['threshold']:.3f} | {pct(a['in_train']['auto_approved_share'])} | {pct(a['in_train']['wrong_auto_approval'])} | "
          f"{pct(a['auto_approved_share'])} | {pct(a['wrong_auto_approval'])} | {pct(a['denials_caught_for_review'])} |"
          for lab, a in (("2%", r["automation"]["at_2pct"]), ("5%", r["automation"]["at_5pct"]))], "",
        "![](automation.png)", "",
        "## Fairness (test year, gaps vs reference group, percentage points [95% CI])", "",
        f"False referral = the lender approved but the model would not auto-approve at threshold {r['fairness_threshold']:.3f}.", "",
        "| Group | n | Lender approval gap | Model mean-p gap | + geography | Reweighed | False-referral gap (base) |",
        "|---|---|---|---|---|---|---|",
    ]
    for attr, f in r["fairness"].items():
        for g in f["gaps"]:
            lines.append(f"| {g['group']} vs {f['reference']} | {g['n']:,} | {ci(g['lender_gap'], 1, 100)} | "
                         f"{ci(g['base__mean_p_gap'], 1, 100)} | {ci(g['geography__mean_p_gap'], 1, 100)} | "
                         f"{ci(g['reweighed__mean_p_gap'], 1, 100)} | {ci(g['base__false_referral_gap'], 1, 100)} |")
    v = r["variants"]
    lines += ["", "![](fairness.png)", "",
              "| Variant | ROC-AUC | Brier | ECE |", "|---|---|---|---|",
              *[f"| {k} | {x['roc_auc']:.3f} | {x['brier']:.4f} | {x['ece']:.4f} |" for k, x in v.items()], "",
              "## Robustness: drift over time (Georgia)", "",
              "Each model keeps the threshold chosen on its own training year (5% budget).", "",
              "| Model | Test year | Actual approval | Mean predicted | ROC-AUC | ECE | Automated | Wrong auto-approvals |",
              "|---|---|---|---|---|---|---|---|",
              *[f"| {x['model']} | {x['test_year']} | {pct(x['actual_approval'])} | {pct(x['mean_predicted'])} | {x['roc_auc']:.3f} | "
                f"{x['ece']:.3f} | {pct(x['auto_approved_share'])} | {pct(x['wrong_auto_approval'])} |" for x in r["robustness"]["drift"]["rows"]], "",
              "| Year | Applications | Approval rate | Median DTI | Median LTV | Median loan | Median income |", "|---|---|---|---|---|---|---|",
              *[f"| {x['year']} | {x['rows']:,} | {pct(x['approval_rate'])} | {x['median_dti']:.0f}% | {x['median_ltv']:.1f}% | "
                f"${x['median_loan']:,.0f} | ${x['median_income']:,.0f} |" for x in r["robustness"]["drift"]["profile"]], "",
              "![](drift.png)", "",
              f"## Robustness: unseen states ({r['setup']['test_year']}, Georgia model and threshold)", "",
              "| State | Applications | Actual approval | Mean predicted | ROC-AUC (GA model) | ROC-AUC (in-state, 20% holdout) | GA model on same holdout | Automated | Wrong auto-approvals |",
              "|---|---|---|---|---|---|---|---|---|",
              *[f"| {x['state']} | {x['scoped_rows']:,} | {pct(x['transfer']['actual_approval'])} | {pct(x['transfer']['mean_predicted'])} | "
                f"{x['transfer']['roc_auc']:.3f} | {x['holdout_auc_local']:.3f} | {x['holdout_auc_transfer']:.3f} | "
                f"{pct(x['transfer']['auto_approved_share'])} | {pct(x['transfer']['wrong_auto_approval'])} |" for x in r["robustness"]["states"]], "",
              "| State | Group | n | Lender gap | Model mean gap | False-referral gap |", "|---|---|---|---|---|---|",
              *[f"| {x['state']} | {f['group']} | {f['n']:,} | {ci(f['lender_gap'], 1, 100)} | {ci(f['model_mean_gap'], 1, 100)} | "
                f"{ci(f['false_referral_gap'], 1, 100)} |" for x in r["robustness"]["states"] for f in x["fairness"]], "",
              "![](states.png)", "",
              "## Explanations", "", "![](explanations.png)", "",
              f"_Runtime {r['runtime_seconds']} s._", ""]
    (out / "REPORT.md").write_text("\n".join(lines), encoding="utf-8")
