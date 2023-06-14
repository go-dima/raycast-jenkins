import { HttpStatusCode } from "axios";
import { Action, ActionPanel, Color, List, showToast, Toast } from "@raycast/api";
import { useCallback, useEffect, useState } from "react";
import { BuildResult, ExtraInfo, JobResult } from "./types";
import { fetchData, fetchRootData } from "./http";

function toastFailure(msg: unknown) {
  showToast({ style: Toast.Style.Failure, title: "Search Failed", message: `${msg}` });
}

function filterJobs(jobs: JobResult[], filterText: string, extraInfo: Record<string, ExtraInfo>) {
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

      return term.toLowerCase().includes(filterText.toLowerCase());
    }
  });
}

type ItemAccessory = {
  text: {
    value: string;
    color: Color;
  };
};

function formatAccessory(color: string): ItemAccessory[] {
  // colors
  const buildingOrange = { text: { value: "building", color: Color.Orange } };
  const successGreen = { text: { value: "success", color: Color.Green } };
  const failureRed = { text: { value: "failure", color: Color.Red } };
  const abortedGray = { text: { value: "aborted", color: Color.SecondaryText } };

  // status to color
  const textToColor: Record<string, ItemAccessory> = {
    building: buildingOrange,
    blue_anime: buildingOrange,
    blue: successGreen,
    success: successGreen,
    red: failureRed,
    failure: failureRed,
    aborted: abortedGray,
  };

  const accessory = textToColor[color?.toLowerCase()];
  return accessory ? [accessory] : [];
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
    <List
      isLoading={isLoading}
      onSearchTextChange={setFilterText}
      children={
        <List.Section title="Total" subtitle={`${filteredJobs.length}`}>
          {filteredJobs.map(function (job: JobResult) {
            const hasJobs = extraInfo[job.name]?.jobs || extraInfo[job.name]?.builds;
            return (
              <List.Item
                title={viewName ? `${viewName} → ${extraInfo[job.name]?.displayName ?? job.name}` : job.name}
                subtitle={extraInfo[job.name]?.filterMatches?.join(", ")}
                accessories={formatAccessory(
                  extraInfo[job.name]?.building ? "building" : extraInfo[job.name]?.result ?? job.color
                )}
                key={job.name}
                actions={
                  <ActionPanel>
                    {hasJobs && <Action.Push title={"Show Jobs"} target={<JobsList job={job} />} />}
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
    <List isLoading={isLoading} throttle>
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
