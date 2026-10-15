import { betaPdf } from './math.js';

function path(points, xFn, yFn) {
  return points.map((p, i) => `${i ? 'L' : 'M'}${xFn(p).toFixed(1)},${yFn(p).toFixed(1)}`).join(' ');
}

export function renderBetaChart(svg, alpha, beta, mean) {
  const W = 680, H = 230, pad = 38;
  const points = [];
  let maxY = 0;
  for (let i = 1; i < 100; i += 1) {
    const x = i / 100;
    const y = betaPdf(x, alpha, beta);
    points.push({ x, y });
    maxY = Math.max(maxY, y);
  }
  maxY = Math.max(maxY, 1e-6);
  const sx = (x) => pad + x * (W - 2 * pad);
  const sy = (y) => H - pad - (y / maxY) * (H - 2 * pad - 10);
  let grid = '';
  [0, 0.25, 0.5, 0.75, 1].forEach((v) => {
    const x = sx(v);
    grid += `<line class="gridline" x1="${x}" y1="18" x2="${x}" y2="${H - pad}"/>`;
    grid += `<text x="${x}" y="${H - 10}" text-anchor="middle">${v.toFixed(2)}</text>`;
  });
  const meanX = sx(mean);
  svg.innerHTML = `${grid}<path d="${path(points, p => sx(p.x), p => sy(p.y))}" fill="none" stroke="var(--series-2)" stroke-width="3"/><line x1="${meanX}" y1="20" x2="${meanX}" y2="${H - pad}" stroke="var(--series-4)" stroke-width="2" stroke-dasharray="5 5"/>`;
}

export function renderTraceChart(svg, trajectory) {
  const W = 680, H = 280, pad = 42;
  const maxT = Math.max(1, ...trajectory.map(p => p.t));
  const sx = (p) => pad + (p.t / maxT) * (W - 2 * pad);
  const sy = (v) => H - pad - v * (H - 2 * pad);
  let grid = '';
  [0, 0.25, 0.5, 0.75, 1].forEach((v) => {
    const y = sy(v);
    grid += `<line class="gridline" x1="${pad}" y1="${y}" x2="${W - pad}" y2="${y}"/>`;
    grid += `<text x="8" y="${y + 4}">${v.toFixed(2)}</text>`;
  });
  svg.innerHTML = `${grid}<path d="${path(trajectory, sx, p => sy(p.beta))}" fill="none" stroke="var(--series-2)" stroke-width="3"/><path d="${path(trajectory, sx, p => sy(p.dynamic))}" fill="none" stroke="var(--series-4)" stroke-width="3"/><text x="${pad}" y="18">Beta posterior</text><text x="${pad + 125}" y="18">Dynamic latent state</text>`;
}

export function renderPoolChart(svg, local, population, pooled) {
  const W = 680, H = 230, pad = 55;
  const sx = (v) => pad + v * (W - 2 * pad);
  let grid = '';
  [0, 0.25, 0.5, 0.75, 1].forEach((v) => {
    const x = sx(v);
    grid += `<line class="gridline" x1="${x}" y1="25" x2="${x}" y2="200"/>`;
    grid += `<text x="${x}" y="220" text-anchor="middle">${v.toFixed(2)}</text>`;
  });
  svg.innerHTML = `${grid}<text x="8" y="62">Local</text><text x="8" y="122">Pooled</text><text x="8" y="182">Population</text><line x1="${sx(local)}" y1="58" x2="${sx(pooled)}" y2="118" stroke="var(--border)" stroke-width="2"/><line x1="${sx(population)}" y1="178" x2="${sx(pooled)}" y2="118" stroke="var(--border)" stroke-width="2"/><circle cx="${sx(local)}" cy="58" r="9" fill="var(--series-2)"/><circle cx="${sx(pooled)}" cy="118" r="11" fill="var(--series-4)"/><circle cx="${sx(population)}" cy="178" r="9" fill="var(--series-3)"/>`;
}
