import { HttpStatusCode } from "axios";
import { Action, ActionPanel, List } from "@raycast/api";
import { useCallback, useEffect, useState } from "react";
import { ExtraInfo, JobResult } from "./types";
import { fetchRootData } from "./http";
import { JobsList } from "./jobslist";
import { filterJobs, getExtraInfo, toastFailure } from "./utils";
import { useUsageBasedSort } from "./hooks/useUsageBasedSort";
import { useCachedState } from "@raycast/utils";

export default function Command() {
  const [searchText, setSearchText] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [jobsResult, setJobsResult] = useCachedState<JobResult[]>("command_jobsResult", []);
  const [extraInfo, setExtraInfo] = useCachedState<Record<string, ExtraInfo>>("command_extraInfo", {});

  const onSearch = useCallback(
    async function doSearch() {
      setIsLoading(true);

      try {
        const { status, statusText, data } = await fetchRootData();

        if (status != HttpStatusCode.Ok) {
          toastFailure(statusText);
        }

        const { jobs }: { fullName: string; jobs: JobResult[] } = data;
        setJobsResult(jobs);
      } catch (err) {
        toastFailure(err);
      } finally {
        setIsLoading(isLoading);
      }
    },
    [setJobsResult]
  );

  useEffect(() => {
    onSearch();
  }, []);

  useEffect(() => {
    getExtraInfo(jobsResult, setIsLoading, setExtraInfo);
  }, [jobsResult]);

  const { data: sortedResults, recordUsage } = useUsageBasedSort<JobResult>(jobsResult || [], "folders");
  const filteredResults = filterJobs(sortedResults, searchText, extraInfo);

  return (
    <List
      isLoading={isLoading}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search for jobs..."
      selectedItemId={filteredResults.length > 0 ? filteredResults[0].name : undefined}
      throttle
    >
      <List.Section title="Total" subtitle={`${jobsResult.length}`}>
        {filteredResults.map(function (job: JobResult) {
          return (
            <List.Item
              title={job.name}
              id={job.name}
              key={job.name}
              subtitle={extraInfo[job.name]?.filterMatches?.join(", ")}
              actions={
                <ActionPanel>
                  <Action.Push
                    title={"Show Jobs"}
                    target={<JobsList job={job} sortByUsage={true} parentSearchTerm={searchText} />}
                    onPush={() => recordUsage(job.name)}
                  />
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
