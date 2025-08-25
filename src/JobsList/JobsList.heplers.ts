import { Color } from "@raycast/api";
import type { ItemAccessory } from "./JobsList.types";

// colors
const buildingOrange = { text: { value: "building", color: Color.Orange } };
const successGreen = { text: { value: "success", color: Color.Green } };
const failureRed = { text: { value: "failure", color: Color.Red } };
const abortedGray = { text: { value: "aborted", color: Color.SecondaryText } };

// status to color
const textToColor: Record<string, ItemAccessory> = {
  building: buildingOrange,
  blue_anime: buildingOrange,
  blue: successGreen,
  success: successGreen,
  red: failureRed,
  failure: failureRed,
  aborted: abortedGray,
};

export function formatAccessory(color: string): ItemAccessory[] {
  const accessory = textToColor[color?.toLowerCase()];
  return accessory ? [accessory] : [];
}
