import { HttpStatusCode } from "axios";
import { Action, ActionPanel, Color, List, showToast, Toast } from "@raycast/api";
import { useCallback, useEffect, useState } from "react";
import { ExtraInfo, JobResult } from "./types";
import { fetchJsonData, fetchRootData } from "./http";

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
      return term.toString().toLowerCase().includes(filterText.toString().toLowerCase());
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

async function getExtraInfo(
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
        data: { fullName, jobs, builds },
      }: { data: ExtraInfo } = await fetchJsonData(parentJob.url);

      setViewName(fullName);
      setJobs(jobs ?? builds?.map((build) => ({ name: build.number.toString(), url: build.url })));
    }
    getJobs();
  }, []);

  useEffect(() => {
    getExtraInfo(jobs, setIsLoading, setExtraInfo);
  }, [jobs]);

  const filteredJobs = filterJobs(jobs, filterText, extraInfo);
  return (
    <List
      isLoading={isLoading}
      onSearchTextChange={setFilterText}
      children={
        <List.Section title={viewName} subtitle={`${filteredJobs.length}`}>
          {filteredJobs.map(function (job: JobResult) {
            return <JobListItem job={job} jobInfo={extraInfo[job.name]} key={job.name} />;
          })}
        </List.Section>
      }
    />
  );
};

type jobItemProps = {
  job: JobResult;
  jobInfo: ExtraInfo;
};

const JobListItem = ({ job, jobInfo }: jobItemProps) => {
  const hasJobs = jobInfo?.jobs || jobInfo?.builds;
  return (
    <List.Item
      title={jobInfo?.displayName ?? job.name.toString()}
      subtitle={jobInfo?.filterMatches?.join(", ")}
      accessories={formatAccessory(jobInfo?.color ?? (jobInfo?.building ? "building" : jobInfo?.result))}
      key={job.name}
      actions={
        <ActionPanel>
          {hasJobs && <Action.Push title={"Show Jobs"} target={<JobsList job={job} />} />}
          <Action.CopyToClipboard title={"Copy Job Name"} content={jobInfo?.displayName} />
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
};

export default function Command() {
  const [searchText, setSearchText] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [searchResult, setSearchResult] = useState<JobResult[]>([]);
  const [extraInfo, setExtraInfo] = useState<Record<string, ExtraInfo>>({});

  const onSearch = useCallback(
    async function doSearch() {
      setIsLoading(true);

      try {
        const { status, statusText, data } = await fetchRootData();

        if (status != HttpStatusCode.Ok) {
          toastFailure(statusText);
        }

        const { jobs }: { fullName: string; jobs: JobResult[] } = data;
        setSearchResult(jobs);
      } catch (err) {
        toastFailure(err);
      } finally {
        setIsLoading(isLoading);
      }
    },
    [setSearchResult]
  );

  useEffect(() => {
    onSearch();
  }, []);

  useEffect(() => {
    getExtraInfo(searchResult, setIsLoading, setExtraInfo);
  }, [searchResult]);

  const filteredResults = filterJobs(searchResult, searchText, extraInfo);
  return (
    <List isLoading={isLoading} onSearchTextChange={setSearchText} throttle>
      <List.Section title="Total" subtitle={`${searchResult.length}`}>
        {filteredResults.map(function (job: JobResult) {
          return (
            <List.Item
              title={job.name}
              key={job.name}
              subtitle={extraInfo[job.name]?.filterMatches?.join(", ")}
              actions={
                <ActionPanel>
                  <Action.Push title={"Show Jobs"} target={<JobsList job={job} />} />
                  <Action.OpenInBrowser title={"Open In Browser"} url={job.url} />
                </ActionPanel>
              }
            />
          );
        })}
      </List.Section>
    </List>
  );
}
