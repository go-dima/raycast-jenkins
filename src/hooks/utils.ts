export type Usage = {
  lastUsed?: Date;
  usageCount?: number;
};

export type Usages = Record<string | number, Usage>;

export function getDecayScore(lastUsed?: Date): number {
  if (!lastUsed) return 0;
  const decayRate = -Math.log(2) / 7;
  const diffDays = Math.ceil(Math.abs(Date.now() - new Date(lastUsed).getTime()) / (1000 * 60 * 60 * 24));
  return Math.exp(decayRate * diffDays);
}

export function getFrequencyScore(usageCount?: number): number {
  if (!usageCount) return 0;
  return Math.log(1 + usageCount);
}

export function getCalculatedScore(usage: Usage = {}): number {
  const { lastUsed, usageCount } = usage;
  const decayScore = getDecayScore(lastUsed);
  const frequencyScore = getFrequencyScore(usageCount);
  return decayScore * frequencyScore;
}
