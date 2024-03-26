import { Toast, showToast } from "@raycast/api";
import { fetchJsonData } from "./http";
import { ExtraInfo, JobResult } from "./types";

export function filterJobs(jobs: JobResult[], filterText: string, extraInfo: Record<string, ExtraInfo>): JobResult[] {
  return jobs.filter((item) => {
    const matchingJobs = extraInfo[item.name]?.jobs
      ?.filter((job) => includesText(job.name, filterText))
      .map((job) => job.name);
    const matchingBuilds = extraInfo[item.name]?.builds
      ?.filter((build) => includesText(build.url, filterText))
      .map((build) => `#${build.number}`);

    const hasMatch =
      !filterText ||
      includesText(item.name, filterText) ||
      includesText(extraInfo[item.name]?.displayName, filterText) ||
      matchingJobs?.length ||
      matchingBuilds?.length;

    if (extraInfo[item.name]) {
      extraInfo[item.name].filterMatches = filterText ? [...(matchingJobs ?? []), ...(matchingBuilds ?? [])] : [];
    }

    return hasMatch;
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
        try {
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
        } catch (err) {
          console.error("fetchJsonData", err);
          return undefined;
        }
      })
    )
  ).reduce((acc: Record<string, ExtraInfo>, ele) => {
    if (ele) {
      acc[ele.name] = ele.extra;
    }
    return acc;
  }, {});
  infoSetter(jobsWithExtraInfo);
  loadingSetter(false);
}

export function sortByTerm(toSort: JobResult[], term?: string): JobResult[] {
  if (!term) {
    return toSort;
  }

  const matching: JobResult[] = [];
  const nonMatching: JobResult[] = [];

  toSort.forEach((job) => {
    if (includesText(job.name, term)) {
      matching.push(job);
    } else {
      nonMatching.push(job);
    }
  });

  return [...matching, ...nonMatching];
}

function includesText(term: string, toSearch: string): boolean {
  if (!term) {
    return false;
  }
  return term.toString().toLowerCase().includes(toSearch.toString().toLowerCase());
}

export function toastFailure(msg: unknown) {
  showToast({ style: Toast.Style.Failure, title: "Fetch Failed", message: `${msg}` });
}
