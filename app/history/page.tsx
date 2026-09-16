"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ActionBar, Button, LinkButton, Screen, TopBar } from "@/components/ui";
import { formatClock } from "@/lib/scoring";
import { storage } from "@/lib/storage";
import type { ExamResult } from "@/lib/types";

export default function HistoryPage() {
  const [items, setItems] = useState<ExamResult[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);

  useEffect(() => {
    setItems(storage.getHistory());
    setLoaded(true);
  }, []);

  function remove(id: string) {
    storage.deleteResult(id);
    setItems(storage.getHistory());
  }

  function clearAll() {
    storage.clearHistory();
    setItems([]);
    setConfirmClear(false);
  }

  if (!loaded) return <Screen>{null}</Screen>;

  const best = items.reduce((max, r) => Math.max(max, r.score), 0);

  return (
    <Screen wide>
      <TopBar title="Your attempts" back="/" />

      {items.length === 0 ? (
        <section className="pt-16">
          <h2 className="text-[1.6rem] leading-tight font-semibold tracking-tight">
            No attempts yet
          </h2>
          <p className="mt-3 text-[0.95rem] leading-relaxed text-muted">
            Finish a paper and the score, the questions and your answers stay
            here on this device.
          </p>
        </section>
      ) : (
        <>
          <p className="pt-6 text-[0.85rem] text-muted">
            {items.length} saved on this device · best score {best}
          </p>
          <ul className="mt-4 space-y-3 lg:grid lg:grid-cols-2 lg:gap-3 lg:space-y-0">
            {items.map((r) => (
              <li
                key={r.id}
                className="rounded-3xl border border-line bg-raised transition-colors hover:border-ink/25"
              >
                <Link href={`/result/${r.id}`} className="block p-4">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="tnum text-[1.5rem] leading-none font-semibold tracking-tight">
                      {r.score}
                      <span className="text-[0.85rem] font-normal text-muted">
                        {" "}
                        / {r.maxScore}
                      </span>
                    </span>
                    <span className="text-[0.8rem] text-muted">
                      {new Date(r.finishedAt).toLocaleDateString(undefined, {
                        day: "numeric",
                        month: "short",
                      })}
                    </span>
                  </div>
                  <p className="tnum mt-2 text-[0.82rem] text-muted">
                    {r.totalQuestions} questions · {r.accuracy}% accuracy ·{" "}
                    {formatClock(r.durationUsedSeconds)}
                  </p>
                  <p className="mt-1 truncate text-[0.82rem] text-muted">
                    {r.subjects.map((s) => s.subject).join(", ")}
                  </p>
                </Link>
                <div className="flex justify-end border-t border-line px-4 py-2">
                  <button
                    type="button"
                    onClick={() => remove(r.id)}
                    className="py-1 text-[0.82rem] text-muted"
                  >
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>

          <div className="pt-6">
            {confirmClear ? (
              <div className="flex gap-3 lg:max-w-[28rem]">
                <Button variant="danger" onClick={clearAll} className="flex-1">
                  Delete everything
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => setConfirmClear(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            ) : (
              <Button
                variant="ghost"
                full
                className="lg:w-auto lg:justify-start lg:px-0"
                onClick={() => setConfirmClear(true)}
              >
                Clear all attempts
              </Button>
            )}
          </div>
        </>
      )}

      <ActionBar>
        <LinkButton href="/configure">Build a mock test</LinkButton>
      </ActionBar>
    </Screen>
  );
}
