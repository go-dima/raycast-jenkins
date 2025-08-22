import { LocalStorage } from "@raycast/api";
import { fetchJsonData } from "../http/http";
import { FetchResponse } from "../http/http.types";
import { ExtraInfo } from "../job.types";
import { GroupedJobs, JobStatus, JobStatusSummary, TrackedJob } from "./job-tracker.types";

export class JobTracker {
  private static storageKey = "jenkins-tracked-jobs";

  static async getTrackedJobs(): Promise<TrackedJob[]> {
    const storedJobs = await LocalStorage.getItem(JobTracker.storageKey);
    if (storedJobs) {
      return JSON.parse(storedJobs as string) as TrackedJob[];
    }
    return [];
  }

  private static async saveTrackedJobs(jobs: TrackedJob[]) {
    await LocalStorage.setItem(JobTracker.storageKey, JSON.stringify(jobs));
  }

  static async removeTrackedJob(url: string) {
    const jobs = await JobTracker.getTrackedJobs();
    const filteredJobs = jobs.filter((job) => job.url !== url);
    await JobTracker.saveTrackedJobs(filteredJobs);
  }

  static async addTrackedJob(name: string, url: string, displayName: string) {
    const jobs = await JobTracker.getTrackedJobs();

    // Remove existing entry for this job if present
    const filteredJobs = jobs.filter((job) => job.url !== url);

    // Add new tracked job
    const newJob: TrackedJob = {
      name,
      url,
      displayName,
      startedAt: Date.now(),
      status: "building",
      building: true,
    };

    filteredJobs.push(newJob);
    console.info("Added", newJob.url);
    await JobTracker.saveTrackedJobs(filteredJobs);
  }

  static async updateJobStatuses(): Promise<TrackedJob[]> {
    const jobs = await JobTracker.getTrackedJobs();
    const updatedJobs: TrackedJob[] = [];

    for (const job of jobs) {
      try {
        const { data } = await fetchJsonData<FetchResponse>(job.url);
        if (data) {
          const updatedJob: TrackedJob = {
            ...job,
            status: JobTracker.parseJobStatus(data),
            building: data.building || false,
            lastBuildNumber: data.builds?.[0] ? parseInt(data.builds[0].number) : undefined,
          };

          updatedJobs.push(updatedJob);
        }
      } catch (error) {
        // If job returns 404, remove it from tracking
        const axiosError = error as any;
        if (axiosError?.response?.status === 404) {
          // Job was deleted, don't add to updated jobs (effectively removes it)
          continue;
        }

        // For other errors, keep the job but mark status as unknown
        updatedJobs.push({
          ...job,
          status: "unknown",
          building: false,
        });
      }
    }

    // Remove jobs that have been completed for more than 30 minutes
    const thirtyMinutesAgo = Date.now() - 30 * 60 * 1000;
    const activeJobs = updatedJobs.filter((job) => {
      if (job.building || job.status === "building") {
        return true; // Keep building jobs
      }
      return job.startedAt > thirtyMinutesAgo; // Keep recent completed jobs
    });

    await JobTracker.saveTrackedJobs(activeJobs);
    return activeJobs;
  }

  private static parseJobStatus(jobData: ExtraInfo): JobStatus {
    if (jobData.building) return "building";

    const result = jobData.result?.toLowerCase();
    const color = jobData.color?.toLowerCase();

    // Parse from result first
    if (result) {
      switch (result) {
        case "success":
          return "success";
        case "failure":
          return "failure";
        case "unstable":
          return "unstable";
        case "aborted":
          return "aborted";
        default:
          break;
      }
    }

    // Parse from color
    if (color) {
      if (color.includes("blue")) return "success";
      if (color.includes("red")) return "failure";
      if (color.includes("yellow")) return "unstable";
      if (color.includes("grey") || color.includes("disabled")) return "aborted";
      if (color.includes("anime")) return "building";
    }

    return "unknown";
  }

  static async clearTrackedJobs() {
    await LocalStorage.removeItem(JobTracker.storageKey);
  }

  /**
   * Calculate summary statistics from an array of tracked jobs
   */
  static calculateStatusSummary(jobs: TrackedJob[]): JobStatusSummary {
    return jobs.reduce(
      (summary, job) => {
        summary.total++;
        summary[job.status]++;
        return summary;
      },
      {
        total: 0,
        building: 0,
        success: 0,
        failure: 0,
        unstable: 0,
        aborted: 0,
        unknown: 0,
      } as JobStatusSummary
    );
  }

  /**
   * Group jobs by their status
   */
  static groupJobsByStatus(jobs: TrackedJob[]): GroupedJobs {
    const groups: GroupedJobs = {
      building: [],
      failure: [],
      unstable: [],
      success: [],
      aborted: [],
      unknown: [],
    };

    jobs.forEach((job) => {
      groups[job.status].push(job);
    });

    return groups;
  }

  /**
   * Generate menu bar title based on job status summary
   */
  static getMenuBarTitle(summary: JobStatusSummary): string {
    if (summary.total === 0) return "👷🏽‍♂️";

    // Priority: building > failure > unstable > success
    if (summary.building > 0) return `🔄 ${summary.building}`;
    if (summary.failure > 0) return `❌ ${summary.failure}`;
    if (summary.unstable > 0) return `⚠️ ${summary.unstable}`;
    if (summary.success > 0) return `✅ ${summary.success}`;
    if (summary.aborted > 0) return `⏹️ ${summary.aborted}`;

    return `❓ ${summary.unknown}`;
  }

  /**
   * Generate tooltip text based on job status summary
   */
  static getTooltip(summary: JobStatusSummary): string {
    if (summary.total === 0) return "No Jenkins jobs being tracked";

    const parts: string[] = [];
    if (summary.building > 0) parts.push(`Building: ${summary.building}`);
    if (summary.failure > 0) parts.push(`Failed: ${summary.failure}`);
    if (summary.unstable > 0) parts.push(`Unstable: ${summary.unstable}`);
    if (summary.success > 0) parts.push(`Success: ${summary.success}`);
    if (summary.aborted > 0) parts.push(`Aborted: ${summary.aborted}`);
    if (summary.unknown > 0) parts.push(`Unknown: ${summary.unknown}`);

    return `Jenkins Jobs - ${parts.join(", ")}`;
  }
}
