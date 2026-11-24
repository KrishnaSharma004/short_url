// Tiny inference engine for a scikit-learn GradientBoostingClassifier exported to JSON by ml/train.py.
// Each tree is stored as parallel arrays (feature index, threshold, left, right, leaf value).
const model = require("./model.json");

function sigmoid(z) {
  return 1 / (1 + Math.exp(-z));
}

function predictProba(x) {
  let raw = model.init;
  for (const t of model.trees) {
    let i = 0;
    while (t.l[i] !== -1) i = x[t.f[i]] <= t.t[i] ? t.l[i] : t.r[i];
    raw += model.learning_rate * t.v[i];
  }
  return sigmoid(raw);
}

module.exports = { predictProba, featureNames: model.features, treeCount: model.trees.length };
