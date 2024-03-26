export const USAGE_KEY = "scores-";

export interface JobResult {
  name: string;
  url: string;
  color: string;
}

export interface BuildResult {
  number: string;
  url: string;
}

export interface ExtraInfo {
  _class: JobClass;
  displayName: string;
  fullName: string;
  color?: string;
  building?: boolean;
  result: string;
  jobs: JobResult[];
  builds: BuildResult[];
  filterMatches?: string[];
}

export const JobClassOptions = {
  "org.jenkinsci.plugins.workflow.job.WorkflowJob": "WorkflowJob",
  "org.jenkinsci.plugins.workflow.multibranch.WorkflowMultiBranchProject": "WorkflowMultiBranchProject",
  "org.jenkinsci.plugins.workflow.job.WorkflowRun": "WorkflowRun",
} as const;

export type JobClass = keyof typeof JobClassOptions;
