import { HttpStatusCode } from "axios";
import { Action, ActionPanel, List, showToast, Toast } from "@raycast/api";
import { useCallback, useEffect, useState } from "react";
import { BuildResult, ExtraInfo, JobResult } from "./types";
import { fetchData, fetchRootData } from "./http";

function toastFailure(msg: unknown) {
  showToast({ style: Toast.Style.Failure, title: "Search Failed", message: `${msg}` });
}

function filterJobs(jobs: JobResult[], filterText: string, extraInfo: Record<string, ExtraInfo>) {
  if (!filterText) {
    return jobs;
  }

  return jobs.filter((item) => {
    const findJobs = extraInfo[item.name]?.jobs?.filter((job) => includesFilterText(job.name)).map((job) => job.name);
    const findBuilds = extraInfo[item.name]?.builds
      ?.filter((build) => includesFilterText(build.url))
      .map((build) => `#${build.number}`);

    const hasMatch =
      includesFilterText(item.name) ||
      includesFilterText(extraInfo[item.name]?.displayName) ||
      findJobs?.length ||
      findBuilds?.length;

    if (filterText && extraInfo[item.name] && hasMatch) {
      console.info(`Filtering ${item.name} with ${filterText}: ${findJobs?.join()} # ${findBuilds?.join()}`);
      extraInfo[item.name].filterMatches = [...(findJobs ?? []), ...(findBuilds ?? [])];
    }

    return hasMatch;

    function includesFilterText(term: string): boolean {
      if (!term) {
        return false;
      }

      return term.toLowerCase().includes(filterText.toLowerCase());
    }
  });
}

function formatSubtitle(extraInfo: ExtraInfo): string | undefined {
  if (!extraInfo) {
    return "";
  }

  if (extraInfo.building) {
    return "Building";
  }

  if (extraInfo.result) {
    return extraInfo.result;
  }

  return extraInfo.filterMatches?.join(", ");
}

type jobsListProps = {
  job: JobResult;
};

const JobsList = ({ job: parentJob }: jobsListProps) => {
  const [jobs, setJobs] = useState<JobResult[]>([]);
  const [viewName, setViewName] = useState<string>("");
  const [extraInfo, setExtraInfo] = useState<Record<string, ExtraInfo>>({});
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [filterText, setFilterText] = useState<string>("");

  useEffect(() => {
    async function getJobs() {
      const {
        data: { fullName, jobs, builds, color },
      }: { data: { fullName: string; jobs: JobResult[]; builds: BuildResult[]; color: string } } = await fetchData(
        `${parentJob.url}api/json`
      );

      let buildsAsJobs: JobResult[] = [];
      if (builds) {
        buildsAsJobs = builds.map((build) => {
          return {
            displayName: build.number,
            name: build.number,
            url: build.url,
            color: color,
            extra: undefined,
          };
        });
      }
      setViewName(fullName);
      setJobs(jobs ?? buildsAsJobs);
    }
    getJobs();
  }, []);

  useEffect(() => {
    async function getExtraInfo() {
      setIsLoading(true);
      const jobsWithExtraInfo = await Promise.all(
        jobs.map(async (job) => {
          if (job.url) {
            const response = await fetchData(`${job.url}api/json`);
            return (
              response &&
              response.data && {
                name: job.name,
                extra: response.data,
              }
            );
          } else {
            return job;
          }
        })
      );
      const map = {} as Record<string, ExtraInfo>;
      for (const ele of jobsWithExtraInfo) {
        map[ele.name] = ele.extra;
      }
      setExtraInfo(map);
      setIsLoading(false);
    }
    getExtraInfo();
  }, [jobs]);

  const filteredJobs = filterJobs(jobs, filterText, extraInfo);
  return (
    // Dima: This can be a component (used in main view and in search)
    <List
      isLoading={isLoading}
      filtering={filterText.length > 0}
      onSearchTextChange={setFilterText}
      children={
        <List.Section title="Total" subtitle={`${filteredJobs.length}`}>
          {filteredJobs.map(function (job: JobResult) {
            return (
              <List.Item
                title={viewName ? `${viewName} → ${extraInfo[job.name]?.displayName ?? job.name}` : job.name}
                subtitle={formatSubtitle(extraInfo[job.name])}
                key={job.name}
                actions={
                  <ActionPanel>
                    <Action.Push title={"Show Jobs"} target={<JobsList job={job} />} />
                    <Action.CopyToClipboard title={"Copy Job Name"} content={extraInfo[job.name]?.displayName} />
                    <Action.OpenInBrowser title={"Open In Browser"} url={job.url} />
                    <Action.OpenInBrowser
                      shortcut={{ modifiers: ["cmd"], key: "j" }}
                      title={"Open Json For Debug"}
                      url={`${job.url}api/json`}
                    />
                  </ActionPanel>
                }
              />
            );
          })}
        </List.Section>
      }
    />
  );
};

export default function Command() {
  const [searchText, setSearchText] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [searchResult, setSearchResult] = useState<JobResult[]>([]);
  const [viewName, setViewName] = useState<string>("");

  const onSearch = useCallback(
    async function doSearch(text: string) {
      if (searchText !== text) {
        setSearchText(text);
      }

      setIsLoading(true);

      try {
        const { status, statusText, data } = await fetchRootData();

        if (status != HttpStatusCode.Ok) {
          toastFailure(statusText);
        }

        const { fullName, jobs }: { fullName: string; jobs: JobResult[] } = data;
        setSearchResult(jobs);
        setViewName(fullName);
      } catch (err) {
        toastFailure(err);
      } finally {
        setIsLoading(isLoading);
      }
    },
    [setSearchResult]
  );

  useEffect(() => {
    onSearch("");
  }, []);

  return (
    <List isLoading={isLoading} onSearchTextChange={onSearch} searchBarPlaceholder={"Search jenkins..."} throttle>
      <List.Section title="Total" subtitle={`${searchResult.length}`}>
        {searchResult.map(function (job: JobResult) {
          return (
            <List.Item
              title={viewName ? `${viewName} → ${job.name}` : job.name}
              key={job.name}
              actions={
                <ActionPanel>
                  <Action.Push title={"Show Jobs"} target={<JobsList job={job} />} />
                  <Action.OpenInBrowser title={"Show Jobs"} url={job.url} />
                </ActionPanel>
              }
            />
          );
        })}
      </List.Section>
    </List>
  );
}
