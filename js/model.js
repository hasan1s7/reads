import {
  betaVariance,
  clamp,
  sigmoid,
} from './math.js';


/* ============================================================
   RELATION TAXONOMY
   ============================================================ */

export const RELATIONS = [

  {

    id:
      'defines',

    label:
      'defines',

    description:
      'Gives a meaning or paraphrase for a concept.',

    color:
      '#315ad8',

  },


  {

    id:
      'category_of',

    label:
      'category of',

    description:
      'Places the concept in a grammatical or conceptual class.',

    color:
      '#8b62c3',

  },


  {

    id:
      'morphologically_from',

    label:
      'morphology',

    description:
      'Connects a word to a base form, root, or affix.',

    color:
      '#b86b16',

  },


  {

    id:
      'exemplifies',

    label:
      'exemplifies',

    description:
      'Connects an abstract concept to a concrete instance.',

    color:
      '#2d8069',

  },


  {

    id:
      'same_pattern_as',

    label:
      'same pattern',

    description:
      'Links words that share an instructional or morphological pattern.',

    color:
      '#94710f',

  },


  {

    id:
      'part_of',

    label:
      'part of',

    description:
      'Places a concept inside a larger whole.',

    color:
      '#8a5d42',

  },


  {

    id:
      'similar_to',

    label:
      'similar to',

    description:
      'Links concepts through analogy or similarity.',

    color:
      '#66709c',

  },


  {

    id:
      'contrasts_with',

    label:
      'contrasts',

    description:
      'Explicitly distinguishes or opposes two concepts.',

    color:
      '#a34d74',

  },

];


/* ============================================================
   DEMONSTRATION SEMANTIC EDGES

   Relation examples are grounded in the READS teacher-talk
   materials.

   Numeric strengths are synthetic demonstration values.
   They are NOT fitted effect sizes.
   ============================================================ */

export const DEMO_EDGES = [

  {

    id:
      'skeletal-defines-thin',

    source:
      'skeletal',

    relation:
      'defines',

    target:
      'thin',

    curriculum:
      0.82,

    external:
      0.58,

    initialMentions:
      3,

  },


  {

    id:
      'skeletal-category-adjective',

    source:
      'skeletal',

    relation:
      'category_of',

    target:
      'adjective',

    curriculum:
      0.76,

    external:
      0.52,

    initialMentions:
      3,

  },


  {

    id:
      'skeletal-exemplifies-legs',

    source:
      'skeletal',

    relation:
      'exemplifies',

    target:
      'skeletal legs',

    curriculum:
      0.66,

    external:
      0.35,

    initialMentions:
      2,

  },


  {

    id:
      'skeletal-morph-al',

    source:
      'skeletal',

    relation:
      'morphologically_from',

    target:
      '-al suffix',

    curriculum:
      0.70,

    external:
      0.62,

    initialMentions:
      2,

  },


  {

    id:
      'skeletal-pattern-magical',

    source:
      'skeletal',

    relation:
      'same_pattern_as',

    target:
      'magical',

    curriculum:
      0.52,

    external:
      0.47,

    initialMentions:
      1,

  },


  {

    id:
      'skeletal-system-part-body',

    source:
      'skeletal system',

    relation:
      'part_of',

    target:
      'body',

    curriculum:
      0.71,

    external:
      0.68,

    initialMentions:
      1,

  },


  {

    id:
      'magical-morph-magic',

    source:
      'magical',

    relation:
      'morphologically_from',

    target:
      'magic',

    curriculum:
      0.49,

    external:
      0.67,

    initialMentions:
      1,

  },


  {

    id:
      'system-part-skeletal',

    source:
      'skeletal system',

    relation:
      'part_of',

    target:
      'system',

    curriculum:
      0.63,

    external:
      0.55,

    initialMentions:
      2,

  },

];


/* ============================================================
   EVIDENCE WEIGHTS
   ============================================================ */

export const RESPONSE_WEIGHTS = {

  recognition:
    0.55,

  short:
    0.90,

  explanation:
    1.15,

  transfer:
    1.40,

};


/* ============================================================
   DEFAULT MODEL PARAMETERS
   ============================================================ */

export const DEFAULT_PARAMS = {

  /*
  Baseline log-odds for possessing a relation.
  */
  intercept:
    -1.15,


  /*
  Contribution from the curriculum opportunity graph.
  */
  curriculumWeight:
    1.25,


  /*
  Optional external relational knowledge contribution.
  */
  externalWeight:
    0.55,


  /*
  Contribution from direct teacher enactment / repetition.
  */
  teacherExposureWeight:
    0.42,


  /*
  Contribution from the larger teacher-network structure.
  */
  teacherRichnessWeight:
    0.60,


  /*
  Controls prior certainty before student evidence.
  */
  priorConcentration:
    3.5,


  /*
  Simplified partial pooling strength.
  */
  edgePooling:
    0.35,


  /*
  Population semantic-edge mean.
  */
  populationEdgeMean:
    0.50,

};


/* ============================================================
   CREATE INITIAL STATE
   ============================================================ */

export function createState() {

  const edgeStates = {};


  for (
    const edge of DEMO_EDGES
  ) {

    edgeStates[
      edge.id
    ] = {

      curriculum:
        edge.curriculum,

      external:
        edge.external,

      teacherMentions:
        edge.initialMentions,

      positiveEvidence:
        0,

      negativeEvidence:
        0,

      history:
        [],

    };

  }


  return {

    selectedEdgeId:
      DEMO_EDGES[0].id,


    /*
    The currently visible network layer.
    */
    stage:
      'curriculum',


    edgeStates,


    /*
    Counts interactions in the simulator.
    */
    eventIndex:
      0,

  };

}


/* ============================================================
   LOOKUPS
   ============================================================ */

export function edgeById(
  edgeId
) {

  return (

    DEMO_EDGES.find(
      (edge) =>
        edge.id ===
        edgeId
    )

    ||

    DEMO_EDGES[0]

  );

}


export function relationById(
  relationId
) {

  return (

    RELATIONS.find(
      (relation) =>
        relation.id ===
        relationId
    )

    ||

    RELATIONS[0]

  );

}


/* ============================================================
   TEACHER NETWORK METRICS

   These are deliberately transparent demo operationalizations.

   They are not validated scales.

   The eventual research model should estimate or validate
   these dimensions empirically.
   ============================================================ */

export function teacherNetworkMetrics(
  state
) {

  const active =

    DEMO_EDGES.filter(
      (edge) =>

        state.edgeStates[
          edge.id
        ].teacherMentions >

        0
    );


  const nodes =
    new Set();


  const relationTypes =
    new Set();


  let totalMentions =
    0;


  let peripheralEdges =
    0;


  let generativeEdges =
    0;


  for (
    const edge of active
  ) {

    const mentions =

      state.edgeStates[
        edge.id
      ].teacherMentions;


    nodes.add(
      edge.source
    );


    nodes.add(
      edge.target
    );


    relationTypes.add(
      edge.relation
    );


    totalMentions +=
      mentions;


    /*
    Rough "web" indicator:
    is the graph more than a star around skeletal?
    */

    if (

      edge.source !==
      'skeletal'

      &&

      edge.target !==
      'skeletal'

    ) {

      peripheralEdges +=
        1;

    }


    /*
    Rough generativity / reach indicator.
    */

    if (

      [
        'same_pattern_as',
        'morphologically_from',
      ].includes(
        edge.relation
      )

    ) {

      generativeEdges +=
        1;

    }

  }


  /*
  Conceptual breadth.
  */

  const size =

    clamp(

      nodes.size /
      11,

      0,

      1

    );


  /*
  Relation-type diversity.
  */

  const variety =

    clamp(

      relationTypes.size /
      6,

      0,

      1

    );


  /*
  Mean repeated exposure across active edges.
  */

  const repetition =

    active.length

      ? clamp(

          (

            totalMentions /
            active.length

            -

            1

          ) /

          3,

          0,

          1

        )

      : 0;


  /*
  Interconnectedness outside the focal node.
  */

  const web =

    active.length

      ? clamp(

          (

            peripheralEdges /
            active.length

          ) *

          1.8,

          0,

          1

        )

      : 0;


  /*
  Potential for one relation to unlock another.
  */

  const reach =

    active.length

      ? clamp(

          (

            generativeEdges /
            active.length

          ) *

          2.2,

          0,

          1

        )

      : 0;


  /*
  Temporary composite used only in the prototype.

  A real analysis should probably preserve the components
  separately or estimate a latent factor.
  */

  const composite =

    (

      size +

      variety +

      repetition +

      web +

      reach

    ) /

    5;


  return {

    size,

    variety,

    repetition,

    web,

    reach,

    composite,

    activeEdges:
      active.length,

    totalMentions,

  };

}


/* ============================================================
   CONTEXTUAL PRIOR FOR ONE STUDENT RELATION
   ============================================================ */

export function priorForEdge(

  state,

  edgeId,

  params =
    DEFAULT_PARAMS

) {

  const edge =
    edgeById(
      edgeId
    );


  const local =
    state.edgeStates[
      edge.id
    ];


  const richness =
    teacherNetworkMetrics(
      state
    );


  /* ----------------------------------------------------------
     CURRICULUM + EXTERNAL SEMANTIC CONTEXT

     logit(pi_e)

       = intercept
       + beta_C * curriculum_e
       + beta_X * external_e
     ---------------------------------------------------------- */

  const semanticLogit =

    params.intercept

    +

    params.curriculumWeight *
    local.curriculum

    +

    params.externalWeight *
    local.external;


  /* ----------------------------------------------------------
     TEACHER ENACTMENT

     log(1 + mentions) gives diminishing returns to repetition.
     ---------------------------------------------------------- */

  const teacherShift =

    params.teacherExposureWeight *

    Math.log1p(
      local.teacherMentions
    )

    +

    params.teacherRichnessWeight *

    (
      richness.composite

      -

      0.5
    );


  /* ----------------------------------------------------------
     LOCAL EDGE PROBABILITY
     ---------------------------------------------------------- */

  const localMean =

    sigmoid(

      semanticLogit

      +

      teacherShift

    );


  /* ----------------------------------------------------------
     HIERARCHICAL PARTIAL POOLING

     pi_tilde_e

       = (1 - tau) * pi_e
       + tau * mu_population
     ---------------------------------------------------------- */

  const pooledMean =

    (

      1 -
      params.edgePooling

    ) *

    localMean

    +

    params.edgePooling *

    params.populationEdgeMean;


  const mean =

    clamp(

      pooledMean,

      0.01,

      0.99

    );


  /*
  More teacher exposure modestly increases the concentration
  of the contextual prior.

  Teacher behavior still does NOT count as direct student
  assessment evidence.
  */

  const concentration =

    params.priorConcentration

    +

    0.35 *

    local.teacherMentions;


  return {

    edge,

    mean,


    alpha:

      mean *

      concentration,


    beta:

      (

        1 -
        mean

      ) *

      concentration,


    concentration,


    semanticMean:

      sigmoid(
        semanticLogit
      ),


    teacherShift,


    richness,

  };

}


/* ============================================================
   STUDENT POSTERIOR
   ============================================================ */

export function posteriorForEdge(

  state,

  edgeId,

  params =
    DEFAULT_PARAMS

) {

  const prior =

    priorForEdge(

      state,

      edgeId,

      params

    );


  const local =

    state.edgeStates[
      prior.edge.id
    ];


  /*
  Conjugate fractional evidence update.

  alpha' = alpha + positive evidence
  beta'  = beta  + negative evidence
  */

  const alpha =

    prior.alpha

    +

    local.positiveEvidence;


  const beta =

    prior.beta

    +

    local.negativeEvidence;


  const mean =

    alpha /

    (
      alpha +
      beta
    );


  const variance =

    betaVariance(

      alpha,

      beta

    );


  return {

    ...prior,

    alpha,

    beta,

    mean,


    sd:

      Math.sqrt(
        variance
      ),


    evidenceMass:

      local.positiveEvidence

      +

      local.negativeEvidence,

  };

}


/* ============================================================
   STUDENT EVIDENCE WEIGHT
   ============================================================ */

export function evidenceWeight({

  responseType,

  hints = 0,

  difficulty = 0.5,

}) {

  const base =

    RESPONSE_WEIGHTS[
      responseType
    ]

    ??

    RESPONSE_WEIGHTS.short;


  /*
  More hints reduce evidential strength.
  */

  const hintFactor =

    hints === 0

      ? 1

      : hints === 1

        ? 0.74

        : 0.48;


  /*
  Harder tasks receive a modest evidential boost.
  */

  const difficultyFactor =

    0.78

    +

    0.44 *

    clamp(

      Number(
        difficulty
      ),

      0,

      1

    );


  return (

    base

    *

    hintFactor

    *

    difficultyFactor

  );

}


/* ============================================================
   APPLY STUDENT EVIDENCE
   ============================================================ */

export function applyStudentEvidence(

  state,

  edgeId,

  observation

) {

  const edge =
    edgeById(
      edgeId
    );


  const local =

    state.edgeStates[
      edge.id
    ];


  const weight =

    evidenceWeight(
      observation
    );


  if (
    observation.correct
  ) {

    local.positiveEvidence +=
      weight;

  } else {

    local.negativeEvidence +=
      weight;

  }


  state.eventIndex +=
    1;


  local.history.push({

    ...observation,

    weight,

    eventIndex:
      state.eventIndex,

  });


  return weight;

}


/* ============================================================
   CHANGE TEACHER EXPOSURE
   ============================================================ */

export function changeTeacherMentions(

  state,

  edgeId,

  amount

) {

  const edge =
    edgeById(
      edgeId
    );


  const local =

    state.edgeStates[
      edge.id
    ];


  local.teacherMentions =

    clamp(

      local.teacherMentions

      +

      amount,

      0,

      20

    );


  state.eventIndex +=
    1;


  return local.teacherMentions;

}


/* ============================================================
   SET EXTERNAL SEMANTIC PRIOR STRENGTH
   ============================================================ */

export function setEdgeExternal(

  state,

  edgeId,

  value

) {

  const edge =
    edgeById(
      edgeId
    );


  state.edgeStates[
    edge.id
  ].external =

    clamp(

      Number(
        value
      ),

      0,

      1

    );

}


/* ============================================================
   CREATE THE VIEW-SPECIFIC EDGE SET
   ============================================================ */

export function graphEdges(

  state,

  stage,

  params =
    DEFAULT_PARAMS

) {

  return DEMO_EDGES.map(
    (edge) => {

      const local =

        state.edgeStates[
          edge.id
        ];


      /*
      Curriculum view:
      opportunity strength.
      */

      let strength =
        local.curriculum;


      /*
      Teacher view:
      enactment / repetition strength.
      */

      if (
        stage ===
        'teacher'
      ) {

        strength =

          clamp(

            local.teacherMentions /
            5,

            0,

            1

          );

      }


      /*
      Student view:
      posterior latent knowledge probability.
      */

      if (
        stage ===
        'student'
      ) {

        strength =

          posteriorForEdge(

            state,

            edge.id,

            params

          ).mean;

      }


      return {

        ...edge,

        strength,

      };

    }
  );

}


/* ============================================================
   SELECTED EDGE SUMMARY
   ============================================================ */

export function selectedSummary(

  state,

  params =
    DEFAULT_PARAMS

) {

  const edge =
    edgeById(
      state.selectedEdgeId
    );


  return {

    edge,


    relation:

      relationById(
        edge.relation
      ),


    local:

      state.edgeStates[
        edge.id
      ],


    posterior:

      posteriorForEdge(

        state,

        edge.id,

        params

      ),

  };

}
