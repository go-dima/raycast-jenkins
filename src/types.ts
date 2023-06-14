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
  result: string;
  building?: boolean;
  displayName: string;
  jobs?: JobResult[];
  builds?: BuildResult[];
}
