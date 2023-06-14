import { getPreferenceValues } from "@raycast/api";
import axios, { AxiosResponse } from "axios";
import https from "https";
import { encode } from "js-base64";

export interface Preferences {
  jenkinsUrl: string;
  jenkinsUser: string;
  jenkinsToken: string;
}

const { jenkinsUrl, jenkinsUser, jenkinsToken }: Preferences = getPreferenceValues();
const authToken64 = encode(`${jenkinsUser}:${jenkinsToken}`);
const authConfig = {
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

// {
//   data: {
//     fullName: string;
//     jobs: JobResult[];
//     builds: BuildResult[];
//     color: string;
//   };
// }
// TODO: handle typing here
export async function fetchData(url: string): Promise<AxiosResponse<any, any>> {
  return await axios.request({
    ...authConfig,
    url: url,
  });
}

export async function fetchRootData(): Promise<AxiosResponse<any, any>> {
  return await fetchData(`${jenkinsUrl}/api/json`);
}
