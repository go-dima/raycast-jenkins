import { HttpStatusCode } from "axios";
import { Action, ActionPanel, List, showToast, Toast } from "@raycast/api";
import { useCallback, useEffect, useState } from "react";
import { ExtraInfo, JobResult } from "./types";
import { fetchRootData } from "./http";
import { JobsList } from "./jobslist";
import { filterJobs, getExtraInfo } from "./utils";

function toastFailure(msg: unknown) {
  showToast({ style: Toast.Style.Failure, title: "Search Failed", message: `${msg}` });
}

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
