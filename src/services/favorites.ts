import { LocalStorage } from "@raycast/api";
import type { JobResult } from "../common/job.types";

export class JenkinsJobService {
  private static favoritesStorageKey = "jenkins-jobs-favorites";

  static async favorites(): Promise<string[]> {
    const favoritesItem: string | undefined = await LocalStorage.getItem(JenkinsJobService.favoritesStorageKey);
    if (favoritesItem) {
      return JSON.parse(favoritesItem) as string[];
    } else {
      return [];
    }
  }

  private static async saveFavorites(favorites: string[]) {
    await LocalStorage.setItem(JenkinsJobService.favoritesStorageKey, JSON.stringify(favorites));
  }

  static async addToFavorites(job: JobResult) {
    const favorites = await JenkinsJobService.favorites();
    if (!favorites.includes(job.url)) {
      favorites.push(job.url);
      await JenkinsJobService.saveFavorites(favorites);
    }
  }

  static async removeFromFavorites(job: JobResult) {
    let favorites = await JenkinsJobService.favorites();
    favorites = favorites.filter((favorite) => favorite !== job.url);
    await JenkinsJobService.saveFavorites(favorites);
  }

  static async isFavorite(job: JobResult): Promise<boolean> {
    const favorites = await JenkinsJobService.favorites();
    return favorites.includes(job.url);
  }
}
