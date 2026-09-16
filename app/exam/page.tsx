"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { formatClock, scoreSession } from "@/lib/scoring";
import { storage } from "@/lib/storage";
import type { ExamSession, OptionKey } from "@/lib/types";

const OPTION_KEYS: OptionKey[] = ["A", "B", "C", "D"];

export default function ExamPage() {
  const router = useRouter();
  const [session, setSession] = useState<ExamSession | null>(null);
  const [index, setIndex] = useState(0);
  const [remaining, setRemaining] = useState(0);
  const [sheet, setSheet] = useState<"none" | "palette" | "submit">("none");
  const submitted = useRef(false);

  useEffect(() => {
    const live = storage.getSession();
    if (!live) {
      router.replace("/");
      return;
    }
    setSession(live);
    setRemaining(Math.max(0, Math.round((live.endsAt - Date.now()) / 1000)));
  }, [router]);

  const finish = useCallback(
    (reason: "manual" | "timeout") => {
      if (submitted.current || !session) return;
      submitted.current = true;
      const result = scoreSession(session, reason);
      storage.saveResult(result);
      storage.clearSession();
      router.replace(`/result?id=${result.id}`);
    },
    [router, session],
  );

  useEffect(() => {
    if (!session) return;
    const tick = () => {
      const left = Math.max(
        0,
        Math.round((session.endsAt - Date.now()) / 1000),
      );
      setRemaining(left);
      if (left === 0) finish("timeout");
    };
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [session, finish]);

  const update = useCallback((next: ExamSession) => {
    setSession(next);
    storage.setSession(next);
  }, []);

  const setAnswer = useCallback((questionId: number, value: string) => {
    setSession((prev) => {
      if (!prev) return prev;
      const next = {
        ...prev,
        answers: { ...prev.answers, [questionId]: value },
      };
      storage.setSession(next);
      return next;
    });
  }, []);

  /** Physical keyboards only exist on laptops, so wire them up there. */
  useEffect(() => {
    if (!session) return;
    const questions = session.paper.questions;

    const onKey = (event: KeyboardEvent) => {
      const el = event.target as HTMLElement | null;
      if (
        el &&
        (el.isContentEditable ||
          el.tagName === "TEXTAREA" ||
          el.tagName === "INPUT")
      ) {
        return;
      }
      if (event.metaKey || event.ctrlKey || event.altKey) return;

      const question = questions[index];
      if (!question) return;

      if (event.key === "ArrowRight") {
        event.preventDefault();
        setIndex((i) => Math.min(questions.length - 1, i + 1));
        return;
      }
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        setIndex((i) => Math.max(0, i - 1));
        return;
      }
      if (question.type !== "mcq") return;

      const keyed: Record<string, OptionKey> = {
        "1": "A",
        "2": "B",
        "3": "C",
        "4": "D",
        a: "A",
        b: "B",
        c: "C",
        d: "D",
      };
      const choice = keyed[event.key.toLowerCase()];
      if (choice) {
        event.preventDefault();
        setAnswer(question.id, choice);
      }
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [session, index, setAnswer]);

  if (!session) return <main className="min-h-dvh" />;

  const questions = session.paper.questions;
  const question = questions[index];
  const total = questions.length;
  const answeredCount = questions.filter((q) => {
    const a = session.answers[q.id];
    return typeof a === "string" && a.trim().length > 0;
  }).length;
  const flagged = new Set(session.flagged);
  const urgent = remaining <= 60;

  function answer(value: string) {
    update({
      ...session!,
      answers: { ...session!.answers, [question.id]: value },
    });
  }

  function clearAnswer() {
    const next = { ...session!.answers };
    delete next[question.id];
    update({ ...session!, answers: next });
  }

  function toggleFlag() {
    const list = flagged.has(question.id)
      ? session!.flagged.filter((id) => id !== question.id)
      : [...session!.flagged, question.id];
    update({ ...session!, flagged: list });
  }

  function go(to: number) {
    setIndex(Math.max(0, Math.min(total - 1, to)));
    setSheet("none");
    window.scrollTo({ top: 0 });
  }

  const currentAnswer = session.answers[question.id] ?? "";

  return (
    <main className="mx-auto min-h-dvh w-full max-w-[34rem] px-5 pb-36 lg:max-w-[62rem] lg:px-8 lg:pb-16">
      <header
        className="sticky top-0 z-10 -mx-5 flex items-center justify-between gap-3 border-b border-line bg-paper/90 px-5 pb-3 backdrop-blur-xl lg:static lg:-mx-8 lg:border-0 lg:px-8 lg:pb-0 lg:backdrop-blur-none"
        style={{ paddingTop: "max(0.85rem, env(safe-area-inset-top))" }}
      >
        <div>
          <p className="tnum text-[0.95rem] font-medium tracking-tight">
            {index + 1}
            <span className="text-muted"> / {total}</span>
          </p>
          <p className="truncate text-[0.75rem] text-muted">
            {question.subject}
          </p>
        </div>
        <div className="flex items-center gap-2 lg:hidden">
          <span
            className={`tnum rounded-full px-3 py-1.5 text-[0.95rem] font-medium ${
              urgent ? "bg-bad text-paper" : "border border-line"
            }`}
            aria-live="off"
          >
            {formatClock(remaining)}
          </span>
          <button
            type="button"
            onClick={() => setSheet("palette")}
            className="flex size-10 items-center justify-center rounded-full border border-line"
            aria-label="All questions"
          >
            <svg viewBox="0 0 24 24" className="size-4.5" aria-hidden="true">
              <g fill="currentColor">
                <rect x="4" y="4" width="6" height="6" rx="1.5" />
                <rect x="14" y="4" width="6" height="6" rx="1.5" />
                <rect x="4" y="14" width="6" height="6" rx="1.5" />
                <rect x="14" y="14" width="6" height="6" rx="1.5" />
              </g>
            </svg>
          </button>
        </div>
      </header>

      <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_17rem] lg:items-start lg:gap-12">
        <article className="pt-7 lg:pt-8">
          <p className="text-[1.08rem] leading-[1.5] tracking-tight whitespace-pre-wrap">
            {question.question}
          </p>

          {question.type === "mcq" ? (
            <div className="mt-6 space-y-2.5">
              {OPTION_KEYS.map((key) => {
                const chosen = currentAnswer === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => answer(key)}
                    aria-pressed={chosen}
                    className={`flex w-full items-start gap-3.5 rounded-2xl border p-4 text-left transition-colors ${
                      chosen
                        ? "border-ink bg-ink text-paper"
                        : "border-line bg-raised hover:border-ink/35"
                    }`}
                  >
                    <span
                      className={`tnum mt-px flex size-6 shrink-0 items-center justify-center rounded-full text-[0.78rem] font-medium ${
                        chosen ? "bg-paper text-ink" : "border border-line"
                      }`}
                    >
                      {key}
                    </span>
                    <span className="text-[0.95rem] leading-snug">
                      {question.options[key]}
                    </span>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="mt-6">
              <textarea
                value={currentAnswer}
                onChange={(e) => answer(e.target.value)}
                placeholder="Write your answer here"
                className="h-72 w-full resize-y rounded-3xl border border-line bg-raised p-4 text-[0.95rem] leading-relaxed outline-none placeholder:text-muted/60"
              />
              <div className="tnum mt-2 flex justify-between text-[0.8rem] text-muted">
                <span>
                  {currentAnswer.trim()
                    ? currentAnswer.trim().split(/\s+/).length
                    : 0}{" "}
                  words
                  {question.wordLimit ? ` of ${question.wordLimit}` : ""}
                </span>
                <span>{question.marks} marks · you grade this one</span>
              </div>
              {question.guidelines && (
                <p className="mt-3 text-[0.85rem] leading-snug text-muted">
                  {question.guidelines}
                </p>
              )}
            </div>
          )}

          <p className="tnum mt-4 hidden text-[0.8rem] text-muted lg:block">
            Keys 1&ndash;4 or A&ndash;D to answer, arrows to move
          </p>

          <div className="mt-5 flex items-center gap-4 text-[0.85rem]">
            <button
              type="button"
              onClick={toggleFlag}
              className={flagged.has(question.id) ? "text-flag" : "text-muted"}
            >
              {flagged.has(question.id)
                ? "Marked for review"
                : "Mark for review"}
            </button>
            {currentAnswer && (
              <button
                type="button"
                onClick={clearAnswer}
                className="text-muted"
              >
                Clear answer
              </button>
            )}
          </div>

          <nav
            className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-paper/90 backdrop-blur-xl lg:static lg:border-0 lg:bg-transparent lg:backdrop-blur-none"
            style={{
              paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))",
            }}
          >
            <div className="mx-auto flex w-full max-w-[34rem] items-center gap-2.5 px-5 pt-3 lg:mx-0 lg:max-w-[22rem] lg:px-0 lg:pt-8">
              <button
                type="button"
                onClick={() => go(index - 1)}
                disabled={index === 0}
                className="flex min-h-[3.25rem] flex-1 items-center justify-center rounded-2xl border border-line bg-raised text-[0.95rem] disabled:opacity-35"
              >
                Back
              </button>
              {index === total - 1 ? (
                <button
                  type="button"
                  onClick={() => setSheet("submit")}
                  className="flex min-h-[3.25rem] flex-[1.6] items-center justify-center rounded-2xl bg-ink text-[0.95rem] font-medium text-paper"
                >
                  Submit exam
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => go(index + 1)}
                  className="flex min-h-[3.25rem] flex-[1.6] items-center justify-center rounded-2xl bg-ink text-[0.95rem] font-medium text-paper"
                >
                  Next
                </button>
              )}
            </div>
          </nav>
        </article>

        <aside className="hidden lg:sticky lg:top-8 lg:block">
          <div className="rounded-3xl border border-line bg-raised p-5">
            <p
              className={`tnum text-[2.5rem] leading-none font-semibold tracking-tight ${
                urgent ? "text-bad" : ""
              }`}
            >
              {formatClock(remaining)}
            </p>
            <p className="tnum mt-2 text-[0.82rem] text-muted">
              {answeredCount} of {total} answered
            </p>

            <div className="mt-5 grid grid-cols-5 gap-2">
              {questions.map((q, i) => {
                const a = session.answers[q.id];
                const done = typeof a === "string" && a.trim().length > 0;
                return (
                  <button
                    key={q.id}
                    type="button"
                    onClick={() => go(i)}
                    className={`tnum relative flex aspect-square items-center justify-center rounded-lg text-[0.78rem] transition-opacity hover:opacity-80 ${
                      i === index ? "ring-2 ring-ink" : ""
                    } ${
                      done
                        ? "bg-ink text-paper"
                        : "border border-line text-muted"
                    }`}
                  >
                    {i + 1}
                    {flagged.has(q.id) && (
                      <span className="absolute top-1 right-1 size-1.5 rounded-full bg-flag" />
                    )}
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={() => setSheet("submit")}
              className="mt-5 flex min-h-[2.75rem] w-full items-center justify-center rounded-xl border border-line text-[0.9rem] transition-colors hover:bg-line/40"
            >
              Submit exam
            </button>
          </div>
        </aside>
      </div>

      {sheet !== "none" && (
        <div
          className="fixed inset-0 z-30 flex items-end bg-ink/40 lg:items-center lg:justify-center lg:p-8"
          onClick={() => setSheet("none")}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="max-h-[80dvh] w-full overflow-auto rounded-t-[1.75rem] border-t border-line bg-paper px-5 pt-5 lg:max-w-[26rem] lg:rounded-[1.75rem] lg:border lg:px-6 lg:pb-6"
            style={{
              paddingBottom: "max(1.25rem, env(safe-area-inset-bottom))",
            }}
          >
            {sheet === "palette" ? (
              <>
                <div className="flex items-baseline justify-between">
                  <h2 className="text-[1.1rem] font-medium tracking-tight">
                    All questions
                  </h2>
                  <span className="tnum text-[0.85rem] text-muted">
                    {answeredCount} of {total} answered
                  </span>
                </div>
                <div className="mt-5 grid grid-cols-6 gap-2.5">
                  {questions.map((q, i) => {
                    const a = session.answers[q.id];
                    const done = typeof a === "string" && a.trim().length > 0;
                    const isFlagged = flagged.has(q.id);
                    return (
                      <button
                        key={q.id}
                        type="button"
                        onClick={() => go(i)}
                        className={`tnum relative flex aspect-square items-center justify-center rounded-xl text-[0.85rem] ${
                          i === index ? "ring-2 ring-ink" : ""
                        } ${
                          done
                            ? "bg-ink text-paper"
                            : "border border-line bg-raised text-muted"
                        }`}
                      >
                        {i + 1}
                        {isFlagged && (
                          <span className="absolute top-1 right-1 size-1.5 rounded-full bg-flag" />
                        )}
                      </button>
                    );
                  })}
                </div>
                <div className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-[0.8rem] text-muted">
                  <span className="flex items-center gap-2">
                    <span className="size-3 rounded bg-ink" /> Answered
                  </span>
                  <span className="flex items-center gap-2">
                    <span className="size-3 rounded border border-line" /> Not
                    answered
                  </span>
                  <span className="flex items-center gap-2">
                    <span className="size-1.5 rounded-full bg-flag" /> Marked
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setSheet("submit")}
                  className="mt-6 flex min-h-[3.25rem] w-full items-center justify-center rounded-2xl border border-line text-[0.95rem]"
                >
                  Submit exam
                </button>
              </>
            ) : (
              <>
                <h2 className="text-[1.3rem] font-semibold tracking-tight">
                  Submit with {formatClock(remaining)} left?
                </h2>
                <div className="mt-4 border-t border-line">
                  {[
                    ["Questions", total],
                    ["Answered", answeredCount],
                    ["Left blank", total - answeredCount],
                    ["Marked for review", session.flagged.length],
                  ].map(([label, value]) => (
                    <div
                      key={String(label)}
                      className="flex justify-between border-b border-line py-3 text-[0.92rem]"
                    >
                      <span className="text-muted">{label}</span>
                      <span className="tnum font-medium">{value}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-5 space-y-2.5">
                  <button
                    type="button"
                    onClick={() => finish("manual")}
                    className="flex min-h-[3.25rem] w-full items-center justify-center rounded-2xl bg-ink text-[0.95rem] font-medium text-paper"
                  >
                    Submit and see score
                  </button>
                  <button
                    type="button"
                    onClick={() => setSheet("none")}
                    className="flex min-h-[3.25rem] w-full items-center justify-center rounded-2xl border border-line text-[0.95rem]"
                  >
                    Keep going
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
