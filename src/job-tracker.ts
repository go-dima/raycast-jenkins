import { LocalStorage } from "@raycast/api";
import { fetchJsonData } from "./http";
import { FetchResponse } from "./http.types";
import { ExtraInfo } from "./job.types";

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

  static getStatusIcon(status: JobStatus): string {
    switch (status) {
      case "building":
        return "🔄";
      case "success":
        return "✅";
      case "failure":
        return "❌";
      case "unstable":
        return "⚠️";
      case "aborted":
        return "⏹️";
      default:
        return "❓";
    }
  }

  static getStatusColor(status: JobStatus): string {
    switch (status) {
      case "building":
        return "#FFA500"; // Orange
      case "success":
        return "#28A745"; // Green
      case "failure":
        return "#DC3545"; // Red
      case "unstable":
        return "#FFC107"; // Yellow
      case "aborted":
        return "#6C757D"; // Gray
      default:
        return "#007AFF"; // Blue
    }
  }
}
