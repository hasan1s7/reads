import { betaPdf, clamp } from './math.js';

import {
  DEFAULT_PARAMS,
  DEMO_EDGES,
  applyStudentEvidence,
  changeTeacherMentions,
  createState,
  graphEdges,
  relationById,
  selectedSummary,
  setEdgeExternal,
  teacherNetworkMetrics,
} from './model.js';


const $ = (id) =>
  document.getElementById(id);


let state =
  createState();


let params = {
  ...DEFAULT_PARAMS,
};


let toastTimer = null;


/* ============================================================
   FIXED NETWORK GEOMETRY
   ============================================================ */

const NODE_POSITIONS = {

  skeletal: [380, 275],

  thin: [155, 165],

  adjective: [150, 340],

  'skeletal legs': [335, 480],

  '-al suffix': [600, 135],

  magical: [615, 300],

  'skeletal system': [390, 80],

  body: [610, 455],

  magic: [690, 360],

  system: [150, 80],

};


/* ============================================================
   COPY FOR THE THREE NETWORK LAYERS
   ============================================================ */

const STAGE_COPY = {

  curriculum: {

    eyebrow:
      'Curriculum layer',

    title:
      'Opportunity to learn',

    description:
      'Edge strength represents how available each relation is in the instructional materials.',

    color:
      '#315ad8',

    soft:
      '#e8edff',

  },


  teacher: {

    eyebrow:
      'Teacher layer',

    title:
      'Enacted semantic network',

    description:
      'Edge strength represents how strongly the relation is instantiated and repeated in teacher talk.',

    color:
      '#b86b16',

    soft:
      '#fff1df',

  },


  student: {

    eyebrow:
      'Student layer',

    title:
      'Latent knowledge network',

    description:
      'Edge strength represents the posterior probability that the student possesses or can use the relation.',

    color:
      '#2d8069',

    soft:
      '#e7f4ef',

  },

};


/* ============================================================
   SMALL UTILITIES
   ============================================================ */

function escapeHtml(value) {

  return String(value).replace(

    /[&<>'"]/g,

    (char) => ({

      '&': '&amp;',

      '<': '&lt;',

      '>': '&gt;',

      "'": '&#39;',

      '"': '&quot;',

    })[char]

  );

}


function escapeXml(value) {

  return escapeHtml(value);

}


function showToast(message) {

  const toast =
    $('toast');


  toast.textContent =
    message;


  toast.classList.add(
    'show'
  );


  clearTimeout(
    toastTimer
  );


  toastTimer =
    setTimeout(
      () =>
        toast.classList.remove(
          'show'
        ),

      1500
    );

}


/* ============================================================
   TRANSLATE POSTERIOR UNCERTAINTY INTO A FRIENDLY LABEL
   ============================================================ */

function confidenceFromSd(sd) {

  /*
  Rough display mapping only.

  Beta SD around 0.25 = relatively broad.
  Beta SD near 0.08 = comparatively concentrated.
  */

  const score =
    clamp(

      1 -
      (
        sd -
        0.07
      ) /
      0.20,

      0,

      1

    );


  const label =

    score > 0.72

      ? 'high'

      : score > 0.42

        ? 'medium'

        : 'low';


  return {

    score,

    label,

  };

}


/* ============================================================
   EDGE LIST
   ============================================================ */

function renderEdgeList() {

  $('edgeList').innerHTML =

    DEMO_EDGES
      .map((edge) => {

        const relation =
          relationById(
            edge.relation
          );


        const active =

          edge.id ===
          state.selectedEdgeId

            ? 'active'

            : '';


        return `

          <button

            class="edge-row ${active}"

            data-edge-id="${edge.id}"

            type="button"

          >

            <div class="relation">

              <span

                class="relation-dot"

                style="background:${relation.color}"

              ></span>

              ${escapeHtml(
                relation.label
              )}

            </div>


            <div class="triple">

              ${escapeHtml(
                edge.source
              )}

              →

              ${escapeHtml(
                edge.target
              )}

            </div>

          </button>

        `;

      })
      .join('');


  document
    .querySelectorAll(
      '.edge-row'
    )
    .forEach(
      (button) => {

        button.addEventListener(
          'click',

          () => {

            state.selectedEdgeId =
              button.dataset.edgeId;


            syncSelectedEdgeControls();


            renderAll();

          }
        );

      }
    );

}


/* ============================================================
   STAGE HEADER
   ============================================================ */

function renderStageHeader() {

  const copy =
    STAGE_COPY[
      state.stage
    ];


  $('stageEyebrow').textContent =
    copy.eyebrow;


  $('stageTitle').textContent =
    copy.title;


  $('stageDescription').textContent =
    copy.description;


  document
    .querySelectorAll(
      '.seg-btn'
    )
    .forEach(
      (button) => {

        button.classList.toggle(

          'active',

          button.dataset.stage ===
          state.stage

        );

      }
    );

}


/* ============================================================
   NODE RENDERER
   ============================================================ */

function labelBox(node) {

  const [x, y] =

    NODE_POSITIONS[node] ||

    [380, 275];


  const main =
    node === 'skeletal';


  const width =

    Math.max(

      62,

      Math.min(

        132,

        node.length *
        7.2 +
        22

      )

    );


  const height =

    main

      ? 38

      : 30;


  const fill =

    main

      ? '#171916'

      : '#fffefa';


  const stroke =

    main

      ? '#171916'

      : '#cfd1ca';


  const text =

    main

      ? '#ffffff'

      : '#242721';


  return `

    <g

      transform="translate(

        ${x - width / 2},

        ${y - height / 2}

      )"

    >

      <rect

        width="${width}"

        height="${height}"

        rx="${main ? 13 : 11}"

        fill="${fill}"

        stroke="${stroke}"

        stroke-width="1.2"

      />


      <text

        x="${width / 2}"

        y="${height / 2 + 4}"

        text-anchor="middle"

        font-size="${
          main
            ? 13
            : 11.5
        }"

        font-weight="${
          main
            ? 760
            : 650
        }"

        fill="${text}"

      >

        ${escapeXml(node)}

      </text>

    </g>

  `;

}


/* ============================================================
   SELECTED EDGE LABEL
   ============================================================ */

function edgeLabel(edge) {

  const [x1, y1] =

    NODE_POSITIONS[
      edge.source
    ] ||

    [380, 275];


  const [x2, y2] =

    NODE_POSITIONS[
      edge.target
    ] ||

    [380, 275];


  const relation =
    relationById(
      edge.relation
    );


  const mx =
    (x1 + x2) / 2;


  const my =
    (y1 + y2) / 2;


  const width =

    Math.max(

      72,

      relation.label.length *
      7.2 +
      24

    );


  return `

    <g

      transform="translate(

        ${mx - width / 2},

        ${my - 13}

      )"

      pointer-events="none"

    >

      <rect

        width="${width}"

        height="24"

        rx="12"

        fill="#fffefa"

        stroke="${relation.color}"

        stroke-width="1.2"

      />


      <text

        x="${width / 2}"

        y="16"

        text-anchor="middle"

        font-size="10.5"

        font-weight="760"

        fill="${relation.color}"

      >

        ${escapeXml(
          relation.label
        )}

      </text>

    </g>

  `;

}


/* ============================================================
   MAIN NETWORK
   ============================================================ */

function renderNetwork() {

  const svg =
    $('networkSvg');


  const copy =
    STAGE_COPY[
      state.stage
    ];


  const edges =
    graphEdges(

      state,

      state.stage,

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

          NODE_POSITIONS[
            edge.source
          ] ||

          [380, 275];


        const [x2, y2] =

          NODE_POSITIONS[
            edge.target
          ] ||

          [380, 275];


        visibleNodes.add(
          edge.source
        );


        visibleNodes.add(
          edge.target
        );


        const selected =

          edge.id ===
          selectedId;


        const relation =
          relationById(
            edge.relation
          );


        const stroke =

          selected

            ? relation.color

            : copy.color;


        const width =

          selected

            ? 3.4 +
              edge.strength *
              6

            : 1.2 +
              edge.strength *
              4.2;


        const opacity =

          selected

            ? 0.98

            : 0.15 +
              edge.strength *
              0.48;


        return `

          <g

            data-edge-group="${edge.id}"

          >

            <line

              x1="${x1}"

              y1="${y1}"

              x2="${x2}"

              y2="${y2}"

              stroke="${stroke}"

              stroke-width="${width.toFixed(2)}"

              opacity="${opacity.toFixed(2)}"

              stroke-linecap="round"

            />


            <line

              class="edge-hit"

              data-edge-id="${edge.id}"

              x1="${x1}"

              y1="${y1}"

              x2="${x2}"

              y2="${y2}"

              stroke="transparent"

              stroke-width="20"

              style="cursor:pointer"

            />

          </g>

        `;

      })
      .join('');


  const nodeMarkup =

    [...visibleNodes]
      .map(
        labelBox
      )
      .join('');


  const selectedEdge =

    edges.find(
      (edge) =>
        edge.id ===
        selectedId
    );


  svg.innerHTML = `

    <defs>

      <filter

        id="softShadow"

        x="-30%"

        y="-30%"

        width="160%"

        height="160%"

      >

        <feDropShadow

          dx="0"

          dy="4"

          stdDeviation="6"

          flood-color="#11130f"

          flood-opacity="0.08"

        />

      </filter>

    </defs>


    <rect

      x="0"

      y="0"

      width="760"

      height="560"

      fill="#fffefa"

    />


    <circle

      cx="380"

      cy="275"

      r="170"

      fill="${copy.soft}"

      opacity="0.34"

    />


    ${edgeMarkup}


    <g

      filter="url(#softShadow)"

    >

      ${nodeMarkup}

    </g>


    ${
      selectedEdge

        ? edgeLabel(
            selectedEdge
          )

        : ''
    }

  `;


  svg
    .querySelectorAll(
      '.edge-hit'
    )
    .forEach(
      (line) => {

        line.addEventListener(
          'click',

          () => {

            state.selectedEdgeId =
              line.dataset.edgeId;


            syncSelectedEdgeControls();


            renderAll();

          }
        );

      }
    );


  const stageName =

    state.stage ===
    'curriculum'

      ? 'opportunity'

      : state.stage ===
        'teacher'

        ? 'enactment'

        : 'posterior';


  $('networkLegend').innerHTML = `

    <span>

      <span

        class="legend-swatch"

        style="background:${copy.color}"

      ></span>

      line width =
      ${stageName}
      strength

    </span>


    <span>

      selected edge uses its relation color

    </span>

  `;

}


/* ============================================================
   SELECTED EDGE INSPECTOR
   ============================================================ */

function renderInspector() {

  const {

    edge,

    relation,

    local,

    posterior,

  } =
    selectedSummary(
      state,
      params
    );


  const confidence =
    confidenceFromSd(
      posterior.sd
    );


  $('relationType').textContent =
    relation.label;


  document
    .querySelector(
      '.inspector .relation-dot'
    )
    .style.background =
      relation.color;


  $('edgeTitle').textContent =
    `${edge.source} → ${edge.target}`;


  $('edgeDescription').textContent =
    relation.description;


  $('metricCurriculum').textContent =
    local.curriculum.toFixed(
      2
    );


  $('metricTeacher').textContent =
    String(
      local.teacherMentions
    );


  $('metricStudent').textContent =
    posterior.mean.toFixed(
      2
    );


  $('metricSd').textContent =
    posterior.sd.toFixed(
      2
    );


  $('confidenceLabel').textContent =
    confidence.label;


  $('confidenceBar').style.width =
    `${Math.round(
      confidence.score *
      100
    )}%`;

}


/* ============================================================
   TEACHER PANEL
   ============================================================ */

function renderTeacherPanel() {

  const {
    local,
  } =
    selectedSummary(
      state,
      params
    );


  const metrics =
    teacherNetworkMetrics(
      state
    );


  $('teacherCount').textContent =
    String(
      local.teacherMentions
    );


  $('teacherSize').textContent =
    metrics.size.toFixed(
      2
    );


  $('teacherVariety').textContent =
    metrics.variety.toFixed(
      2
    );


  $('teacherRepetition').textContent =
    metrics.repetition.toFixed(
      2
    );

}


/* ============================================================
   BETA POSTERIOR CHART
   ============================================================ */

function renderBetaChart() {

  const {
    posterior,
  } =
    selectedSummary(
      state,
      params
    );


  const svg =
    $('betaSvg');


  const W = 360;

  const H = 190;

  const left = 22;

  const right = 16;

  const top = 20;

  const bottom = 28;


  const points = [];


  let maxY = 0;


  for (
    let i = 1;
    i < 100;
    i += 1
  ) {

    const x =
      i / 100;


    const y =
      betaPdf(

        x,

        posterior.alpha,

        posterior.beta

      );


    points.push({

      x,

      y,

    });


    if (
      Number.isFinite(y)
    ) {

      maxY =
        Math.max(
          maxY,
          y
        );

    }

  }


  maxY =
    Math.max(
      maxY,
      1e-6
    );


  const sx =

    (x) =>

      left +

      x *

      (
        W -
        left -
        right
      );


  const sy =

    (y) =>

      H -
      bottom -

      (
        y /
        maxY
      ) *

      (
        H -
        top -
        bottom
      );


  const path =

    points
      .map(
        (p, i) =>

          `${
            i
              ? 'L'
              : 'M'
          }${
            sx(p.x).toFixed(1)
          },${
            sy(p.y).toFixed(1)
          }`
      )
      .join(' ');


  const meanX =
    sx(
      posterior.mean
    );


  const area =

    `${path}

     L ${sx(0.99).toFixed(1)},${H - bottom}

     L ${sx(0.01).toFixed(1)},${H - bottom}

     Z`;


  let ticks = '';


  [
    0,
    0.25,
    0.5,
    0.75,
    1,
  ].forEach(
    (v) => {

      const x =
        sx(v);


      ticks += `

        <line

          x1="${x}"

          y1="${top}"

          x2="${x}"

          y2="${H - bottom}"

          stroke="#e7e6e0"

          stroke-width="1"

        />

      `;


      ticks += `

        <text

          x="${x}"

          y="${H - 8}"

          text-anchor="middle"

          font-size="10"

          fill="#8c9089"

        >

          ${v.toFixed(2)}

        </text>

      `;

    }
  );


  svg.innerHTML = `

    ${ticks}


    <path

      d="${area}"

      fill="#e7f4ef"

      opacity="0.9"

    />


    <path

      d="${path}"

      fill="none"

      stroke="#2d8069"

      stroke-width="2.5"

    />


    <line

      x1="${meanX}"

      y1="${top}"

      x2="${meanX}"

      y2="${H - bottom}"

      stroke="#171916"

      stroke-width="1.4"

      stroke-dasharray="4 4"

    />


    <text

      x="${
        Math.min(
          meanX + 7,
          W - 78
        )
      }"

      y="${top + 12}"

      font-size="10"

      font-weight="700"

      fill="#171916"

    >

      mean
      ${posterior.mean.toFixed(2)}

    </text>

  `;

}


/* ============================================================
   POSTERIOR READOUT
   ============================================================ */

function renderPosteriorReadout() {

  const {

    local,

    posterior,

  } =
    selectedSummary(
      state,
      params
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


  $('priorMean').textContent =
    priorMean.toFixed(
      2
    );


  $('posteriorMean').textContent =
    posterior.mean.toFixed(
      2
    );


  $('evidenceMass').textContent =
    posterior.evidenceMass.toFixed(
      2
    );


  if (
    posterior.evidenceMass ===
    0
  ) {

    $('posteriorExplanation').textContent =

      'No direct student evidence yet. The current belief comes only from curriculum opportunity, teacher enactment, the optional external prior, and hierarchical pooling.';

  } else {

    const direction =

      local.positiveEvidence >=
      local.negativeEvidence

        ? 'toward possession of the relation'

        : 'away from possession of the relation';


    $('posteriorExplanation').textContent =

      `Direct assessment evidence has now shifted the contextual prior ${direction}. The posterior still carries uncertainty rather than collapsing to known / unknown.`;

  }


  renderBetaChart();

}


/* ============================================================
   ADVANCED PANEL
   ============================================================ */

function renderAdvanced() {

  const {
    local,
  } =
    selectedSummary(
      state,
      params
    );


  $('curriculumWeightValue').textContent =
    Number(
      params.curriculumWeight
    ).toFixed(
      2
    );


  $('externalWeightValue').textContent =
    Number(
      params.externalWeight
    ).toFixed(
      2
    );


  $('teacherWeightValue').textContent =
    Number(
      params.teacherExposureWeight
    ).toFixed(
      2
    );


  $('richnessWeightValue').textContent =
    Number(
      params.teacherRichnessWeight
    ).toFixed(
      2
    );


  $('poolingWeightValue').textContent =
    Number(
      params.edgePooling
    ).toFixed(
      2
    );


  $('externalStrengthValue').textContent =
    Number(
      local.external
    ).toFixed(
      2
    );


  $('externalStrength').value =
    local.external;


  const summary =
    selectedSummary(
      state,
      params
    );


  const metrics =
    teacherNetworkMetrics(
      state
    );


  $('stateInspector').textContent =

    JSON.stringify(

      {

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


        layer_values: {

          curriculum_opportunity:
            +summary.local.curriculum.toFixed(4),

          teacher_mentions:
            summary.local.teacherMentions,

          student_posterior_mean:
            +summary.posterior.mean.toFixed(4),

          student_posterior_sd:
            +summary.posterior.sd.toFixed(4),

        },


        student_evidence: {

          positive:
            +summary.local.positiveEvidence.toFixed(4),

          negative:
            +summary.local.negativeEvidence.toFixed(4),

          observations:
            summary.local.history,

        },


        teacher_network_demo_metrics:

          Object.fromEntries(

            Object.entries(
              metrics
            ).map(

              ([key, value]) => [

                key,

                typeof value ===
                'number'

                  ? +value.toFixed(4)

                  : value,

              ]

            )

          ),


        posterior: {

          alpha:
            +summary.posterior.alpha.toFixed(4),

          beta:
            +summary.posterior.beta.toFixed(4),

          mean:
            +summary.posterior.mean.toFixed(4),

          sd:
            +summary.posterior.sd.toFixed(4),

        },


        parameters:
          params,


        note:

          'Relation examples and teacher-network concepts are source-derived. Numeric strengths and the student edge model are synthetic/proposed.',

      },

      null,

      2

    );

}


/* ============================================================
   SYNC SELECTED EDGE CONTROLS
   ============================================================ */

function syncSelectedEdgeControls() {

  const {
    local,
  } =
    selectedSummary(
      state,
      params
    );


  $('externalStrength').value =
    local.external;


  $('externalStrengthValue').textContent =
    local.external.toFixed(
      2
    );

}


/* ============================================================
   RENDER EVERYTHING
   ============================================================ */

function renderAll() {

  renderEdgeList();

  renderStageHeader();

  renderNetwork();

  renderInspector();

  renderTeacherPanel();

  renderPosteriorReadout();

  renderAdvanced();

}


/* ============================================================
   EVENT BINDINGS
   ============================================================ */

function bindEvents() {

  /* ----------------------------------------------------------
     SWITCH NETWORK LAYER
     ---------------------------------------------------------- */

  document
    .querySelectorAll(
      '.seg-btn'
    )
    .forEach(
      (button) => {

        button.addEventListener(
          'click',

          () => {

            state.stage =
              button.dataset.stage;


            renderAll();

          }
        );

      }
    );


  /* ----------------------------------------------------------
     DECREASE TEACHER EXPOSURE
     ---------------------------------------------------------- */

  $('teacherMinus').addEventListener(

    'click',

    () => {

      changeTeacherMentions(

        state,

        state.selectedEdgeId,

        -1

      );


      state.stage =
        'teacher';


      renderAll();

    }

  );


  /* ----------------------------------------------------------
     INCREASE TEACHER EXPOSURE
     ---------------------------------------------------------- */

  $('teacherPlus').addEventListener(

    'click',

    () => {

      changeTeacherMentions(

        state,

        state.selectedEdgeId,

        1

      );


      state.stage =
        'teacher';


      renderAll();

    }

  );


  /* ----------------------------------------------------------
     ADD STUDENT EVIDENCE
     ---------------------------------------------------------- */

  document
    .querySelectorAll(
      '[data-evidence]'
    )
    .forEach(
      (button) => {

        button.addEventListener(
          'click',

          () => {

            const responseType =
              button.dataset.evidence;


            const correct =

              Number(
                button.dataset.correct
              ) ===
              1;


            const hints =

              Number(
                $('hintsSelect').value
              );


            const difficulty =

              Number(
                $('difficultyRange').value
              );


            const weight =

              applyStudentEvidence(

                state,

                state.selectedEdgeId,

                {

                  responseType,

                  correct,

                  hints,

                  difficulty,

                }

              );


            state.stage =
              'student';


            renderAll();


            showToast(

              `${
                correct
                  ? 'Positive'
                  : 'Negative'
              } evidence +${weight.toFixed(2)}`

            );

          }
        );

      }
    );


  /* ----------------------------------------------------------
     DIFFICULTY DISPLAY
     ---------------------------------------------------------- */

  $('difficultyRange')
    .addEventListener(

      'input',

      () => {

        $('difficultyValue').textContent =

          Number(
            $('difficultyRange').value
          ).toFixed(
            2
          );

      }

    );


  /* ----------------------------------------------------------
     ADVANCED MODEL SLIDERS
     ---------------------------------------------------------- */

  const paramBindings = [

    [
      'curriculumWeight',
      'curriculumWeight',
    ],

    [
      'externalWeight',
      'externalWeight',
    ],

    [
      'teacherWeight',
      'teacherExposureWeight',
    ],

    [
      'richnessWeight',
      'teacherRichnessWeight',
    ],

    [
      'poolingWeight',
      'edgePooling',
    ],

  ];


  paramBindings.forEach(

    ([id, key]) => {

      $(id).addEventListener(

        'input',

        () => {

          params[key] =
            Number(
              $(id).value
            );


          renderAll();

        }

      );

    }

  );


  /* ----------------------------------------------------------
     EXTERNAL RELATIONAL PRIOR STRENGTH
     ---------------------------------------------------------- */

  $('externalStrength')
    .addEventListener(

      'input',

      () => {

        setEdgeExternal(

          state,

          state.selectedEdgeId,

          $('externalStrength').value

        );


        renderAll();

      }

    );


  /* ----------------------------------------------------------
     RESET
     ---------------------------------------------------------- */

  $('resetBtn')
    .addEventListener(

      'click',

      () => {

        state =
          createState();


        params = {
          ...DEFAULT_PARAMS,
        };


        $('difficultyRange').value =
          0.5;


        $('difficultyValue').textContent =
          '0.50';


        $('hintsSelect').value =
          '0';


        $('curriculumWeight').value =
          params.curriculumWeight;


        $('externalWeight').value =
          params.externalWeight;


        $('teacherWeight').value =
          params.teacherExposureWeight;


        $('richnessWeight').value =
          params.teacherRichnessWeight;


        $('poolingWeight').value =
          params.edgePooling;


        syncSelectedEdgeControls();


        renderAll();


        showToast(
          'Simulation reset'
        );

      }

    );

}


/* ============================================================
   INITIALIZE
   ============================================================ */

bindEvents();

syncSelectedEdgeControls();

renderAll();
