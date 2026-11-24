# Malicious-URL model (training pipeline)

`train.py` trains the classifier that `server/src/ml/model.json` is exported from.

```bash
cd ml
pip install -r requirements.txt
curl -L -o data.csv https://raw.githubusercontent.com/faizann24/Using-machine-learning-to-detect-malicious-URLs/master/data/data.csv
python train.py          # ~3 min; writes model.json, metrics.json, roc.png, confusion.png, parity_sample.json
cp model.json ../server/src/ml/model.json
```

* **Data:** ~420k labelled URLs (`good` / `bad`). Duplicates are removed, and the bare-domain form of every benign site is
  added, because in the raw data benign URLs nearly always have a path while many malicious ones are bare domains
  (without this the model learns "no path = malicious").
* **Split:** 80/20 *grouped by host*, so no website appears in both training and test data.
* **Features:** 35 lexical features computed from the URL text only (`urlfeatures.py`). `server/src/ml/features.js` is a
  line-by-line port; `server/tests/threat.test.js` checks both give identical numbers.
* **Models compared:** logistic regression, random forest, gradient boosting (chosen). Results are in `metrics.json`.
* **Export:** the boosted trees are written as plain JSON and evaluated in Node (`server/src/ml/gbm.js`), so no Python
  service is needed at runtime.

If you change `urlfeatures.py` you must change `features.js` the same way and retrain.
