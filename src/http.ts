import { getPreferenceValues } from "@raycast/api";
import axios from "axios";
import https from "https";
import { encode } from "js-base64";
import { ExtraInfo } from "./types";

interface Preferences {
  jenkinsUrl: string;
  jenkinsUser: string;
  jenkinsToken: string;
}

const { jenkinsUrl, jenkinsUser, jenkinsToken }: Preferences = getPreferenceValues();
const authToken64 = encode(`${jenkinsUser}:${jenkinsToken}`);
export const authConfig = {
  method: "get",
  headers: {
    Authorization: `Basic ${authToken64}`,
    "Content-Type": "application/x-www-form-urlencoded",
  },
};

const httpsAgent = new https.Agent({
  rejectUnauthorized: false,
});

axios.defaults.httpsAgent = httpsAgent;

export interface fetchResponse {
  status: number;
  statusText: string;
  data: ExtraInfo;
}

export async function fetchJsonData(url: string): Promise<fetchResponse> {
  return await axios.request({
    ...authConfig,
    url: `${url}api/json`,
  });
}

export async function fetchRootData(): Promise<fetchResponse> {
  return await fetchJsonData(jenkinsUrl);
}

export async function postJsonData(url: string, data: Record<string, string>): Promise<fetchResponse> {
  const encodedParams = Object.fromEntries(
    Object.entries(data).map(([key, value]) => [key, encodeURIComponent(value)])
  );
  const postUrl = `${url}?${new URLSearchParams(encodedParams).toString()}`;

  return await axios.request({
    ...authConfig,
    url: postUrl,
    method: "post",
    data,
  });
}
