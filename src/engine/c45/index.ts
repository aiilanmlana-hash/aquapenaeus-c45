export type SensorValues = { ph: number; temperature: number; salinity: number };
export type WaterClass = "BAGUS" | "TIDAK BAGUS";

export const splitPoints = { ph: 7.5, temperature: 28.75, salinityMin: 15, salinity: 25.5 };
export type SplitPoints = typeof splitPoints;

export const journalSplitPoints = { ph: 7.495, temperature: 28.755, salinity: 25.635 };
export const journalEvidence = {
  trainingRows: 76,
  gini: { ph: 0.346, temperature: 0.413, salinity: 0.480 },
  rootGain: { ph: 0.234, temperature: 0.135, salinity: 0.038 },
  phChildGain: 0.438,
  testRows: 17,
  confusionMatrix: { truePositive: 8, trueNegative: 5, falsePositive: 3, falseNegative: 1 },
  accuracy: 76.47,
  precision: 72.72,
  recall: 88.88,
};

export const idealRanges = {
  ph: { min: 7.5, max: 8.0 },
  temperature: { min: 28, max: 32 },
  salinity: { min: 15, max: 25 },
};
export const toleranceRanges = {
  ph: { min: 7.0, max: 8.5 },
  temperature: { min: 26, max: 35 },
  salinity: { min: 0, max: 35 },
};

export type Decision = {
  classification: WaterClass;
  activeRule: string;
  path: string[];
  recommendation: string;
  checks: { ph: boolean; temperature: boolean; salinity: boolean };
  branches: { ph: boolean; temperature: boolean; salinity: boolean };
};

export function giniImpurity(labels: string[]): number {
  if (!labels.length) return 0;
  const counts = labels.reduce<Record<string, number>>((acc, label) => {
    acc[label] = (acc[label] ?? 0) + 1;
    return acc;
  }, {});
  return 1 - Object.values(counts).reduce((sum, count) => sum + (count / labels.length) ** 2, 0);
}

export function entropy(labels: string[]): number {
  if (!labels.length) return 0;
  const counts = labels.reduce<Record<string, number>>((acc, label) => {
    acc[label] = (acc[label] ?? 0) + 1;
    return acc;
  }, {});
  return Object.values(counts).reduce((sum, count) => {
    const probability = count / labels.length;
    return sum - probability * Math.log2(probability);
  }, 0);
}

export type TrainingRow = SensorValues & { label: WaterClass };

export function informationGain(rows: TrainingRow[], attribute: keyof SensorValues, threshold: number): number {
  if (!rows.length) return 0;
  const before = entropy(rows.map((row) => row.label));
  const lower = rows.filter((row) => row[attribute] < threshold);
  const upper = rows.filter((row) => row[attribute] >= threshold);
  const weighted = (lower.length / rows.length) * entropy(lower.map((row) => row.label))
    + (upper.length / rows.length) * entropy(upper.map((row) => row.label));
  return before - weighted;
}

export function gainRatio(rows: TrainingRow[], attribute: keyof SensorValues, threshold: number): number {
  if (!rows.length) return 0;
  const lowerSize = rows.filter((row) => row[attribute] < threshold).length;
  const upperSize = rows.length - lowerSize;
  const splitInfo = [lowerSize, upperSize].reduce((sum, size) => {
    if (!size) return sum;
    const probability = size / rows.length;
    return sum - probability * Math.log2(probability);
  }, 0);
  return splitInfo === 0 ? 0 : informationGain(rows, attribute, threshold) / splitInfo;
}

export function bestGiniSplit(rows: TrainingRow[], attribute: keyof SensorValues): { threshold: number; weightedGini: number } | null {
  const values = [...new Set(rows.map((row) => row[attribute]))].sort((a, b) => a - b);
  if (values.length < 2) return null;
  let best: { threshold: number; weightedGini: number } | null = null;
  for (let index = 0; index < values.length - 1; index += 1) {
    const threshold = (values[index] + values[index + 1]) / 2;
    const lower = rows.filter((row) => row[attribute] < threshold).map((row) => row.label);
    const upper = rows.filter((row) => row[attribute] >= threshold).map((row) => row.label);
    const weightedGini = (lower.length / rows.length) * giniImpurity(lower) + (upper.length / rows.length) * giniImpurity(upper);
    if (!best || weightedGini < best.weightedGini) best = { threshold, weightedGini };
  }
  return best;
}

export const referenceTrainingSet: TrainingRow[] = [
  { ph: 7.2, temperature: 29, salinity: 20, label: "TIDAK BAGUS" },
  { ph: 7.4, temperature: 30, salinity: 22, label: "TIDAK BAGUS" },
  { ph: 7.6, temperature: 28.4, salinity: 20, label: "TIDAK BAGUS" },
  { ph: 7.8, temperature: 29.5, salinity: 18, label: "BAGUS" },
  { ph: 8.0, temperature: 30, salinity: 22, label: "BAGUS" },
  { ph: 8.2, temperature: 31, salinity: 24, label: "BAGUS" },
  { ph: 7.9, temperature: 29, salinity: 26.1, label: "TIDAK BAGUS" },
  { ph: 8.6, temperature: 30, salinity: 20, label: "TIDAK BAGUS" },
  { ph: 7.7, temperature: 33, salinity: 20, label: "TIDAK BAGUS" },
  { ph: 8.1, temperature: 29.2, salinity: 16, label: "BAGUS" },
];

export function evaluateWater(values: SensorValues, splits: SplitPoints = splitPoints): Decision {
  const checks = {
    ph: values.ph >= splits.ph && values.ph >= toleranceRanges.ph.min && values.ph <= toleranceRanges.ph.max,
    temperature: values.temperature >= splits.temperature && values.temperature >= toleranceRanges.temperature.min && values.temperature <= toleranceRanges.temperature.max,
    salinity: values.salinity >= splits.salinityMin && values.salinity < splits.salinity && values.salinity >= toleranceRanges.salinity.min && values.salinity <= toleranceRanges.salinity.max,
  };
  const branches = {
    ph: values.ph >= splits.ph,
    temperature: values.temperature >= splits.temperature,
    salinity: values.salinity < splits.salinity,
  };
  const classification: WaterClass = Object.values(checks).every(Boolean) ? "BAGUS" : "TIDAK BAGUS";
  const path = [
    `pH ${values.ph >= splits.ph ? `>= ${splits.ph.toFixed(3)}` : `< ${splits.ph.toFixed(3)}`}${values.ph < toleranceRanges.ph.min || values.ph > toleranceRanges.ph.max ? " (di luar toleransi)" : values.ph < idealRanges.ph.min || values.ph > idealRanges.ph.max ? " (di luar optimal)" : ""}`,
    `Suhu ${values.temperature >= splits.temperature ? `>= ${splits.temperature.toFixed(3)}°C` : `< ${splits.temperature.toFixed(3)}°C`}${values.temperature < toleranceRanges.temperature.min || values.temperature > toleranceRanges.temperature.max ? " (di luar toleransi)" : values.temperature < idealRanges.temperature.min || values.temperature > idealRanges.temperature.max ? " (di luar optimal)" : ""}`,
    `Salinitas ${values.salinity < splits.salinityMin ? `< ${splits.salinityMin.toFixed(1)} ppt` : values.salinity < splits.salinity ? `${splits.salinityMin.toFixed(1)}–< ${splits.salinity.toFixed(1)} ppt` : `>= ${splits.salinity.toFixed(1)} ppt`}${values.salinity > toleranceRanges.salinity.max ? " (di luar toleransi)" : values.salinity > idealRanges.salinity.max ? " (di atas optimal)" : ""}`,
    `Hasil = ${classification}`,
  ];
  const activeRule = `IF pH >= ${splits.ph.toFixed(2)} and ${toleranceRanges.ph.min}–${toleranceRanges.ph.max} AND suhu >= ${splits.temperature.toFixed(2)}°C and ${toleranceRanges.temperature.min}–${toleranceRanges.temperature.max}°C AND salinitas ${checks.salinity ? `${splits.salinityMin} ≤ ${values.salinity.toFixed(1)} < ${splits.salinity.toFixed(1)} ppt` : `${values.salinity.toFixed(1)} ppt (syarat ${splits.salinityMin} ≤ x < ${splits.salinity.toFixed(1)})`} THEN ${classification}`;
  let recommendation: string;
  if (classification === "BAGUS") {
    recommendation = "Pertahankan kincir aerator dan lanjutkan siklus deteksi rutin tiap 10 menit.";
  } else if (values.ph < splits.ph) {
    recommendation = "Periksa pH ulang; evaluasi pemberian kapur dolomit bertahap sesuai SOP tambak.";
  } else if (values.ph > toleranceRanges.ph.max) {
    recommendation = "Tingkatkan sirkulasi dan cek alkalinitas sebelum koreksi pH.";
  } else if (values.temperature < splits.temperature || values.temperature < toleranceRanges.temperature.min || values.temperature > toleranceRanges.temperature.max) {
    recommendation = "Nyalakan kincir aerator dan pantau suhu; evaluasi pergantian air bila perlu.";
  } else {
    recommendation = `Periksa salinitas dan lakukan sirkulasi air secara bertahap untuk mencapai ${splits.salinityMin}–${splits.salinity} ppt.`;
  }
  return { classification, activeRule, path, recommendation, checks, branches };
}
