export interface TrackedJob {
  name: string;
  url: string;
  displayName: string;
  startedAt: number;
  lastBuildNumber?: number;
  status: JobStatus;
  building: boolean;
}

export type JobStatus = "building" | "success" | "failure" | "unstable" | "aborted" | "unknown";

/**
 * Summary of job statuses with counts for each status type
 */
export interface JobStatusSummary {
  total: number;
  building: number;
  success: number;
  failure: number;
  unstable: number;
  aborted: number;
  unknown: number;
}

/**
 * Grouped jobs by their status
 */
export type GroupedJobs = Record<JobStatus, TrackedJob[]>;
