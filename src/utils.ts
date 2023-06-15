import { fetchJsonData } from "./http";
import { ExtraInfo, JobResult } from "./types";

export function filterJobs(jobs: JobResult[], filterText: string, extraInfo: Record<string, ExtraInfo>) {
  return jobs.filter((item) => {
    const matchingJobs = extraInfo[item.name]?.jobs
      ?.filter((job) => includesFilterText(job.name))
      .map((job) => job.name);
    const matchingBuilds = extraInfo[item.name]?.builds
      ?.filter((build) => includesFilterText(build.url))
      .map((build) => `#${build.number}`);

    const hasMatch =
      !filterText ||
      includesFilterText(item.name) ||
      includesFilterText(extraInfo[item.name]?.displayName) ||
      matchingJobs?.length ||
      matchingBuilds?.length;

    if (extraInfo[item.name]) {
      extraInfo[item.name].filterMatches = filterText ? [...(matchingJobs ?? []), ...(matchingBuilds ?? [])] : [];
    }

    return hasMatch;

    function includesFilterText(term: string): boolean {
      if (!term) {
        return false;
      }
      return term.toString().toLowerCase().includes(filterText.toString().toLowerCase());
    }
  });
}

export async function getExtraInfo(
  jobs: JobResult[],
  loadingSetter: (arg0: boolean) => void,
  infoSetter: (arg0: Record<string, ExtraInfo>) => void
) {
  loadingSetter(true);
  const jobsWithExtraInfo = (
    await Promise.all(
      jobs.map(async (job) => {
        const { data }: { data: ExtraInfo } = await fetchJsonData(job.url);
        if (data) {
          // if the item is job, we want to use the color from the parent
          data.color = data.color ?? job.color;
        }
        return (
          data && {
            name: job.name,
            extra: data as ExtraInfo,
          }
        );
      })
    )
  ).reduce((acc: Record<string, ExtraInfo>, ele) => {
    acc[ele.name] = ele.extra;
    return acc;
  }, {});
  infoSetter(jobsWithExtraInfo);
  loadingSetter(false);
}
