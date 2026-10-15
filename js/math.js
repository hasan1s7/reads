export function sigmoid(x) {
  return 1 / (1 + Math.exp(-x));
}

export function clamp(x, low, high) {
  return Math.max(low, Math.min(high, x));
}

export function betaMean(alpha, beta) {
  return alpha / (alpha + beta);
}

export function betaVariance(alpha, beta) {
  return (alpha * beta) / (((alpha + beta) ** 2) * (alpha + beta + 1));
}

export function logGamma(z) {
  const c = [
    676.5203681218851,
    -1259.1392167224028,
    771.32342877765313,
    -176.61502916214059,
    12.507343278686905,
    -0.13857109526572012,
    9.9843695780195716e-6,
    1.5056327351493116e-7,
  ];
  if (z < 0.5) {
    return Math.log(Math.PI) - Math.log(Math.sin(Math.PI * z)) - logGamma(1 - z);
  }
  z -= 1;
  let x = 0.99999999999980993;
  for (let i = 0; i < c.length; i += 1) x += c[i] / (z + i + 1);
  const t = z + c.length - 0.5;
  return 0.5 * Math.log(2 * Math.PI) + (z + 0.5) * Math.log(t) - t + Math.log(x);
}

export function betaPdf(x, alpha, beta) {
  if (x <= 0 || x >= 1) return 0;
  const logPdf =
    (alpha - 1) * Math.log(x) +
    (beta - 1) * Math.log(1 - x) -
    (logGamma(alpha) + logGamma(beta) - logGamma(alpha + beta));
  return Math.exp(Math.min(40, logPdf));
}
