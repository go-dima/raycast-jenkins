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
  displayName: string;
  color?: string;
  building?: boolean;
  result: string;
  jobs?: JobResult[];
  builds?: BuildResult[];
  filterMatches?: string[];
}
