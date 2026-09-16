"use client";

import { useEffect, useState } from "react";
import { Browser } from "@capacitor/browser";
import { checkForUpdate, type UpdateInfo } from "@/lib/update";

export function UpdateBanner() {
  const [update, setUpdate] = useState<UpdateInfo | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    checkForUpdate()
      .then((info) => {
        if (info?.available) setUpdate(info);
      })
      .catch(() => {
        // Silent failure — no network, GitHub API rate limit, etc.
        // An update check should never block or break the app.
      });
  }, []);

  if (!update || dismissed) return null;

  const handleDownload = () => {
    Browser.open({
      url: update.downloadUrl ?? update.releaseNotesUrl,
    });
  };

  return (
    <div
      className="sticky inset-x-0 top-0 z-50 flex items-center justify-between gap-3 bg-foreground px-4 pb-3 text-background"
      style={{ paddingTop: "calc(env(safe-area-inset-top, 0px) + 0.75rem)" }}
    >
      <p className="text-[0.85rem]">
        Update available — {update.latestVersionName}
      </p>
      <div className="flex shrink-0 items-center gap-3">
        <button
          onClick={handleDownload}
          className="text-[0.85rem] font-medium underline underline-offset-4"
        >
          Download
        </button>
        <button
          onClick={() => setDismissed(true)}
          className="text-[0.85rem] text-background/60"
        >
          Later
        </button>
      </div>
    </div>
  );
}
