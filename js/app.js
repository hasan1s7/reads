import { renderBetaChart } from './charts.js';

import {
  DEFAULT_PARAMS,
  DEMO_EDGES,
  addTeacherExposure,
  applyStudentEvidence,
  createState,
  graphSnapshot,
  posteriorForEdge,
  relationById,
  resetStudentEvidence,
  selectedEdgeSummary,
  setEdgeInput,
  teacherRichness,
} from './model.js';

const $ = (id) => document.getElementById(id);

let state = createState();

let params = {
  ...DEFAULT_PARAMS,
};

/* ============================================================
   GRAPH LAYOUT
   ============================================================

   We deliberately keep nodes in fixed positions across the
   curriculum, teacher, and student graphs.

   That lets the user interpret changes in edge thickness as
   changes in the meaning of the graph rather than changes in
   layout.

   Curriculum:
      thickness = semantic opportunity

   Teacher:
      thickness = enacted exposure / repetition

   Student:
      thickness = posterior probability of knowledge
   ============================================================ */

const NODE_POSITIONS = {
  skeletal: [180, 128],

  thin: [42, 78],
  adjective: [47, 184],

  'skeletal legs': [166, 230],
  '-al suffix': [300, 54],
  magical: [310, 158],

  'skeletal system': [177, 29],
  body: [280, 225],

  magic: [333, 222],
  system: [82, 29],
};


/* ============================================================
   BASIC UTILITIES
   ============================================================ */

function escapeHtml(value) {
  return String(value).replace(
    /[&<>'"]/g,
    (char) =>
      ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        "'": '&#39;',
        '"': '&quot;',
      })[char]
  );
}


function relationColor(relation) {
  const colors = {
    defines: '#c84a44',
    category_of: '#b07a18',
    morphologically_from: '#7c5bb5',
    exemplifies: '#2f78b7',
    same_pattern_as: '#2d8a74',
    part_of: '#8a6747',
    similar_to: '#6374a8',
    contrasts_with: '#8e4f75',
  };

  return colors[relation] || '#69707d';
}


function formatRelation(edge) {
  const relation =
    relationById(edge.relation);

  return `${edge.source} → ${relation.label} → ${edge.target}`;
}


/* ============================================================
   EDGE SELECTOR
   ============================================================ */

function populateEdgeSelect() {
  const select = $('edgeSelect');

  select.innerHTML =
    DEMO_EDGES
      .map((edge) => {
        const relation =
          relationById(edge.relation);

        return `
          <option value="${edge.id}">
            ${escapeHtml(edge.source)}
            →
            ${escapeHtml(relation.label)}
            →
            ${escapeHtml(edge.target)}
          </option>
        `;
      })
      .join('');

  select.value =
    state.selectedEdgeId;
}


/* ============================================================
   CONTROL SYNCHRONIZATION
   ============================================================ */

function syncSelectedControls() {
  const { local } =
    selectedEdgeSummary(
      state,
      params
    );

  $('curriculumStrengthRange').value =
    local.curriculum;

  $('externalStrengthRange').value =
    local.external;

  $('teacherMentionsRange').value =
    local.teacherMentions;
}


function syncParams() {
  params.curriculumWeight =
    Number(
      $('curriculumWeightRange').value
    );

  params.externalWeight =
    Number(
      $('externalWeightRange').value
    );

  params.teacherExposureWeight =
    Number(
      $('teacherExposureWeightRange').value
    );

  params.teacherRichnessWeight =
    Number(
      $('teacherRichnessWeightRange').value
    );

  params.edgePooling =
    Number(
      $('edgePoolingRange').value
    );
}


function updateLabels() {
  $('curriculumStrengthLabel').textContent =
    Number(
      $('curriculumStrengthRange').value
    ).toFixed(2);

  $('externalStrengthLabel').textContent =
    Number(
      $('externalStrengthRange').value
    ).toFixed(2);

  $('teacherMentionsLabel').textContent =
    Number(
      $('teacherMentionsRange').value
    ).toFixed(0);

  $('difficultyLabel').textContent =
    Number(
      $('difficultyRange').value
    ).toFixed(2);

  $('curriculumWeightLabel').textContent =
    Number(
      $('curriculumWeightRange').value
    ).toFixed(2);

  $('externalWeightLabel').textContent =
    Number(
      $('externalWeightRange').value
    ).toFixed(2);

  $('teacherExposureWeightLabel').textContent =
    Number(
      $('teacherExposureWeightRange').value
    ).toFixed(2);

  $('teacherRichnessWeightLabel').textContent =
    Number(
      $('teacherRichnessWeightRange').value
    ).toFixed(2);

  $('edgePoolingLabel').textContent =
    Number(
      $('edgePoolingRange').value
    ).toFixed(2);
}


/* ============================================================
   NETWORK GRAPH RENDERING
   ============================================================ */

function renderNetwork(
  svg,
  stage
) {
  const edges =
    graphSnapshot(
      state,
      stage,
      params
    );

  const selectedId =
    state.selectedEdgeId;

  const visibleNodes =
    new Set();

  const edgeMarkup =
    edges
      .map((edge) => {
        const [x1, y1] =
          NODE_POSITIONS[edge.source] ||
          [180, 130];

        const [x2, y2] =
          NODE_POSITIONS[edge.target] ||
          [180, 130];

        visibleNodes.add(
          edge.source
        );

        visibleNodes.add(
          edge.target
        );

        const selected =
          edge.id === selectedId;

        const strength =
          edge.strength;

        const opacity =
          0.15 +
          0.80 * strength;

        const width =
          1 +
          strength * 6 +
          (selected ? 2 : 0);

        const color =
          selected
            ? relationColor(
                edge.relation
              )
            : '#7d8591';

        const relation =
          relationById(
            edge.relation
          );

        const midpointX =
          (x1 + x2) / 2;

        const midpointY =
          (y1 + y2) / 2;

        return `
          <g>
            <line
              x1="${x1}"
              y1="${y1}"
              x2="${x2}"
              y2="${y2}"
              stroke="${color}"
              stroke-width="${width.toFixed(2)}"
              opacity="${opacity.toFixed(2)}"
              stroke-linecap="round"
            />

            ${
              selected
                ? `
                  <rect
                    x="${midpointX - 42}"
                    y="${midpointY - 17}"
                    width="84"
                    height="18"
                    rx="9"
                    fill="#ffffff"
                    opacity="0.94"
                  />

                  <text
                    x="${midpointX}"
                    y="${midpointY - 5}"
                    text-anchor="middle"
                    font-size="9"
                    font-weight="700"
                    fill="${color}"
                  >
                    ${escapeHtml(
                      relation.label
                    )}
                  </text>
                `
                : ''
            }
          </g>
        `;
      })
      .join('');

  const nodeMarkup =
    [...visibleNodes]
      .map((node) => {
        const [x, y] =
          NODE_POSITIONS[node] ||
          [180, 130];

        const isTarget =
          node === 'skeletal';

        const label =
          node.length > 15
            ? `${node.slice(0, 14)}…`
            : node;

        return `
          <g>
            <circle
              cx="${x}"
              cy="${y}"
              r="${isTarget ? 18 : 12}"
              fill="${
                isTarget
                  ? '#3157d5'
                  : '#ffffff'
              }"
              stroke="${
                isTarget
                  ? '#3157d5'
                  : '#969eaa'
              }"
              stroke-width="1.5"
            />

            <text
              x="${x}"
              y="${y + 3}"
              text-anchor="middle"
              font-size="${
                isTarget
                  ? 8.5
                  : 7.5
              }"
              font-weight="${
                isTarget
                  ? 700
                  : 600
              }"
              fill="${
                isTarget
                  ? '#ffffff'
                  : '#343943'
              }"
            >
              ${escapeHtml(label)}
            </text>
          </g>
        `;
      })
      .join('');

  let stageLabel = '';

  if (stage === 'curriculum') {
    stageLabel =
      'edge width = curriculum opportunity';
  }

  if (stage === 'teacher') {
    stageLabel =
      'edge width = teacher enactment';
  }

  if (stage === 'student') {
    stageLabel =
      'edge width = posterior knowledge';
  }

  svg.innerHTML = `
    <rect
      x="0"
      y="0"
      width="360"
      height="260"
      rx="12"
      fill="#fafbfc"
    />

    ${edgeMarkup}

    ${nodeMarkup}

    <text
      x="180"
      y="251"
      text-anchor="middle"
      font-size="9"
      fill="#777f89"
    >
      ${stageLabel}
    </text>
  `;
}


/* ============================================================
   SELECTED RELATION PANEL
   ============================================================ */

function renderSelectedEdge() {
  const {
    edge,
    local,
    posterior,
  } =
    selectedEdgeSummary(
      state,
      params
    );

  const relation =
    relationById(
      edge.relation
    );

  $('selectedRelationPill').textContent =
    relation.label;

  $('edgeMeaningBox').innerHTML = `
    <strong>
      ${escapeHtml(edge.source)}
      →
      ${escapeHtml(relation.label)}
      →
      ${escapeHtml(edge.target)}
    </strong>

    <br><br>

    ${escapeHtml(
      relation.description
    )}

    <br><br>

    <span class="muted">
      The semantic relation itself comes from the
      teacher-network framework.

      The numeric curriculum, external-prior,
      and learner values in this dashboard are
      synthetic research-demo quantities.
    </span>
  `;

  $('curriculumMetric').textContent =
    local.curriculum.toFixed(3);

  $('teacherMentionsMetric').textContent =
    String(
      local.teacherMentions
    );

  $('studentPosteriorMetric').textContent =
    posterior.mean.toFixed(3);
}


/* ============================================================
   TEACHER-NETWORK PANEL
   ============================================================ */

function renderTeacherRichness() {
  const r =
    teacherRichness(state);

  $('richSize').textContent =
    r.size.toFixed(2);

  $('richVariety').textContent =
    r.variety.toFixed(2);

  $('richRepetition').textContent =
    r.repetition.toFixed(2);

  $('richWeb').textContent =
    r.web.toFixed(2);

  $('richReach').textContent =
    r.reach.toFixed(2);

  $('teacherSummary').innerHTML = `
    <p>
      The current synthetic teacher network contains

      <strong>
        ${r.activeEdges}
        active semantic relations
      </strong>

      and

      <strong>
        ${r.totalMentions}
        total relation mentions.
      </strong>
    </p>

    <p>
      The current illustrative richness composite is

      <strong>
        ${r.composite.toFixed(3)}
      </strong>.
    </p>

    <p>
      This composite is deliberately simple.

      In the actual research program, the better approach is
      likely to preserve the dimensions separately or estimate
      a lower-dimensional latent structure from observed network
      metrics rather than manually averaging them.
    </p>
  `;
}


/* ============================================================
   STUDENT POSTERIOR PANEL
   ============================================================ */

function renderStudentPosterior() {
  const posterior =
    posteriorForEdge(
      state,
      state.selectedEdgeId,
      params
    );

  const local =
    state.edgeStates[
      state.selectedEdgeId
    ];

  /*
  Recover the contextual prior by removing direct learner evidence.
  */
  const priorAlpha =
    posterior.alpha -
    local.positiveEvidence;

  const priorBeta =
    posterior.beta -
    local.negativeEvidence;

  const priorMean =
    priorAlpha /
    (
      priorAlpha +
      priorBeta
    );

  $('priorMean').textContent =
    priorMean.toFixed(3);

  $('posteriorMean').textContent =
    posterior.mean.toFixed(3);

  $('posteriorSd').textContent =
    posterior.sd.toFixed(3);

  $('betaLabel').textContent =
    `Beta(${posterior.alpha.toFixed(2)}, ${posterior.beta.toFixed(2)})`;

  renderBetaChart(
    $('betaChart'),
    posterior.alpha,
    posterior.beta,
    posterior.mean
  );
}


/* ============================================================
   MODEL-DECOMPOSITION PANEL
   ============================================================ */

function renderInferenceBreakdown() {
  const {
    edge,
    local,
    posterior,
  } =
    selectedEdgeSummary(
      state,
      params
    );

  const relation =
    relationById(
      edge.relation
    );

  const priorAlpha =
    posterior.alpha -
    local.positiveEvidence;

  const priorBeta =
    posterior.beta -
    local.negativeEvidence;

  const priorMean =
    priorAlpha /
    (
      priorAlpha +
      priorBeta
    );

  const richness =
    posterior.richness;

  const curriculumTerm =
    params.curriculumWeight *
    local.curriculum;

  const externalTerm =
    params.externalWeight *
    local.external;

  const repetitionTerm =
    params.teacherExposureWeight *
    Math.log1p(
      local.teacherMentions
    );

  const richnessTerm =
    params.teacherRichnessWeight *
    (
      richness.composite -
      0.5
    );

  $('inferenceBreakdown').innerHTML = `
    <table class="compact-table">

      <thead>
        <tr>
          <th>Component</th>
          <th>Current value</th>
          <th>Contribution</th>
        </tr>
      </thead>

      <tbody>

        <tr>
          <td>
            Curriculum opportunity
          </td>

          <td>
            ${local.curriculum.toFixed(2)}
          </td>

          <td>
            ${curriculumTerm.toFixed(3)}
          </td>
        </tr>

        <tr>
          <td>
            External relational prior
          </td>

          <td>
            ${local.external.toFixed(2)}
          </td>

          <td>
            ${externalTerm.toFixed(3)}
          </td>
        </tr>

        <tr>
          <td>
            Teacher repetition
          </td>

          <td>
            ${local.teacherMentions}
            mentions
          </td>

          <td>
            ${repetitionTerm.toFixed(3)}
          </td>
        </tr>

        <tr>
          <td>
            Teacher-network richness
          </td>

          <td>
            ${richness.composite.toFixed(2)}
          </td>

          <td>
            ${richnessTerm.toFixed(3)}
          </td>
        </tr>

      </tbody>
    </table>

    <div class="callout">

      <strong>Selected edge</strong>

      <br>

      ${escapeHtml(edge.source)}
      →
      ${escapeHtml(relation.label)}
      →
      ${escapeHtml(edge.target)}

      <br><br>

      <strong>Semantic prior before teacher effects:</strong>
      ${posterior.baseMean.toFixed(3)}

      <br>

      <strong>Teacher shift on logit scale:</strong>
      ${posterior.teacherShift.toFixed(3)}

      <br>

      <strong>Prior after hierarchical pooling:</strong>
      ${priorMean.toFixed(3)}

      <br>

      <strong>Posterior after learner evidence:</strong>
      ${posterior.mean.toFixed(3)}

      <br>

      <strong>Posterior uncertainty:</strong>
      SD = ${posterior.sd.toFixed(3)}

    </div>
  `;
}


/* ============================================================
   STATE INSPECTOR
   ============================================================ */

function renderInspector() {
  const summary =
    selectedEdgeSummary(
      state,
      params
    );

  const richness =
    teacherRichness(state);

  const posterior =
    summary.posterior;

  const object = {
    architecture: {
      curriculum_graph:
        'opportunities for semantic relations to occur',

      teacher_graph:
        'semantic relations actually instantiated in instruction',

      student_graph:
        'latent posterior probabilities of semantic relations',
    },

    selected_relation: {
      id:
        summary.edge.id,

      source:
        summary.edge.source,

      relation:
        summary.edge.relation,

      target:
        summary.edge.target,
    },

    curriculum: {
      opportunity_strength:
        +summary.local.curriculum.toFixed(4),
    },

    teacher: {
      mentions:
        summary.local.teacherMentions,

      richness: {
        size:
          +richness.size.toFixed(4),

        variety:
          +richness.variety.toFixed(4),

        repetition:
          +richness.repetition.toFixed(4),

        web:
          +richness.web.toFixed(4),

        reach:
          +richness.reach.toFixed(4),

        composite:
          +richness.composite.toFixed(4),
      },
    },

    student: {
      positive_evidence:
        +summary.local.positiveEvidence.toFixed(4),

      negative_evidence:
        +summary.local.negativeEvidence.toFixed(4),

      posterior_alpha:
        +posterior.alpha.toFixed(4),

      posterior_beta:
        +posterior.beta.toFixed(4),

      posterior_mean:
        +posterior.mean.toFixed(4),

      posterior_sd:
        +posterior.sd.toFixed(4),
    },

    model_parameters: {
      ...params,
    },

    model_time:
      state.time,

    status: {
      source_derived:
        'relation taxonomy and conceptual teacher-network dimensions',

      proposed:
        'student edge-level latent graph and Bayesian transition architecture',

      synthetic:
        'numeric strengths, coefficients, priors, and example student observations',
    },
  };

  $('stateInspector').textContent =
    JSON.stringify(
      object,
      null,
      2
    );
}


/* ============================================================
   GLOBAL RENDER
   ============================================================ */

function renderAll() {
  syncParams();

  renderNetwork(
    $('curriculumGraph'),
    'curriculum'
  );

  renderNetwork(
    $('teacherGraph'),
    'teacher'
  );

  renderNetwork(
    $('studentGraph'),
    'student'
  );

  renderSelectedEdge();

  renderTeacherRichness();

  renderStudentPosterior();

  renderInferenceBreakdown();

  renderInspector();
}


/* ============================================================
   TABS
   ============================================================ */

function bindTabs() {
  document
    .querySelectorAll('.tab')
    .forEach((button) => {

      button.addEventListener(
        'click',
        () => {

          document
            .querySelectorAll('.tab')
            .forEach((tab) =>
              tab.classList.remove(
                'active'
              )
            );

          document
            .querySelectorAll(
              '.tab-panel'
            )
            .forEach((panel) =>
              panel.classList.remove(
                'active'
              )
            );

          button.classList.add(
            'active'
          );

          const panel =
            document.querySelector(
              `[data-panel="${button.dataset.tab}"]`
            );

          if (panel) {
            panel.classList.add(
              'active'
            );
          }
        }
      );
    });
}


/* ============================================================
   SELECTED EDGE
   ============================================================ */

$('edgeSelect').addEventListener(
  'change',
  () => {

    state.selectedEdgeId =
      $('edgeSelect').value;

    syncSelectedControl