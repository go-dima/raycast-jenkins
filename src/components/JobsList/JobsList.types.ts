import type { Color } from "@raycast/api";
import type { ExtraInfo, JobResult } from "../../common/job.types";

export type ItemAccessory = {
  text: {
    value: string;
    color: Color;
  };
};

export type JobsListProps = {
  job: JobResult;
  sortByUsage?: boolean;
  parentSearchTerm?: string;
};

export type JobItemProps = {
  job: JobResult;
  jobInfo: ExtraInfo;
  onUseAction?: (id: string | number) => void;
  parentSearchTerm?: string;
  isFavorite: boolean;
  revalidateFavorites: () => void;
};
