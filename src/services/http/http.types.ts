import type { ExtraInfo } from "../../common/job.types";

interface BaseResponse {
  status: number;
  statusText: string;
}

export interface FetchResponse extends BaseResponse {
  data: ExtraInfo;
}

export interface FetchLocationResponse extends BaseResponse {
  data: {
    executable: {
      url: string;
    };
  };
}
