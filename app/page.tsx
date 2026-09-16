"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ActionBar, LinkButton, Screen } from "@/components/ui";
import { formatClock } from "@/lib/scoring";
import { storage } from "@/lib/storage";
import type { ExamResult, ExamSession } from "@/lib/types";

const STEPS = [
  "Pick subjects, question count and time",
  "Copy the generated prompt into any chatbot",
  "Paste its JSON back here",
  "Take the paper under the clock",
];

export default function Landing() {
  const [ready, setReady] = useState(false);
  const [last, setLast] = useState<ExamResult | null>(null);
  const [attempts, setAttempts] = useState(0);
  const [session, setSession] = useState<ExamSession | null>(null);

  useEffect(() => {
    const history = storage.getHistory();
    setLast(history[0] ?? null);
    setAttempts(history.length);
    const live = storage.getSession();
    setSession(live && live.endsAt > Date.now() ? live : null);
    setReady(true);
  }, []);

  return (
    <Screen wide>
      <div className="flex items-center justify-between py-3">
        <span className="text-[0.8rem] tracking-tight text-muted">
          Saved on this device
        </span>
        {attempts > 0 && (
          <Link
            href="/history"
            className="text-[0.8rem] underline-offset-4 hover:underline"
          >
            {attempts} attempt{attempts === 1 ? "" : "s"}
          </Link>
        )}
      </div>

      <div className="lg:grid lg:grid-cols-2 lg:items-start lg:gap-16 lg:pt-10">
        <section className="pt-14 pb-10 lg:pt-6 lg:pb-0">
          <h1 className="text-[2.75rem] leading-[0.95] font-semibold tracking-[-0.045em] lg:text-[4.25rem]">
            IBPS SO
            <br />
            IT Officer
          </h1>
          <p className="mt-4 max-w-[30ch] text-[1.05rem] leading-snug text-muted lg:mt-6 lg:text-[1.15rem]">
            Set your own paper. Any subjects, any length, any clock.
          </p>

          <div className="hidden lg:mt-10 lg:block">
            <ActionBar>
              {ready && session ? (
                <div className="space-y-2">
                  <LinkButton href="/exam">Resume exam in progress</LinkButton>
                  <LinkButton href="/configure" variant="secondary">
                    Start a new one instead
                  </LinkButton>
                </div>
              ) : (
                <LinkButton href="/configure">Build a mock test</LinkButton>
              )}
            </ActionBar>
          </div>
        </section>

        <div className="lg:pt-6">
          {ready && last && (
            <Link
              href={`/result/${last.id}`}
              className="mb-8 block rounded-3xl border border-line bg-raised p-5"
            >
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-[0.8rem] text-muted">Last attempt</p>
                  <p className="tnum mt-1 text-[2.5rem] leading-none font-semibold tracking-tight">
                    {last.score}
                    <span className="text-[1rem] font-normal text-muted">
                      {" "}
                      / {last.maxScore}
                    </span>
                  </p>
                </div>
                <p className="tnum text-right text-[0.8rem] text-muted">
                  {last.correct} right · {last.wrong} wrong
                  <br />
                  {formatClock(last.durationUsedSeconds)} used
                </p>
              </div>
            </Link>
          )}

          <ol className="space-y-0 border-t border-line">
            {STEPS.map((step, i) => (
              <li
                key={step}
                className="flex gap-4 border-b border-line py-4 text-[0.95rem]"
              >
                <span className="tnum w-4 shrink-0 text-muted">{i + 1}</span>
                <span className="leading-snug">{step}</span>
              </li>
            ))}
          </ol>

          <p className="pt-6 text-[0.85rem] leading-relaxed text-muted">
            Nothing leaves this device. Papers, answers and every past score sit
            in this browser&rsquo;s storage.
          </p>
        </div>
      </div>

      <div className="lg:hidden">
        <ActionBar>
          {ready && session ? (
            <div className="space-y-2">
              <LinkButton href="/exam">Resume exam in progress</LinkButton>
              <LinkButton href="/configure" variant="secondary">
                Start a new one instead
              </LinkButton>
            </div>
          ) : (
            <LinkButton href="/configure">Build a mock test</LinkButton>
          )}
        </ActionBar>
      </div>
    </Screen>
  );
}
