import axios, { HttpStatusCode } from "axios";
import https from "https";
import { Action, ActionPanel, getPreferenceValues, List, showToast, Toast } from "@raycast/api";
import { encode } from "js-base64";
import { useCallback, useState } from "react";

export interface Preferences {
  jenkinsUrl: string;
  jenkinsUser: string;
  jenkinsToken: string;
}

interface SearchResult {
  name: string;
  link: string;
}

const { jenkinsUrl, jenkinsUser, jenkinsToken }: Preferences = getPreferenceValues();
const authToken64 = encode(`${jenkinsUser}:${jenkinsToken}`);

const authConfig = {
  method: "get",
  url: `${jenkinsUrl}/search/suggest`,
  headers: {
    Authorization: `Basic ${authToken64}`,
    "Content-Type": "application/x-www-form-urlencoded",
  },
};

const httpsAgent = new https.Agent({
  rejectUnauthorized: false,
});

axios.defaults.httpsAgent = httpsAgent;

export default function Command() {
  const [searchText, setSearchText] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [searchResult, setSearchResult] = useState<SearchResult[]>([]);

  const onSearch = useCallback(
    async function doSearch(text: string) {
      if (searchText !== text) {
        setSearchText(text);
      }

      if (text.length < 2) {
        return;
      }

      setIsLoading(true);
      const response = await axios.request({
        ...authConfig,
        params: { query: text },
      });

      if (response.status != HttpStatusCode.Ok) {
        showToast({ style: Toast.Style.Failure, title: "Search Failed", message: `${response.statusText}` });
      }

      const { suggestions } = response.data;
      const searchData: SearchResult[] = suggestions
        ? suggestions.map((s: SearchResult) => {
            s.link = `${jenkinsUrl}/search/?q=${encodeURIComponent(s.name)}`;
            return s;
          })
        : [];

      setSearchResult(searchData);
      setIsLoading(isLoading);
    },
    [setSearchResult]
  );

  return (
    <List isLoading={isLoading} onSearchTextChange={onSearch} searchBarPlaceholder={"Search jenkins..."} throttle>
      <List.Section title="Total" subtitle={`${searchResult.length}`}>
        {searchResult.map(function (suggestion: SearchResult) {
          return (
            <List.Item
              title={suggestion.name}
              key={suggestion.name}
              actions={
                <ActionPanel>
                  <Action.OpenInBrowser title={"Open In Browser"} url={`${suggestion.link}`} />
                </ActionPanel>
              }
            />
          );
        })}
      </List.Section>
    </List>
  );
}
