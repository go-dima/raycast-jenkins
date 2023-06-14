import axios, { HttpStatusCode } from "axios";
import https from "https";
import { Action, ActionPanel, getPreferenceValues, List, showToast, Toast } from "@raycast/api";
import { encode } from "js-base64";
import { useCallback, useEffect, useState } from "react";

export interface Preferences {
  jenkinsUrl: string;
  jenkinsUser: string;
  jenkinsToken: string;
}

type extraInfo = {
  result: string;
  building?: boolean;
  displayName: string;
};

interface JobResult {
  name: string;
  url: string;
  color: string;
}

interface BuildResult {
  number: string;
  url: string;
}

const { jenkinsUrl, jenkinsUser, jenkinsToken }: Preferences = getPreferenceValues();
const authToken64 = encode(`${jenkinsUser}:${jenkinsToken}`);

const authConfig = {
  method: "get",
  headers: {
    Authorization: `Basic ${authToken64}`,
    "Content-Type": "application/x-www-form-urlencoded",
  },
};

const httpsAgent = new https.Agent({
  rejectUnauthorized: false,
});

axios.defaults.httpsAgent = httpsAgent;

function toastFailure(msg: unknown) {
  showToast({ style: Toast.Style.Failure, title: "Search Failed", message: `${msg}` });
}

type jobsListProps = {
  job: JobResult;
};

const JobsList = ({ job: parentJob }: jobsListProps) => {
  const [jobs, setJobs] = useState<JobResult[]>([]);
  const [viewName, setViewName] = useState<string>("");
  const [extraInfo, setExtraInfo] = useState<Record<string, extraInfo>>({});
  const [isLoading, setIsLoading] = useState<boolean>(false);

  useEffect(() => {
    async function getJobs() {
      const response = await axios.request({
        ...authConfig,
        url: `${parentJob.url}api/json`,
      });

      const { fullName, jobs, builds }: { fullName: string; jobs: JobResult[]; builds: BuildResult[] } = response.data;

      let buildsAsJobs: JobResult[] = [];
      if (builds) {
        const color = response.data.color;
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
            const response = await axios.request({
              ...authConfig,
              url: `${job.url}api/json`,
            });
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
      const map = {} as Record<string, extraInfo>;
      for (const ele of jobsWithExtraInfo) {
        map[ele.name] = ele.extra;
      }
      setExtraInfo(map);
      setIsLoading(false);
    }
    getExtraInfo();
  }, [jobs]);

  return (
    // Dima: This can be a component (used in main view and in search)
    <List
      isLoading={isLoading}
      children={
        <List.Section title="Total" subtitle={`${jobs.length}`}>
          {jobs.map(function (job: JobResult) {
            return (
              <List.Item
                title={viewName ? `${viewName} → ${extraInfo[job.name]?.displayName ?? job.name}` : job.name}
                subtitle={
                  extraInfo[job.name] &&
                  `${extraInfo[job.name].building ? "Building" : `${extraInfo[job.name].result ?? ""}`}`
                }
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
        const response = await axios.request({
          ...authConfig,
          url: `${jenkinsUrl}/api/json`,
        });

        if (response.status != HttpStatusCode.Ok) {
          toastFailure(response.statusText);
        }

        const { fullName, jobs }: { fullName: string; jobs: JobResult[] } = response.data;
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