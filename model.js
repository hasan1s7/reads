import { CANDIDATES, DEFAULTS, TASK_WEIGHTS } from './config.js';
import { betaMean, betaVariance, clamp, sigmoid } from './math.js';

export function createState() {
  return {
    alpha: DEFAULTS.alpha,
    beta: DEFAULTS.beta,
    x: DEFAULTS.x,
    psi: DEFAULTS.psi,
    time: DEFAULTS.time,
    lastWeight: null,
    trajectory: [{ t: 0, beta: 0.5, dynamic: 0.5 }],
  };
}

export function evidenceWeight({ task, hints, difficulty }) {
  const hintFactor = hints === 0 ? 1 : hints === 1 ? 0.72 : 0.48;
  return TASK_WEIGHTS[task] * hintFactor * (0.8 + 0.4 * difficulty);
}

export function applyEvidence(state, obs, coupling) {
  const weight = evidenceWeight(obs);
  state.alpha += weight * obs.correct;
  state.beta += weight * (1 - obs.correct);
  state.x =
    DEFAULTS.persistence * state.x +
    DEFAULTS.learnerRate * weight * (obs.correct ? 1 : -1) +
    coupling * state.psi;
  state.time += 1;
  state.lastWeight = weight;
  state.trajectory.push({
    t: state.time,
    beta: betaMean(state.alpha, state.beta),
    dynamic: sigmoid(state.x),
  });
  return weight;
}

export function advanceTime(state, days, persistence) {
  state.x = Math.pow(persistence, days) * state.x;
  const evidenceDecay = Math.exp(-0.03 * days);
  state.alpha = 1 + evidenceDecay * (state.alpha - 1);
  state.beta = 1 + evidenceDecay * (state.beta - 1);
  state.time += Math.max(1, days);
  state.trajectory.push({
    t: state.time,
    beta: betaMean(state.alpha, state.beta),
    dynamic: sigmoid(state.x),
  });
}

export function updateTeacher(state, eventEvidence, rate, coupling) {
  state.psi = DEFAULTS.teacherPersistence * state.psi + rate * eventEvidence;
  state.x += coupling * state.psi;
  state.time += 1;
  state.trajectory.push({
    t: state.time,
    beta: betaMean(state.alpha, state.beta),
    dynamic: sigmoid(state.x),
  });
}

export function pooledEstimate(state, populationMean, poolingStrength) {
  const k = DEFAULTS.populationConcentration;
  const alphaPop = populationMean * k;
  const betaPop = (1 - populationMean) * k;
  return (state.alpha + poolingStrength * alphaPop) /
    (state.alpha + state.beta + poolingStrength * (alphaPop + betaPop));
}

export function confidenceLabel(state) {
  const mass = state.alpha + state.beta;
  if (mass < 4) return 'low confidence';
  if (mass < 8) return 'moderate confidence';
  return 'high confidence';
}

export function rankCandidates(state, weights) {
  const mastery = betaMean(state.alpha, state.beta);
  const uncertainty = Math.sqrt(betaVariance(state.alpha, state.beta));
  const denominator = Math.max(0.001, weights.learn + weights.info + weights.review + weights.engagement);

  return CANDIDATES.map((candidate) => {
    const challenge = 1 - Math.abs(candidate.difficulty - mastery);
    const learning = clamp((1 - mastery) * challenge * TASK_WEIGHTS[candidate.task] / 1.45, 0, 1);
    const information = clamp(uncertainty * 3.3 * (0.65 + 0.35 * challenge), 0, 1);
    const score = (
      weights.learn * learning +
      weights.info * information +
      weights.review * candidate.review +
      weights.engagement * candidate.engagement
    ) / denominator;
    return { ...candidate, learning, information, score };
  }).sort((a, b) => b.score - a.score);
}
