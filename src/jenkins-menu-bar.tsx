import { MenuBarExtra, open, getPreferenceValues } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { JobTracker, TrackedJob, JobStatus } from "./job-tracker";

interface JobStatusSummary {
  total: number;
  building: number;
  success: number;
  failure: number;
  unstable: number;
  aborted: number;
  unknown: number;
}

function calculateStatusSummary(jobs: TrackedJob[]): JobStatusSummary {
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

function getMenuBarTitle(summary: JobStatusSummary): string {
  if (summary.total === 0) return "👷🏽‍♂️";

  // Priority: building > failure > unstable > success
  if (summary.building > 0) return `🔄 ${summary.building}`;
  if (summary.failure > 0) return `❌ ${summary.failure}`;
  if (summary.unstable > 0) return `⚠️ ${summary.unstable}`;
  if (summary.success > 0) return `✅ ${summary.success}`;
  if (summary.aborted > 0) return `⏹️ ${summary.aborted}`;

  return `❓ ${summary.unknown}`;
}

function getTooltip(summary: JobStatusSummary): string {
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

function formatDuration(startedAt: number): string {
  const duration = Math.floor((Date.now() - startedAt) / 1000);

  if (duration < 60) return `${duration}s`;
  if (duration < 3600) return `${Math.floor(duration / 60)}m`;
  return `${Math.floor(duration / 3600)}h ${Math.floor((duration % 3600) / 60)}m`;
}

function groupJobsByStatus(jobs: TrackedJob[]): Record<JobStatus, TrackedJob[]> {
  const groups: Record<JobStatus, TrackedJob[]> = {
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

function renderJobSection(title: string, jobs: TrackedJob[], icon: string) {
  if (jobs.length === 0) return null;
  return (
    <MenuBarExtra.Section title={`${icon} ${title} (${jobs.length})`}>
      {jobs.map((job) => (
        <MenuBarExtra.Item
          key={job.url}
          title={job.displayName}
          subtitle={`${formatDuration(job.startedAt)} ago`}
          onAction={() => open(job.url)}
        />
      ))}
    </MenuBarExtra.Section>
  );
}

export default function Command() {
  const { jenkinsUrl } = getPreferenceValues<{ jenkinsUrl: string }>();

  const {
    data: trackedJobs = [],
    isLoading,
    revalidate,
  } = useCachedPromise(JobTracker.updateJobStatuses, [], {
    keepPreviousData: true,
    initialData: [],
  });

  const statusSummary = calculateStatusSummary(trackedJobs);
  const menuBarTitle = getMenuBarTitle(statusSummary);
  const tooltip = getTooltip(statusSummary);
  const groupedJobs = groupJobsByStatus(trackedJobs);

  return (
    <MenuBarExtra isLoading={isLoading} title={menuBarTitle} tooltip={tooltip}>
      {statusSummary.total === 0 ? (
        <MenuBarExtra.Item title="No jobs being tracked" subtitle="Start a job from the extension to track it here" />
      ) : (
        <>
          {renderJobSection("Building", groupedJobs.building, "🔄")}
          {renderJobSection("Failed", groupedJobs.failure, "❌")}
          {renderJobSection("Unstable", groupedJobs.unstable, "⚠️")}
          {renderJobSection("Success", groupedJobs.success, "✅")}
          {renderJobSection("Aborted", groupedJobs.aborted, "⏹️")}
          {renderJobSection("Unknown", groupedJobs.unknown, "❓")}
        </>
      )}

      <MenuBarExtra.Section title="Actions">
        <MenuBarExtra.Item
          title="🔄 Refresh Status"
          shortcut={{ modifiers: ["cmd"], key: "r" }}
          onAction={() => revalidate()}
        />
        <MenuBarExtra.Item
          title="🗑️ Clear All Tracked Jobs"
          shortcut={{ modifiers: ["cmd"], key: "x" }}
          onAction={async () => {
            await JobTracker.clearTrackedJobs();
            revalidate();
          }}
        />
        <MenuBarExtra.Item
          title="🌐 Open Jenkins"
          shortcut={{ modifiers: ["cmd"], key: "o" }}
          onAction={() => open(jenkinsUrl)}
        />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
