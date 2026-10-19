class NaiveBayes {
  constructor(classCount = 3, featureCount = 4) {
    this.classCount = classCount;
    this.featureCount = featureCount;
    this.reset();
  }

  reset() {
    this.total = 0;
    this.classTotals = new Array(this.classCount).fill(0);
    this.counts = Array.from({ length: this.classCount }, () =>
      Array.from({ length: this.featureCount }, () => [0, 0])
    );
  }

  learn(features, label) {
    this.total += 1;
    this.classTotals[label] += 1;
    features.forEach((value, j) => {
      this.counts[label][j][value] += 1;
    });
  }

  prior(label, alpha) {
    const denominator = this.total + alpha * this.classCount;
    return denominator === 0 ? 0 : (this.classTotals[label] + alpha) / denominator;
  }

  likelihood(label, j, value, alpha) {
    const denominator = this.classTotals[label] + 2 * alpha;
    return denominator === 0 ? 0 : (this.counts[label][j][value] + alpha) / denominator;
  }

  predict(features, alpha) {
    const scores = [];
    for (let c = 0; c < this.classCount; c++) {
      let score = this.prior(c, alpha);
      for (let j = 0; j < this.featureCount; j++) {
        score *= this.likelihood(c, j, features[j], alpha);
      }
      scores.push(score);
    }
    const sum = scores.reduce((a, b) => a + b, 0);
    if (sum === 0) {
      return { probs: scores.map(() => 0), locked: true };
    }
    return { probs: scores.map((s) => s / sum), locked: false };
  }

  priors(alpha) {
    return Array.from({ length: this.classCount }, (_, c) => this.prior(c, alpha));
  }
}

if (typeof module !== 'undefined') module.exports = NaiveBayes;
