import { Action, ActionPanel, Color, List } from "@raycast/api";
import { useEffect, useState } from "react";
import { ExtraInfo, JobResult } from "./types";
import { fetchJsonData } from "./http";
import { filterJobs, getExtraInfo, sortByTerm } from "./utils";
import { useUsageBasedSort } from "./hooks/useUsageBasedSort";

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
  sortByUsage?: boolean;
  parentSearchTerm?: string;
};

export const JobsList = ({ job: parentJob, sortByUsage, parentSearchTerm }: jobsListProps): JSX.Element => {
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

  const { data: sortedResults, recordUsage } = useUsageBasedSort<JobResult>(jobs || [], "jobs");
  const filteredJobs = sortByTerm(filterJobs(sortedResults, filterText, extraInfo), parentSearchTerm);

  return (
    <List
      isLoading={isLoading}
      onSearchTextChange={setFilterText}
      searchBarPlaceholder="Search for builds..."
      children={
        <List.Section title={viewName} subtitle={`${filteredJobs.length}`}>
          {filteredJobs.map(function (job: JobResult) {
            return (
              <JobListItem
                job={job}
                jobInfo={extraInfo[job.name]}
                key={job.name}
                onUseAction={sortByUsage ? recordUsage : undefined}
                parentSearchTerm={filterText}
              />
            );
          })}
        </List.Section>
      }
    />
  );
};

type jobItemProps = {
  job: JobResult;
  jobInfo: ExtraInfo;
  onUseAction?: (id: string | number) => void;
  parentSearchTerm?: string;
};

export const JobListItem = ({ job, jobInfo, onUseAction, parentSearchTerm }: jobItemProps): JSX.Element => {
  const hasJobs = jobInfo?.jobs || jobInfo?.builds;
  return (
    <List.Item
      title={jobInfo?.displayName ?? job.name.toString()}
      subtitle={jobInfo?.filterMatches?.join(", ")}
      accessories={formatAccessory(jobInfo?.color ?? (jobInfo?.building ? "building" : jobInfo?.result))}
      key={job.name}
      actions={
        <ActionPanel>
          {hasJobs && (
            <Action.Push
              title={"Show Jobs"}
              target={<JobsList job={job} parentSearchTerm={parentSearchTerm} />}
              onPush={() => onUseAction?.(job.name)}
            />
          )}
          <Action.OpenInBrowser title={"Open In Browser"} url={job.url} />
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
