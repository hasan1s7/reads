export const TASK_WEIGHTS = {
  mc: 0.45,
  recognition: 0.65,
  short: 0.85,
  recall: 1.05,
  guided: 1.20,
  free: 1.45,
};

export const TASK_NAMES = {
  mc: 'Multiple choice',
  recognition: 'Recognition',
  short: 'Short-answer retrieval',
  recall: 'Extended recall',
  guided: 'Guided solution',
  free: 'Free response / production',
};

export const CANDIDATES = [
  { name: 'Recognition check', difficulty: 0.35, engagement: 0.55, review: 0.45, task: 'recognition' },
  { name: 'Short-answer retrieval', difficulty: 0.52, engagement: 0.65, review: 0.72, task: 'short' },
  { name: 'Worked-example completion', difficulty: 0.62, engagement: 0.70, review: 0.58, task: 'guided' },
  { name: 'Extended recall prompt', difficulty: 0.72, engagement: 0.68, review: 0.80, task: 'recall' },
  { name: 'Open-ended application', difficulty: 0.84, engagement: 0.88, review: 0.50, task: 'free' },
];

export const DEFAULTS = {
  alpha: 1,
  beta: 1,
  x: 0,
  psi: 0,
  time: 0,
  persistence: 0.96,
  learnerRate: 0.45,
  teacherPersistence: 0.97,
  populationConcentration: 8,
};
