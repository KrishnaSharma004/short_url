import json, re, time
import numpy as np, pandas as pd
from sklearn.ensemble import GradientBoostingClassifier, RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import GroupShuffleSplit
from sklearn.preprocessing import StandardScaler
from sklearn.pipeline import make_pipeline
from sklearn.metrics import (accuracy_score, precision_score, recall_score, f1_score, roc_auc_score,
                             confusion_matrix, roc_curve, precision_recall_curve)
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import urlfeatures as uf

SEED = 42
t0 = time.time()
df = pd.read_csv("data.csv", on_bad_lines="skip").dropna()
df["url"] = df["url"].astype(str).str.strip()
n_raw = len(df)
df = df.drop_duplicates(subset="url")
df = df[df.url.str.len().between(4, 2048)]
df["y"] = (df.label == "bad").astype(int)

def host_of(u):
    h = uf.SCHEME_RE.sub("", u.strip())
    h = re.split(r"[/?#]", h, 1)[0].rsplit("@", 1)[-1]
    h = re.sub(r":\d+$", "", h).lower()
    return re.sub(r"^www\.", "", h)

df["host"] = df.url.map(host_of)
# Dataset bias fix: benign URLs nearly always carry a path while many malicious entries are bare domains, so a
# model would learn "no path => malicious". Add the bare-domain form of every benign site as a benign sample.
good_hosts = df[df.y == 0].host.drop_duplicates()
aug = pd.DataFrame({"url": good_hosts, "label": "good", "y": 0, "host": good_hosts})
aug = aug[~aug.url.isin(set(df.url))]
df = pd.concat([df, aug], ignore_index=True)
print("augmented bare-domain benign rows:", len(aug))
print("rows raw/clean:", n_raw, len(df), "malicious share: %.3f" % df.y.mean())

X = np.array([uf.extract(u) for u in df.url], dtype=float)
y = df.y.values
print("features done %.0fs" % (time.time() - t0), X.shape)
# Group split by host: no website appears in both the training and test sets (stricter than a random split).
tr_i, te_i = next(GroupShuffleSplit(n_splits=1, test_size=0.2, random_state=SEED).split(X, y, groups=df.host.values))
Xtr, Xte, ytr, yte = X[tr_i], X[te_i], y[tr_i], y[te_i]
utr, ute = df.url.values[tr_i], df.url.values[te_i]

def metrics(y_true, proba, thr=0.5):
    pred = (proba >= thr).astype(int)
    tn, fp, fn, tp = confusion_matrix(y_true, pred).ravel()
    return {
        "threshold": thr, "accuracy": accuracy_score(y_true, pred), "precision": precision_score(y_true, pred),
        "recall": recall_score(y_true, pred), "f1": f1_score(y_true, pred), "roc_auc": roc_auc_score(y_true, proba),
        "false_positive_rate": fp / (fp + tn), "tn": int(tn), "fp": int(fp), "fn": int(fn), "tp": int(tp),
    }

models = {}
lr = make_pipeline(StandardScaler(), LogisticRegression(max_iter=1000, class_weight="balanced"))
lr.fit(Xtr, ytr); models["Logistic Regression"] = lr.predict_proba(Xte)[:, 1]
print("LR done %.0fs" % (time.time() - t0))
rf = RandomForestClassifier(n_estimators=100, max_depth=14, n_jobs=-1, random_state=SEED, class_weight="balanced_subsample")
rf.fit(Xtr, ytr); models["Random Forest"] = rf.predict_proba(Xte)[:, 1]
print("RF done %.0fs" % (time.time() - t0))
gb = GradientBoostingClassifier(n_estimators=150, max_depth=5, learning_rate=0.1, subsample=0.8, random_state=SEED)
gb.fit(Xtr, ytr); models["Gradient Boosting"] = gb.predict_proba(Xte)[:, 1]
print("GB done %.0fs" % (time.time() - t0))

report = {"dataset": {"source": "faizann24/Using-machine-learning-to-detect-malicious-URLs (data.csv)", "rows_raw": n_raw,
                      "rows_clean": int(len(df)), "augmented_bare_domain_benign": int(len(aug)), "split": "grouped by host (80/20)", "malicious": int(y.sum()), "benign": int((1 - y).sum()),
                      "train": int(len(ytr)), "test": int(len(yte)), "n_features": len(uf.FEATURE_NAMES)},
          "models": {k: metrics(yte, p) for k, p in models.items()}}

# Operating points for the chosen model (gradient boosting)
p = models["Gradient Boosting"]
report["operating_points"] = {"flag_0.50": metrics(yte, p, 0.50), "block_0.90": metrics(yte, p, 0.90)}
imp = sorted(zip(uf.FEATURE_NAMES, gb.feature_importances_), key=lambda t: -t[1])[:10]
report["top_features"] = [{"feature": f, "importance": float(v)} for f, v in imp]

# ---- export the gradient-boosting model as plain JSON so Node can score without Python
prior = ytr.mean()
init_raw = float(np.log(prior / (1 - prior)))
trees = []
for est in gb.estimators_[:, 0]:
    t = est.tree_
    trees.append({"f": t.feature.tolist(), "t": [float(v) for v in t.threshold], "l": t.children_left.tolist(),
                  "r": t.children_right.tolist(), "v": [float(v) for v in t.value[:, 0, 0]]})
export = {"version": 1, "features": uf.FEATURE_NAMES, "init": init_raw, "learning_rate": gb.learning_rate, "trees": trees}
# parity check of the export against sklearn
def raw_score(x):
    s = init_raw
    for tr in trees:
        i = 0
        while tr["l"][i] != -1:
            i = tr["l"][i] if x[tr["f"][i]] <= tr["t"][i] else tr["r"][i]
        s += gb.learning_rate * tr["v"][i]
    return s
idx = np.random.RandomState(0).choice(len(Xte), 300, replace=False)
mine = np.array([1 / (1 + np.exp(-raw_score(Xte[i]))) for i in idx])
assert np.abs(mine - p[idx]).max() < 1e-6, np.abs(mine - p[idx]).max()
report["export_parity_max_abs_diff"] = float(np.abs(mine - p[idx]).max())
json.dump(export, open("model.json", "w"), separators=(",", ":"))
json.dump(report, open("metrics.json", "w"), indent=2)

# held-out sample for the JS parity test and a few demo rows
sel = np.random.RandomState(1).choice(len(ute), 600, replace=False)
json.dump([{"url": str(ute[i]), "features": [float(v) for v in Xte[i]], "proba": float(p[i])} for i in sel],
          open("parity_sample.json", "w"))

# ---- figures
plt.rcParams.update({"font.family": "serif", "font.size": 10})
fig, ax = plt.subplots(figsize=(5.2, 4))
for k, pr in models.items():
    fpr, tpr, _ = roc_curve(yte, pr); ax.plot(fpr, tpr, label="%s (AUC %.3f)" % (k, roc_auc_score(yte, pr)))
ax.plot([0, 1], [0, 1], "k--", lw=0.8); ax.set_xlabel("False positive rate"); ax.set_ylabel("True positive rate")
ax.set_title("ROC curves on the held-out test set"); ax.legend(loc="lower right", fontsize=8); ax.grid(alpha=.3)
fig.tight_layout(); fig.savefig("roc.png", dpi=200); plt.close(fig)

cm = confusion_matrix(yte, (p >= 0.5).astype(int))
fig, ax = plt.subplots(figsize=(4.2, 3.6)); ax.imshow(cm, cmap="Blues")
for (i, j), v in np.ndenumerate(cm): ax.text(j, i, f"{v:,}", ha="center", va="center", color="white" if v > cm.max() / 2 else "black")
ax.set_xticks([0, 1], ["Benign", "Malicious"]); ax.set_yticks([0, 1], ["Benign", "Malicious"])
ax.set_xlabel("Predicted"); ax.set_ylabel("Actual"); ax.set_title("Confusion matrix (threshold 0.50)")
fig.tight_layout(); fig.savefig("confusion.png", dpi=200); plt.close(fig)
print(json.dumps(report["models"], indent=1)); print(json.dumps(report["operating_points"], indent=1))
print("total %.0fs" % (time.time() - t0))
