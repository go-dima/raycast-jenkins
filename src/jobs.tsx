import { HttpStatusCode } from "axios";
import { Action, ActionPanel, Icon, List, showToast, Toast } from "@raycast/api";
import { useCallback, useEffect, useState } from "react";
import type { ExtraInfo, JobResult } from "./common/job.types";
import { filterJobs, getExtraInfo } from "./common/jenkins.helpers";
import { useUsageBasedSort } from "./hooks/useUsageBasedSort";
import { useCachedState, useCachedPromise } from "@raycast/utils";
import { JenkinsJobService } from "./services/favorites";
import { fetchRootData } from "./services/http";
import { favoriteMark, JobsList } from "./components/JobsList";

export function toastFailure(msg: unknown) {
  showToast({ style: Toast.Style.Failure, title: "Fetch Failed", message: `${msg}` });
}

export default function Command() {
  const [searchText, setSearchText] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [jobsResult, setJobsResult] = useCachedState<JobResult[]>("command_jobsResult", []);
  const [extraInfo, setExtraInfo] = useCachedState<Record<string, ExtraInfo>>("command_extraInfo", {});

  const { data: favoriteJobUrls = [], revalidate: revalidateFavorites } = useCachedPromise(JenkinsJobService.favorites);

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

  // Separate favorite and non-favorite jobs
  const favoriteJobs = filteredResults.filter((job) => favoriteJobUrls.includes(job.url));
  const nonFavoriteJobs = filteredResults.filter((job) => !favoriteJobUrls.includes(job.url));

  return (
    <List
      isLoading={isLoading}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search for jobs..."
      selectedItemId={filteredResults.length > 0 ? filteredResults[0].name : undefined}
      throttle
    >
      {!!favoriteJobs.length && (
        <List.Section title="Favorites" subtitle={`${favoriteJobs.length}`}>
          {favoriteJobs.map(function (job: JobResult) {
            return (
              <List.Item
                title={`${job.name}${favoriteMark}`}
                id={job.name}
                key={job.name}
                subtitle={extraInfo[job.name]?.filterMatches?.join(", ")}
                actions={
                  <ActionPanel>
                    <Action.Push
                      title={"Show Jobs"}
                      target={<JobsList job={job} sortByUsage parentSearchTerm={searchText} />}
                      onPush={() => recordUsage(job.name)}
                    />
                    <Action
                      title={"Remove From Favorites"}
                      icon={Icon.StarDisabled}
                      onAction={async () => {
                        await JenkinsJobService.removeFromFavorites(job);
                        revalidateFavorites();
                      }}
                      shortcut={{ modifiers: ["cmd", "shift"], key: "f" }}
                    />
                    <Action.OpenInBrowser title={"Open In Browser"} url={job.url} />
                  </ActionPanel>
                }
              />
            );
          })}
        </List.Section>
      )}
      <List.Section title={favoriteJobs.length ? "All Jobs" : "Total"} subtitle={`${nonFavoriteJobs.length}`}>
        {nonFavoriteJobs.map(function (job: JobResult) {
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
                    target={<JobsList job={job} sortByUsage parentSearchTerm={searchText} />}
                    onPush={() => recordUsage(job.name)}
                  />
                  <Action
                    title={"Add To Favorites"}
                    icon={Icon.Star}
                    onAction={async () => {
                      await JenkinsJobService.addToFavorites(job);
                      revalidateFavorites();
                    }}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "f" }}
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
