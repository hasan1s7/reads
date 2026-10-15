import { TASK_NAMES } from './config.js';
import { betaMean, betaVariance, sigmoid } from './math.js';
import {
  createState,
  applyEvidence,
  advanceTime,
  updateTeacher,
  pooledEstimate,
  confidenceLabel,
  rankCandidates,
} from './model.js';
import { renderBetaChart, renderTraceChart, renderPoolChart } from './charts.js';

const $ = (id) => document.getElementById(id);
let state = createState();
let researchMode = false;

function updateLabels() {
  $('difficultyLabel').textContent = Number($('difficultyRange').value).toFixed(2);
  $('daysLabel').textContent = Number($('daysRange').value).toFixed(0);
  $('rhoLabel').textContent = Number($('rhoRange').value).toFixed(2);
  $('populationLabel').textContent = Number($('populationRange').value).toFixed(2);
  $('poolingLabel').textContent = Number($('poolingRange').value).toFixed(2);
  $('teacherRateLabel').textContent = Number($('teacherRateRange').value).toFixed(2);
  $('couplingLabel').textContent = Number($('couplingRange').value).toFixed(2);
  $('wLearnLabel').textContent = Number($('wLearnRange').value).toFixed(2);
  $('wInfoLabel').textContent = Number($('wInfoRange').value).toFixed(2);
  $('wReviewLabel').textContent = Number($('wReviewRange').value).toFixed(2);
  $('wEngagementLabel').textContent = Number($('wEngagementRange').value).toFixed(2);
}

function recommendationWeights() {
  return {
    learn: Number($('wLearnRange').value),
    info: Number($('wInfoRange').value),
    review: Number($('wReviewRange').value),
    engagement: Number($('wEngagementRange').value),
  };
}

function renderRecommendations() {
  const list = $('recommendationList');
  const ranked = rankCandidates(state, recommendationWeights());
  list.innerHTML = ranked.map((c, i) => `
    <div class="recommendation-row">
      <div class="recommendation-top">
        <div>
          <strong>${i + 1}. ${c.name}</strong>
          <div class="muted small">difficulty ${c.difficulty.toFixed(2)} · learning ${c.learning.toFixed(2)} · information ${c.information.toFixed(2)}</div>
        </div>
        <span class="mono">${c.score.toFixed(3)}</span>
      </div>
      <div class="score-bar"><div class="score-fill" style="width:${(c.score * 100).toFixed(1)}%"></div></div>
    </div>
  `).join('');
}

function render() {
  const mean = betaMean(state.alpha, state.beta);
  const sd = Math.sqrt(betaVariance(state.alpha, state.beta));
  const population = Number($('populationRange').value);
  const pooling = Number($('poolingRange').value);
  const pooled = pooledEstimate(state, population, pooling);
  const coupling = Number($('couplingRange').value);

  $('masteryPercent').textContent = `${Math.round(mean * 100)}%`;
  $('confidenceLabel').textContent = confidenceLabel(state);
  $('masteryBar').style.width = `${(mean * 100).toFixed(1)}%`;
  $('posteriorMean').textContent = mean.toFixed(3);
  $('posteriorSd').textContent = sd.toFixed(3);
  $('evidenceMass').textContent = (state.alpha + state.beta).toFixed(2);
  $('betaLabel').textContent = `Beta(${state.alpha.toFixed(2)}, ${state.beta.toFixed(2)})`;
  $('localEstimate').textContent = mean.toFixed(3);
  $('populationEstimate').textContent = population.toFixed(3);
  $('pooledEstimate').textContent = pooled.toFixed(3);
  $('psiValue').textContent = state.psi.toFixed(3);
  $('psiProbability').textContent = sigmoid(state.psi).toFixed(3);
  $('studentLift').textContent = (coupling * state.psi).toFixed(3);

  $('stateInspector').textContent = JSON.stringify({
    concept: $('conceptInput').value,
    learner: {
      alpha: +state.alpha.toFixed(4),
      beta: +state.beta.toFixed(4),
      posterior_mean: +mean.toFixed(4),
      posterior_sd: +sd.toFixed(4),
      latent_x: +state.x.toFixed(4),
      dynamic_mastery: +sigmoid(state.x).toFixed(4),
    },
    teacher: {
      psi: +state.psi.toFixed(4),
      probability: +sigmoid(state.psi).toFixed(4),
    },
    hierarchy: {
      population_mean: +population.toFixed(4),
      pooling_strength: +pooling.toFixed(4),
      pooled_mastery: +pooled.toFixed(4),
    },
    time: state.time,
  }, null, 2);

  renderBetaChart($('betaChart'), state.alpha, state.beta, mean);
  renderTraceChart($('traceChart'), state.trajectory);
  renderPoolChart($('poolChart'), mean, population, pooled);
  renderRecommendations();
}

function bindTabs() {
  document.querySelectorAll('.tab').forEach((button) => {
    button.addEventListener('click', () => {
      document.querySelectorAll('.tab').forEach((tab) => tab.classList.remove('active'));
      document.querySelectorAll('.tab-panel').forEach((panel) => panel.classList.remove('active'));
      button.classList.add('active');
      document.querySelector(`[data-panel="${button.dataset.tab}"]`).classList.add('active');
    });
  });
}

$('applyEvidenceBtn').addEventListener('click', () => {
  const obs = {
    task: $('taskSelect').value,
    correct: Number($('resultSelect').value),
    hints: Number($('hintsSelect').value),
    difficulty: Number($('difficultyRange').value),
  };
  const weight = applyEvidence(state, obs, Number($('couplingRange').value));
  $('explanationBox').innerHTML = `<strong>What changed:</strong> ${TASK_NAMES[obs.task]} produced evidence weight <span class="mono">${weight.toFixed(2)}</span>. Because the answer was ${obs.correct ? 'correct' : 'incorrect'}, the mastery estimate moved ${obs.correct ? 'up' : 'down'}. ${weight > 1 ? 'This counted as relatively strong evidence.' : 'This counted as relatively modest evidence.'}`;
  render();
});

$('advanceTimeBtn').addEventListener('click', () => {
  advanceTime(state, Number($('daysRange').value), Number($('rhoRange').value));
  render();
});

$('updateTeacherBtn').addEventListener('click', () => {
  updateTeacher(
    state,
    Number($('teacherEventSelect').value),
    Number($('teacherRateRange').value),
    Number($('couplingRange').value),
  );
  render();
});

$('resetBtn').addEventListener('click', () => {
  state = createState();
  $('explanationBox').textContent = 'No evidence has been added yet. Try one observation and the model will explain what changed.';
  render();
});

$('researchModeBtn').addEventListener('click', () => {
  researchMode = !researchMode;
  document.body.classList.toggle('research-mode-on', researchMode);
  $('researchModeBtn').textContent = `Research mode: ${researchMode ? 'on' : 'off'}`;
});

document.querySelectorAll('.preset').forEach((button) => {
  button.addEventListener('click', () => {
    $('conceptInput').value = button.dataset.concept;
    render();
  });
});

document.querySelectorAll('input[type="range"], select, input[type="text"]').forEach((el) => {
  el.addEventListener('input', () => {
    updateLabels();
    render();
  });
});

bindTabs();
updateLabels();
render();
