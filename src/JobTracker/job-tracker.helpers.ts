import { Icon } from "@raycast/api";
import { JobStatus } from "./job-tracker.types";

export function getStatusIcon(status: JobStatus): Icon {
  switch (status) {
    case "building":
      return Icon.Clock;
    case "success":
      return Icon.CheckCircle;
    case "failure":
      return Icon.XMarkCircle;
    case "unstable":
      return Icon.ExclamationMark;
    case "aborted":
      return Icon.Stop;
    default:
      return Icon.QuestionMark;
  }
}

export function getStatusText(status: JobStatus): string {
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
      return "🚫";
    default:
      return "❓";
  }
}
