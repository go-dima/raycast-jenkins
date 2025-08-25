import { MenuBarExtra, open, getPreferenceValues, popToRoot } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { JobTracker } from "./JobTracker/job-tracker";
import { formatDuration } from "./utils";
import { JobStatus, TrackedJob } from "./JobTracker/job-tracker.types";
import { getStatusText } from "./JobTracker";

function renderJobSection(title: string, jobs: TrackedJob[], status: JobStatus) {
  if (jobs.length === 0) return null;
  return (
    <MenuBarExtra.Section title={`${getStatusText(status)} ${title} (${jobs.length})`}>
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

  const statusSummary = JobTracker.calculateStatusSummary(trackedJobs);
  const menuBarTitle = JobTracker.getMenuBarTitle(statusSummary);
  const tooltip = JobTracker.getTooltip(statusSummary);
  const groupedJobs = JobTracker.groupJobsByStatus(trackedJobs);

  return (
    <MenuBarExtra isLoading={isLoading} title={menuBarTitle} tooltip={tooltip}>
      {statusSummary.total === 0 ? (
        <MenuBarExtra.Item title="Start a job from the extension to track it here" />
      ) : (
        <>
          {renderJobSection("Building", groupedJobs.building, "building")}
          {renderJobSection("Failed", groupedJobs.failure, "failure")}
          {renderJobSection("Unstable", groupedJobs.unstable, "unstable")}
          {renderJobSection("Success", groupedJobs.success, "success")}
          {renderJobSection("Aborted", groupedJobs.aborted, "aborted")}
          {renderJobSection("Unknown", groupedJobs.unknown, "unknown")}
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
          onAction={async () => {
            await open(jenkinsUrl);
            popToRoot();
          }}
        />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
