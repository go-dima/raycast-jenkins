import { Action, ActionPanel, Color, Form, List } from "@raycast/api";
import { useEffect, useState } from "react";
import { ExtraInfo, JobClassOptions, JobResult } from "./job.types";
import { fetchJsonData, postJsonData } from "./http";
import { filterJobs, getExtraInfo, sortByTerm } from "./utils";
import { useUsageBasedSort } from "./hooks/useUsageBasedSort";
import { useCachedState } from "@raycast/utils";
import { ParametersDefinitionProperty } from "./property.types";

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

// Dima: need to see what fails: fetch of extra info
// I see that the cahce causes fetching of old data that was already deleted
// That's why a 404 is returned - the job was deleted
export const JobsList = ({ job: parentJob, sortByUsage, parentSearchTerm }: jobsListProps): JSX.Element => {
  const [jobs, setJobs] = useCachedState<JobResult[]>(`${parentJob.name}_jobs`, []);
  // const [extraInfo, setExtraInfo] = useCachedState<Record<string, ExtraInfo>>(`${parentJob.name}_extrainfo`, {});
  const [extraInfo, setExtraInfo] = useState<Record<string, ExtraInfo>>({});
  const [viewName, setViewName] = useCachedState<string>(`${parentJob.name}_viewname`, "");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [filterText, setFilterText] = useState<string>("");

  useEffect(() => {
    async function getJobs() {
      try {
        const {
          data: { fullName, jobs, builds },
        }: { data: ExtraInfo } = await fetchJsonData(parentJob.url);
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

  return (
    <List
      isLoading={isLoading}
      onSearchTextChange={setFilterText}
      searchBarPlaceholder="Search for builds..."
      selectedItemId={filteredJobs.length > 0 ? filteredJobs[0]?.name : undefined}
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
  const isBuildable = (jobInfo?._class as string) == JobClassOptions.WorkflowJob;

  return (
    <List.Item
      title={`${jobInfo?.displayName ?? job.name.toString()}${isBuildable ? " 🛠️" : ""}`}
      subtitle={jobInfo?.filterMatches?.join(", ")}
      accessories={formatAccessory(jobInfo?.color ?? (jobInfo?.building ? "building" : jobInfo?.result))}
      id={job.name}
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
          {isBuildable && (
            <Action
              shortcut={{ modifiers: ["cmd"], key: "b" }}
              title={"Deploy to Namespace"}
              onAction={() => {
                onUseAction?.(job.name);
                postJsonData(`${job.url}buildWithParameters`, {
                  DEPLOY_TO_NAMESPACE: "my namespace",
                  SOURCE_ENVIRONMENT: "auto",
                  // IMAGE_NAME_AND_TAG: "",
                });
              }}
            />
          )}
          {isBuildable && (
            <Action.Push
              title={"Show Builds"}
              shortcut={{ modifiers: ["cmd"], key: "f" }}
              target={<JobForm job={job} jobInfo={jobInfo} />}
            />
          )}
        </ActionPanel>
      }
    />
  );
};

type FormProps = {
  job: JobResult;
  jobInfo: ExtraInfo;
};

function JobForm({ job, jobInfo }: FormProps) {
  const parameters = jobInfo?.property?.find(
    (prop) => prop._class === "hudson.model.ParametersDefinitionProperty"
  ) as ParametersDefinitionProperty;

  return (
    <Form navigationTitle={`${jobInfo?.displayName ?? job.name.toString()}`}>
      {parameters?.parameterDefinitions.map((param) => {
        return (
          <Form.TextField
            id={param.name + param._class}
            key={param.name}
            title={param.name}
            placeholder={param.description}
            value={`${param.defaultParameterValue.value}`}
          />
        );
      })}
    </Form>
  );
}
