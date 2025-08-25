import type { PropertyType } from "./property.types";

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
  property: PropertyType[];
}

export const JobClassOptions = {
  WorkflowJob: "org.jenkinsci.plugins.workflow.job.WorkflowJob",
  WorkflowMultiBranchProject: "org.jenkinsci.plugins.workflow.multibranch.WorkflowMultiBranchProject",
  WorkflowRun: "org.jenkinsci.plugins.workflow.job.WorkflowRun",
} as const;

export type JobClass = keyof typeof JobClassOptions;
