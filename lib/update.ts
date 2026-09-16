import { App } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";

const REPO = "sushovancpp/mockbysu";
const LATEST_RELEASE_URL = `https://api.github.com/repos/${REPO}/releases/latest`;

export type UpdateInfo = {
  available: boolean;
  currentVersionCode: number;
  latestVersionCode: number;
  latestVersionName: string;
  downloadUrl: string | null;
  releaseNotesUrl: string;
};

// tag_name looks like "v1.0.42" — the trailing number is the
// GitHub run_number, which build.gradle now also uses as versionCode.
function extractVersionCode(tag: string): number | null {
  const match = tag.match(/(\d+)$/);
  return match ? parseInt(match[1], 10) : null;
}

export async function checkForUpdate(): Promise<UpdateInfo | null> {
  if (!Capacitor.isNativePlatform()) return null;

  const info = await App.getInfo();
  const currentVersionCode = parseInt(info.build, 10) || 0;

  const res = await fetch(LATEST_RELEASE_URL, {
    headers: { Accept: "application/vnd.github+json" },
  });
  if (!res.ok) return null;

  const release = await res.json();
  const latestVersionCode = extractVersionCode(release.tag_name);
  if (latestVersionCode === null) return null;

  const apkAsset = (release.assets ?? []).find((a: { name: string }) =>
    a.name.endsWith(".apk")
  );

  return {
    available: latestVersionCode > currentVersionCode,
    currentVersionCode,
    latestVersionCode,
    latestVersionName: release.tag_name,
    downloadUrl: apkAsset?.browser_download_url ?? null,
    releaseNotesUrl: release.html_url,
  };
}