import { USAGE_KEY } from "../job.types";
import { useLocalStorage } from "./useLocalStorage";
import { Usages, getCalculatedScore } from "./utils";

export const useUsageBasedSort = <T extends { name: string | number }>(data: T[], localStorageKey: string) => {
  const { data: usages, set: setUsages } = useLocalStorage<Usages>(USAGE_KEY + localStorageKey);

  const recordUsage = (id: string | number) => {
    setUsages({
      ...usages,
      [id]: {
        lastUsed: new Date(),
        usageCount: (usages?.[id]?.usageCount || 0) + 1,
      },
    });
  };

  const arrayWithScores = data.map((e: T) => {
    const usage = (usages || {})[e.name];
    return {
      ...e,
      _calculatedScore: getCalculatedScore(usage),
    };
  });

  const sortedByScores = [...(arrayWithScores || [])].sort((a, b) => b._calculatedScore - a._calculatedScore);

  return { data: sortedByScores, recordUsage };
};
