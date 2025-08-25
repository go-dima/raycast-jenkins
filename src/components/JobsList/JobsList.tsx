import { Action, ActionPanel, Icon, List, popToRoot } from "@raycast/api";
import { useEffect, useState } from "react";
import { JobClassOptions, type ExtraInfo, type JobResult } from "../../common/job.types";
import { useCachedState, useCachedPromise } from "@raycast/utils";
import type { JobItemProps, JobsListProps } from "./JobsList.types";
import { formatAccessory } from "./JobsList.heplers";
import { fetchJsonData, type FetchResponse } from "../../services/http";
import { JenkinsJobService } from "../../services/favorites";
import { JobTracker } from "../../services/JobTracker";
import { useUsageBasedSort } from "../../hooks/useUsageBasedSort";
import { getExtraInfo, sortByTerm, filterJobs } from "../../common/jenkins.helpers";
import { JobForm } from "../JobsForm/JobForm";
import { BuildableMark, FavoriteMark } from "../../common/consts";

// Dima: need to see what fails: fetch of extra info
// I see that the cahce causes fetching of old data that was already deleted
// That's why a 404 is returned - the job was deleted
export const JobsList = ({ job: parentJob, sortByUsage, parentSearchTerm }: JobsListProps): JSX.Element => {
  const [jobs, setJobs] = useCachedState<JobResult[]>(`${parentJob.name}_jobs`, []);
  const [extraInfo, setExtraInfo] = useState<Record<string, ExtraInfo>>({});
  const [viewName, setViewName] = useCachedState<string>(`${parentJob.name}_viewname`, "");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [filterText, setFilterText] = useState<string>("");

  const { data: favoriteJobUrls = [], revalidate: revalidateFavorites } = useCachedPromise(JenkinsJobService.favorites);

  useEffect(() => {
    async function getJobs() {
      try {
        const {
          data: { fullName, jobs, builds },
        } = await fetchJsonData<FetchResponse>(parentJob.url);
        setViewName(fullName);
        setJobs(jobs ?? builds?.map((build) => ({ name: build.number.toString(), url: build.url })));
      } catch (err) {
        console.error("getJobs", err);
      }
    }
    getJobs();
  }, []);

  useEffect(() => {
    getExtraInfo(jobs, setIsLoading, setExtraInfo);
  }, [jobs]);

  const { data: sortedResults, recordUsage } = useUsageBasedSort<JobResult>(jobs || [], "jobs");
  const filteredJobs = sortByTerm(filterJobs(sortedResults, filterText, extraInfo), parentSearchTerm);

  // Separate favorite and non-favorite jobs
  const favoriteJobs = filteredJobs.filter((job) => favoriteJobUrls.includes(job.url));
  const nonFavoriteJobs = filteredJobs.filter((job) => !favoriteJobUrls.includes(job.url));

  return (
    <List
      isLoading={isLoading}
      onSearchTextChange={setFilterText}
      searchBarPlaceholder="Search for builds..."
      selectedItemId={filteredJobs.length > 0 ? filteredJobs[0]?.name : undefined}
    >
      {!!favoriteJobs.length && (
        <List.Section title="Favorites" subtitle={`${favoriteJobs.length}`}>
          {favoriteJobs.map(function (job: JobResult) {
            return (
              <JobListItem
                job={job}
                jobInfo={extraInfo[job.name]}
                key={job.name}
                onUseAction={sortByUsage ? recordUsage : undefined}
                parentSearchTerm={filterText}
                isFavorite
                revalidateFavorites={revalidateFavorites}
              />
            );
          })}
        </List.Section>
      )}
      <List.Section title={viewName} subtitle={`${nonFavoriteJobs.length}`}>
        {nonFavoriteJobs.map(function (job: JobResult) {
          return (
            <JobListItem
              job={job}
              jobInfo={extraInfo[job.name]}
              key={job.name}
              onUseAction={sortByUsage ? recordUsage : undefined}
              parentSearchTerm={filterText}
              isFavorite={false}
              revalidateFavorites={revalidateFavorites}
            />
          );
        })}
      </List.Section>
    </List>
  );
};

export const JobListItem = ({
  job,
  jobInfo,
  onUseAction,
  parentSearchTerm,
  isFavorite,
  revalidateFavorites,
}: JobItemProps): JSX.Element => {
  const hasJobs = jobInfo?.jobs || jobInfo?.builds;
  const isBuildable = (jobInfo?._class as string) == JobClassOptions.WorkflowJob;
  const isBuilding = jobInfo?.building || jobInfo?.color?.toLowerCase().includes("anime");

  return (
    <List.Item
      title={`${jobInfo?.displayName ?? job.name.toString()}${isBuildable ? BuildableMark : ""}${
        isFavorite ? FavoriteMark : ""
      }`}
      subtitle={jobInfo?.filterMatches?.join(", ")}
      accessories={formatAccessory(jobInfo?.color ?? (jobInfo?.building ? "building" : jobInfo?.result))}
      id={job.name}
      key={job.name}
      actions={
        <ActionPanel>
          {isBuildable && (
            <Action.Push
              title={"Build Job"}
              shortcut={{ modifiers: ["cmd"], key: "b" }}
              target={<JobForm job={job} jobInfo={jobInfo} />}
            />
          )}
          {isBuilding && (
            <Action
              title={"Track Job"}
              icon={Icon.Pencil}
              onAction={async () => {
                await JobTracker.addTrackedJob(job.name, job.url, jobInfo?.displayName ?? job.name);
                popToRoot();
              }}
              shortcut={{ modifiers: ["cmd"], key: "t" }}
            />
          )}
          {hasJobs && (
            <Action.Push
              title={"Show Jobs"}
              target={<JobsList job={job} parentSearchTerm={parentSearchTerm} />}
              onPush={() => onUseAction?.(job.name)}
            />
          )}
          <Action
            title={isFavorite ? "Remove From Favorites" : "Add to Favorites"}
            icon={isFavorite ? Icon.StarDisabled : Icon.Star}
            onAction={async () => {
              if (isFavorite) {
                await JenkinsJobService.removeFromFavorites(job);
              } else {
                await JenkinsJobService.addToFavorites(job);
              }
              revalidateFavorites();
            }}
            shortcut={{ modifiers: ["cmd", "shift"], key: "f" }}
          />
          <Action.OpenInBrowser title={"Open In Browser"} url={job.url} shortcut={{ modifiers: ["cmd"], key: "o" }} />
          <Action.CopyToClipboard title={"Copy Job Name"} content={jobInfo?.displayName} />
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
