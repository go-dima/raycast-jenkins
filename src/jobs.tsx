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
            name: build.number,
            url: build.url,
            color: color,
          };
        });
      }
      setViewName(fullName);
      setJobs(jobs ?? buildsAsJobs);
    }
    getJobs();
  }, []);

  return (
    // Dima: This can be a component (used in main view and in search)
    <List
      children={
        <List.Section title="Total" subtitle={`${jobs.length}`}>
          {jobs.map(function (job: JobResult) {
            return (
              <List.Item
                title={viewName ? `${viewName} → ${job.name}` : job.name}
                subtitle={job.color && `Last build color: ${job.color}`}
                key={job.name}
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
