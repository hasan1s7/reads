import {
  betaVariance,
  clamp,
  sigmoid,
} from './math.js';


/* ============================================================
   RELATION TAXONOMY

   These relation types are based on the READS teacher-talk
   framework.

   The dashboard does NOT treat every relation as equivalent.
   Relation type can eventually become a hierarchical effect
   in the full statistical model.
   ============================================================ */

export const RELATIONS = [

  {
    id: 'defines',

    label: 'defines',

    description:
      'Gives a meaning, definition, or paraphrase for a concept.',
  },

  {
    id: 'category_of',

    label: 'category of',

    description:
      'Places the concept into a category or identifies its grammatical / conceptual class.',
  },

  {
    id: 'morphologically_from',

    label: 'morphologically from',

    description:
      'Connects a derived word to a base form, root, or affix.',
  },

  {
    id: 'exemplifies',

    label: 'exemplifies',

    description:
      'Connects an abstract concept to a concrete instance or example.',
  },

  {
    id: 'same_pattern_as',

    label: 'same pattern as',

    description:
      'Connects concepts that share a morphological, semantic, or instructional pattern.',
  },

  {
    id: 'part_of',

    label: 'part of',

    description:
      'Places one concept inside a larger conceptual or physical whole.',
  },

  {
    id: 'similar_to',

    label: 'similar to',

    description:
      'Links concepts through analogy or semantic similarity.',
  },

  {
    id: 'contrasts_with',

    label: 'contrasts with',

    description:
      'Explicitly distinguishes or opposes two concepts.',
  },

];


/* ============================================================
   DEMONSTRATION EDGES

   IMPORTANT:

   The semantic examples are motivated by the READS
   teacher-network materials.

   The NUMERIC values are synthetic.

   They are here so the statistical architecture can be
   manipulated interactively.

   These are not estimated coefficients or observed effect
   sizes from the study.
   ============================================================ */

export const DEMO_EDGES = [

  {
    id: 'skeletal-defines-thin',

    source: 'skeletal',

    relation: 'defines',

    target: 'thin',

    curriculum: 0.82,

    external: 0.58,

    initialMentions: 3,
  },


  {
    id: 'skeletal-category-adjective',

    source: 'skeletal',

    relation: 'category_of',

    target: 'adjective',

    curriculum: 0.76,

    external: 0.52,

    initialMentions: 3,
  },


  {
    id: 'skeletal-exemplifies-legs',

    source: 'skeletal',

    relation: 'exemplifies',

    target: 'skeletal legs',

    curriculum: 0.66,

    external: 0.35,

    initialMentions: 2,
  },


  {
    id: 'skeletal-morph-al',

    source: 'skeletal',

    relation: 'morphologically_from',

    target: '-al suffix',

    curriculum: 0.70,

    external: 0.62,

    initialMentions: 2,
  },


  {
    id: 'skeletal-pattern-magical',

    source: 'skeletal',

    relation: 'same_pattern_as',

    target: 'magical',

    curriculum: 0.52,

    external: 0.47,

    initialMentions: 1,
  },


  {
    id: 'skeletal-system-part-body',

    source: 'skeletal system',

    relation: 'part_of',

    target: 'body',

    curriculum: 0.71,

    external: 0.68,

    initialMentions: 1,
  },


  {
    id: 'magical-morph-magic',

    source: 'magical',

    relation: 'morphologically_from',

    target: 'magic',

    curriculum: 0.49,

    external: 0.67,

    initialMentions: 1,
  },


  {
    id: 'system-part-skeletal',

    source: 'skeletal system',

    relation: 'part_of',

    target: 'system',

    curriculum: 0.63,

    external: 0.55,

    initialMentions: 2,
  },

];


/* ============================================================
   STUDENT-EVIDENCE WEIGHTS

   One central idea:

   not every correct response should produce the same amount
   of evidence.

   Simply recognizing something is weaker evidence than
   explaining it.

   Explaining it is weaker than transferring the relation
   successfully into a novel context.

   These weights are synthetic and replaceable.
   ============================================================ */

export const RESPONSE_WEIGHTS = {

  recognition: 0.55,

  short: 0.90,

  explanation: 1.15,

  transfer: 1.40,

};


/* ============================================================
   DEFAULT MODEL PARAMETERS

   These parameters define the interactive simulator.

   They are NOT empirical estimates.

   The ultimate statistical model would estimate parameters
   like these using teacher / student data.
   ============================================================ */

export const DEFAULT_PARAMS = {

  /*
  How much curriculum opportunity affects the latent
  student-edge prior.
  */
  curriculumWeight: 1.25,


  /*
  Contribution from an external semantic graph.

  ConceptNet is one possible external source.
  */
  externalWeight: 0.55,


  /*
  Effect of direct teacher enactment / repetition.
  */
  teacherExposureWeight: 0.42,


  /*
  Effect of the larger teacher-network structure.
  */
  teacherRichnessWeight: 0.60,


  /*
  Determines how concentrated the contextual prior is.

  Higher value =
  stronger confidence before student evidence arrives.
  */
  priorConcentration: 3.5,


  /*
  Simplified partial pooling.

  0:
      edge is estimated entirely locally.

  1:
      edge is pulled completely to population mean.

  In a true hierarchical Bayesian model this would emerge
  from estimated variance parameters rather than being a
  literal slider.
  */
  edgePooling: 0.35,


  /*
  Population-level mean probability for a semantic edge.
  */
  populationEdgeMean: 0.50,

};


/* ============================================================
   INITIAL STATE
   ============================================================ */

export function createState() {

  const edgeStates = {};


  for (const edge of DEMO_EDGES) {

    edgeStates[edge.id] = {

      /*
      Curriculum graph information.
      */
      curriculum:
        edge.curriculum,


      /*
      Optional external semantic prior.
      */
      external:
        edge.external,


      /*
      Teacher-enacted graph information.
      */
      teacherMentions:
        edge.initialMentions,


      /*
      Direct learner evidence.
      */
      positiveEvidence: 0,

      negativeEvidence: 0,


      /*
      Observation history.
      */
      history: [],

    };

  }


  return {

    selectedEdgeId:
      DEMO_EDGES[0].id,

    edgeStates,

    /*
    Simple event counter.

    Eventually this can become real instructional time:
    lesson number, day, unit, etc.
    */
    time: 0,

  };

}


/* ============================================================
   LOOKUP FUNCTIONS
   ============================================================ */

export function edgeById(edgeId) {

  return DEMO_EDGES.find(
    (edge) =>
      edge.id === edgeId
  );

}


export function relationById(relationId) {

  return RELATIONS.find(
    (relation) =>
      relation.id === relationId
  );

}


/* ============================================================
   LOGIT UTILITY
   ============================================================ */

export function logit(p) {

  const q =
    clamp(
      p,
      1e-6,
      1 - 1e-6
    );

  return Math.log(
    q /
    (1 - q)
  );

}


/* ============================================================
   TEACHER NETWORK RICHNESS

   The READS work motivates several possible dimensions of a
   "rich" semantic network:

   - size
   - variety
   - repetition
   - web structure
   - reach / generativity

   The functions below are intentionally transparent
   approximations.

   They are NOT validated metrics.

   Their purpose is to demonstrate how teacher-network
   structure might enter a learner model.
   ============================================================ */

export function teacherRichness(state) {

  /*
  Only teacher-enacted edges count as active.
  */
  const active =
    DEMO_EDGES.filter(
      (edge) =>
        state.edgeStates[
          edge.id
        ].teacherMentions > 0
    );


  const allNodes =
    new Set();

  const relationTypes =
    new Set();


  let totalMentions = 0;

  let nonTargetEdges = 0;

  let generativeEdges = 0;


  for (const edge of active) {

    const mentions =
      state.edgeStates[
        edge.id
      ].teacherMentions;


    allNodes.add(
      edge.source
    );

    allNodes.add(
      edge.target
    );


    relationTypes.add(
      edge.relation
    );


    totalMentions +=
      mentions;


    /*
    WEB STRUCTURE

    If concepts surrounding the focal word are also connected
    to other concepts, the network becomes less star-shaped.

    This is a crude approximation of interrelatedness.
    */
    if (
      edge.source !== 'skeletal' &&
      edge.target !== 'skeletal'
    ) {

      nonTargetEdges += 1;

    }


    /*
    REACH / GENERATIVITY

    Morphological and same-pattern links are treated here as
    possible routes through which knowledge of one word can
    help unlock another word.

    Again: illustrative, not validated.
    */
    if (
      [
        'same_pattern_as',
        'morphologically_from',
      ].includes(
        edge.relation
      )
    ) {

      generativeEdges += 1;

    }

  }


  /* ----------------------------------------------------------
     SIZE

     Number of unique concepts represented.

     Divisor is simply a normalization constant for this
     small synthetic graph.
     ---------------------------------------------------------- */

  const size =
    clamp(
      allNodes.size / 11,
      0,
      1
    );


  /* ----------------------------------------------------------
     VARIETY

     Number of different relation types instantiated.
     ---------------------------------------------------------- */

  const variety =
    clamp(
      relationTypes.size / 6,
      0,
      1
    );


  /* ----------------------------------------------------------
     REPETITION

     Average repeated exposure per active semantic edge.
     ---------------------------------------------------------- */

  const repetition =
    active.length

      ? clamp(

          (
            totalMentions /
            active.length -
            1
          ) / 3,

          0,

          1

        )

      : 0;


  /* ----------------------------------------------------------
     WEB

     Rough measure of whether teacher talk creates links beyond
     a single target-word-centered star.
     ---------------------------------------------------------- */

  const web =
    active.length

      ? clamp(

          (
            nonTargetEdges /
            active.length
          ) * 1.8,

          0,

          1

        )

      : 0;


  /* ----------------------------------------------------------
     REACH

     Approximation of generative relational structure.
     ---------------------------------------------------------- */

  const reach =
    active.length

      ? clamp(

          (
            generativeEdges /
            active.length
          ) * 2.2,

          0,

          1

        )

      : 0;


  /* ----------------------------------------------------------
     COMPOSITE

     This is only for the interactive prototype.

     In actual analysis, these dimensions should likely remain
     separate or be reduced statistically using something such
     as PCA / factor analysis / latent variable modeling.
     ---------------------------------------------------------- */

  const composite =
    (
      size +
      variety +
      repetition +
      web +
      reach
    ) / 5;


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
   CONTEXTUAL PRIOR FOR A STUDENT EDGE

   Core idea:

   Curriculum network
          ↓
   teacher-enacted network
          ↓
   prior probability of student relation knowledge
          ↓
   direct student evidence
          ↓
   posterior


   We define:

       π_e

   as the probability that semantic relation e is represented
   in the learner BEFORE direct assessment evidence from the
   learner is incorporated.
   ============================================================ */

export function priorForEdge(
  state,
  edgeId,
  params = DEFAULT_PARAMS
) {

  const edge =
    edgeById(
      edgeId
    );


  const local =
    state.edgeStates[
      edgeId
    ];


  const richness =
    teacherRichness(
      state
    );


  /* ==========================================================
     BASE SEMANTIC PRIOR

     logit(π_e) =

         intercept

         + β_C * curriculum_e

         + β_X * external_e
     ========================================================== */

  const baseLogit =

    -1.15

    +

    params.curriculumWeight *
    local.curriculum

    +

    params.externalWeight *
    local.external;


  /* ==========================================================
     TEACHER ENACTMENT

     We use:

         log(1 + mentions)

     because we do not want raw repetition to have an
     indefinitely linear effect.

     Going from:

         0 → 1 exposure

     should matter more than:

         10 → 11 exposures.

     The richness term lets broader instructional structure
     influence the edge prior as well.
     ========================================================== */

  const teacherShift =

    params.teacherExposureWeight *

    Math.log1p(
      local.teacherMentions
    )

    +

    params.teacherRichnessWeight *

    (
      richness.composite -
      0.5
    );


  /* ==========================================================
     CONVERT FROM LOGIT SCALE TO PROBABILITY
     ========================================================== */

  const rawMean =
    sigmoid(

      baseLogit +

      teacherShift

    );


  /* ==========================================================
     HIERARCHICAL PARTIAL POOLING

     π_tilde_e =

         (1 - τ) π_e

         +

         τ μ_population


     This protects sparse edges from extreme estimates.

     Again, the slider is pedagogical.

     A proper hierarchical model would estimate the
     between-edge variance and allow the amount of shrinkage
     to arise naturally.
     ========================================================== */

  const pooledMean =

    (
      1 -
      params.edgePooling
    ) *

    rawMean

    +

    params.edgePooling *

    params.populationEdgeMean;


  /* ==========================================================
     PRIOR CONCENTRATION

     Teacher exposure slightly increases prior confidence.

     Importantly:

     teacher exposure DOES NOT count as direct student
     evidence.

     Teacher behavior shapes the prior.

     Student behavior updates the posterior.
     ========================================================== */

  const concentration =

    params.priorConcentration

    +

    0.35 *

    local.teacherMentions;


  const safeMean =
    clamp(

      pooledMean,

      0.01,

      0.99

    );


  /* ==========================================================
     BETA PARAMETERIZATION

     If:

         θ ~ Beta(α, β)

     then:

         E[θ] = α / (α + β)

     So given desired mean π and concentration κ:

         α = κπ

         β = κ(1 - π)
     ========================================================== */

  return {

    edge,

    mean:
      safeMean,

    concentration,


    alpha:

      safeMean *
      concentration,


    beta:

      (
        1 -
        safeMean
      ) *

      concentration,


    /*
    Useful quantities for the explanation panel.
    */
    baseMean:
      sigmoid(
        baseLogit
      ),

    teacherShift,

    richness,

  };

}


/* ============================================================
   STUDENT POSTERIOR

   For student i and semantic relation e:

       θ_i,e ~ Beta(α_i,e, β_i,e)


   Learner observations contribute fractional evidence.

   If y = 1:

       α' = α + w

   If y = 0:

       β' = β + w


   More generally:

       α' = α + wy

       β' = β + w(1-y)
   ============================================================ */

export function posteriorForEdge(
  state,
  edgeId,
  params = DEFAULT_PARAMS
) {

  const prior =
    priorForEdge(
      state,
      edgeId,
      params
    );


  const local =
    state.edgeStates[
      edgeId
    ];


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
   STUDENT EVIDENCE STRENGTH

   Same correctness does NOT imply same information.

   Recognition is weak evidence.

   Explanation is stronger.

   Transfer into a new context is stronger still.

   Hints reduce evidence.

   Task difficulty modestly changes evidential strength.
   ============================================================ */

export function studentEvidenceWeight({
  responseType,
  hints,
  difficulty,
}) {

  /* ----------------------------------------------------------
     HINT PENALTY
     ---------------------------------------------------------- */

  const hintFactor =

    hints === 0

      ? 1

      : hints === 1

        ? 0.74

        : 0.48;


  /* ----------------------------------------------------------
     DIFFICULTY FACTOR

     Range is deliberately restrained.

     Difficulty should matter, but should not dominate the
     observation.
     ---------------------------------------------------------- */

  const difficultyFactor =

    0.78

    +

    0.44 *
    difficulty;


  /* ----------------------------------------------------------
     FINAL FRACTIONAL EVIDENCE
     ---------------------------------------------------------- */

  return (

    RESPONSE_WEIGHTS[
      responseType
    ]

    *

    hintFactor

    *

    difficultyFactor

  );

}


/* ============================================================
   APPLY STUDENT OBSERVATION
   ============================================================ */

export function applyStudentEvidence(
  state,
  edgeId,
  observation
) {

  const local =
    state.edgeStates[
      edgeId
    ];


  const weight =
    studentEvidenceWeight(
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


  state.time += 1;


  local.history.push({

    ...observation,

    weight,

    t:
      state.time,

  });


  return weight;

}


/* ============================================================
   ADD TEACHER EXPOSURE
   ============================================================ */

export function addTeacherExposure(
  state,
  edgeId,
  amount = 1
) {

  const local =
    state.edgeStates[
      edgeId
    ];


  local.teacherMentions =
    clamp(

      local.teacherMentions +
      amount,

      0,

      20

    );


  state.time += 1;


  return local.teacherMentions;

}


/* ============================================================
   SET CONTEXTUAL EDGE INPUT
   ============================================================ */

export function setEdgeInput(
  state,
  edgeId,
  key,
  value
) {

  /*
  Only these two contextual inputs can be changed through this
  function.
  */

  if (
    ![
 