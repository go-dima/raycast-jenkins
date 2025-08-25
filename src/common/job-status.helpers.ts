import { Color, Icon } from "@raycast/api";
import type { JobStatus } from "../services/JobTracker/job-tracker.types";

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

export function getStatusColor(status: JobStatus): Color {
  switch (status) {
    case "building":
      return Color.Orange;
    case "success":
      return Color.Green;
    case "failure":
      return Color.Red;
    case "unstable":
      return Color.Yellow;
    case "aborted":
      return Color.SecondaryText;
    default:
      return Color.Blue;
  }
}
