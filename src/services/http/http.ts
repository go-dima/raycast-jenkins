import { getPreferenceValues, showToast, Toast } from "@raycast/api";
import axios, { AxiosResponse } from "axios";
import https from "https";
import { encode } from "js-base64";
import { JobTracker } from "../JobTracker";
import type { FetchLocationResponse, FetchResponse } from "./http.types";

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

export async function fetchJsonData<T>(url: string): Promise<T> {
  return await axios.request({
    ...authConfig,
    url: `${url}api/json`,
  });
}

export async function fetchRootData(): Promise<FetchResponse> {
  return await fetchJsonData(jenkinsUrl);
}

export async function buildWithParameters(
  url: string,
  params: Record<string, string>,
  jobName: string,
  displayName: string
) {
  try {
    const response = await postJsonData(`${url}buildWithParameters`, params);
    const triggeredUrl = await fetchTriggeredJob(response);
    await JobTracker.addTrackedJob(jobName, triggeredUrl, displayName);
    showToast({ style: Toast.Style.Success, title: `${displayName} Build started` });
  } catch (error) {
    console.error(error);
    showToast({ style: Toast.Style.Failure, title: "Error", message: "Failed to start build" });
  }
}

export async function postJsonData(url: string, params: Record<string, string>) {
  // Convert params to URLSearchParams for form encoding
  const formData = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    formData.append(key, value);
  });
  try {
    return axios.request({
      ...authConfig,
      url,
      method: "POST",
      params,
    });
  } catch (error) {
    console.error("Error in postJsonData:", error);
    throw error;
  }
}

async function fetchTriggeredJob(response: AxiosResponse): Promise<string> {
  const { location } = response.headers;
  const { data } = await fetchJsonData<FetchLocationResponse>(location);
  const { url: triggeredUrl } = data.executable;

  return triggeredUrl;
}
