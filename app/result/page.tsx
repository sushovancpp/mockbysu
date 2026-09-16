"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { ActionBar, LinkButton, Screen, Stat, TopBar } from "@/components/ui";
import { formatClock } from "@/lib/scoring";
import { storage } from "@/lib/storage";
import type { ExamResult } from "@/lib/types";

type Tab = "summary" | "review";

function ResultContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams.get("id");
  const [result, setResult] = useState<ExamResult | null>(null);
  const [tab, setTab] = useState<Tab>("summary");
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!id) {
      router.replace("/history");
      return;
    }
    const found = storage.getResult(id);
    if (!found) {
      router.replace("/history");
      return;
    }
    setResult(found);
    setLoaded(true);
  }, [id, router]);

  if (!loaded || !result) return <Screen>{null}</Screen>;

  const percent =
    result.maxScore > 0
      ? Math.round((result.score / result.maxScore) * 1000) / 10
      : 0;

  return (
    <Screen wide>
      <TopBar
        title={result.paper.exam}
        step={new Date(result.finishedAt).toLocaleString()}
        back="/"
      />

      <section className="pt-10 pb-8">
        <p className="text-[0.85rem] text-muted">
          {result.reason === "timeout" ? "Time ran out" : "You submitted"} after{" "}
          {formatClock(result.durationUsedSeconds)}
        </p>
        <p className="tnum mt-2 text-[4rem] leading-none font-semibold tracking-[-0.04em] lg:text-[5.5rem]">
          {result.score}
        </p>
        <p className="tnum mt-2 text-[0.95rem] text-muted">
          out of {result.maxScore} · {percent}%
        </p>
      </section>

      <div className="flex gap-1 rounded-2xl border border-line bg-raised p-1 lg:hidden">
        {(["summary", "review"] as Tab[]).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`flex-1 rounded-xl py-2.5 text-[0.9rem] ${
              tab === t ? "bg-ink text-paper" : "text-muted"
            }`}
          >
            {t === "summary" ? "Summary" : "Review"}
          </button>
        ))}
      </div>

      <div className="lg:grid lg:grid-cols-2 lg:items-start lg:gap-14">
        <section
          className={`pt-6 ${tab === "summary" ? "" : "hidden"} lg:block`}
        >
          <div className="border-t border-line">
            <Stat label="Questions" value={result.totalQuestions} />
            <Stat label="Attempted" value={result.attempted} />
            <Stat label="Correct" value={result.correct} />
            <Stat label="Wrong" value={result.wrong} />
            <Stat label="Left blank" value={result.skipped} />
            <Stat label="Accuracy" value={`${result.accuracy}%`} />
          </div>

          <h2 className="pt-8 text-[1.1rem] font-medium tracking-tight">
            By subject
          </h2>
          <div className="mt-3 space-y-3">
            {result.subjects.map((s) => {
              const share =
                s.maxScore > 0 ? Math.max(0, s.score / s.maxScore) : 0;
              return (
                <div
                  key={s.subject}
                  className="rounded-2xl border border-line bg-raised p-4"
                >
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="text-[0.95rem] font-medium tracking-tight">
                      {s.subject}
                    </span>
                    <span className="tnum text-[0.95rem]">
                      {s.maxScore > 0 ? (
                        <>
                          {s.score}
                          <span className="text-muted"> / {s.maxScore}</span>
                        </>
                      ) : (
                        <span className="text-muted">not scored</span>
                      )}
                    </span>
                  </div>
                  {s.maxScore > 0 && (
                    <div className="mt-3 h-1 overflow-hidden rounded-full bg-line">
                      <div
                        className="h-full rounded-full bg-ink"
                        style={{ width: `${Math.min(100, share * 100)}%` }}
                      />
                    </div>
                  )}
                  <p className="tnum mt-2.5 text-[0.82rem] text-muted">
                    {s.correct} right · {s.wrong} wrong · {s.skipped} blank
                  </p>
                </div>
              );
            })}
          </div>

          {result.descriptiveCount > 0 && (
            <p className="pt-6 text-[0.85rem] leading-relaxed text-muted">
              {result.descriptiveCount} descriptive answer
              {result.descriptiveCount === 1 ? " is" : "s are"} kept in the
              review tab and left out of the score. Paste them back into a
              chatbot with the question if you want them graded.
            </p>
          )}
        </section>

        <section
          className={`space-y-3 pt-6 ${tab === "review" ? "" : "hidden"} lg:block`}
        >
          <h2 className="hidden text-[1.1rem] font-medium tracking-tight lg:block">
            Every question
          </h2>
          {result.paper.questions.map((q, i) => {
            const given = result.answers[q.id];
            const answered =
              typeof given === "string" && given.trim().length > 0;
            const correct = q.type === "mcq" && given === q.correctAnswer;
            const tone = !answered
              ? "border-line"
              : correct
                ? "border-good/45"
                : q.type === "mcq"
                  ? "border-bad/45"
                  : "border-line";
            return (
              <div
                key={q.id}
                className={`rounded-2xl border bg-raised p-4 ${tone}`}
              >
                <p className="tnum text-[0.78rem] text-muted">
                  {i + 1} · {q.subject}
                  {!answered
                    ? " · blank"
                    : q.type === "mcq"
                      ? correct
                        ? " · correct"
                        : " · wrong"
                      : " · written"}
                </p>
                <p className="mt-2 text-[0.95rem] leading-snug whitespace-pre-wrap">
                  {q.question}
                </p>

                {q.type === "mcq" ? (
                  <ul className="mt-3 space-y-1.5">
                    {(
                      Object.keys(q.options) as Array<keyof typeof q.options>
                    ).map((key) => {
                      const isRight = key === q.correctAnswer;
                      const isYours = key === given;
                      return (
                        <li
                          key={key}
                          className={`flex gap-2.5 rounded-xl px-3 py-2 text-[0.88rem] leading-snug ${
                            isRight
                              ? "bg-good/12 text-good"
                              : isYours
                                ? "bg-bad/12 text-bad"
                                : "text-muted"
                          }`}
                        >
                          <span className="tnum w-3 shrink-0">{key}</span>
                          <span>{q.options[key]}</span>
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <p className="mt-3 rounded-xl border border-line p-3 text-[0.88rem] leading-relaxed whitespace-pre-wrap text-muted">
                    {answered ? given : "Left blank"}
                  </p>
                )}

                {q.type === "mcq" && q.explanation && (
                  <p className="mt-3 text-[0.85rem] leading-relaxed text-muted">
                    {q.explanation}
                  </p>
                )}
              </div>
            );
          })}
        </section>
      </div>

      <p className="pt-8 text-center text-[0.85rem] text-muted lg:text-left">
        <Link href="/history" className="underline underline-offset-4">
          All attempts
        </Link>
      </p>

      <ActionBar>
        <div className="space-y-2">
          <LinkButton href="/configure">Build another paper</LinkButton>
          <LinkButton href="/" variant="secondary">
            Home
          </LinkButton>
        </div>
      </ActionBar>
    </Screen>
  );
}

export default function ResultPage() {
  return (
    <Suspense fallback={<Screen>{null}</Screen>}>
      <ResultContent />
    </Suspense>
  );
}