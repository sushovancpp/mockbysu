"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ActionBar, Button, Screen, TopBar } from "@/components/ui";
import { distribute, SUBJECTS } from "@/lib/subjects";
import { storage } from "@/lib/storage";
import type { SubjectId } from "@/lib/types";

type Unit = "minutes" | "hours";

const MAX_QUESTIONS = 300;

export default function Configure() {
  const router = useRouter();
  const [selected, setSelected] = useState<SubjectId[]>(["pk"]);
  const [count, setCount] = useState("30");
  const [duration, setDuration] = useState("30");
  const [unit, setUnit] = useState<Unit>("minutes");
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const saved = storage.getConfig();
    if (saved) {
      setSelected(saved.subjects);
      setCount(String(saved.questionCount));
      if (saved.durationMinutes % 60 === 0 && saved.durationMinutes >= 60) {
        setUnit("hours");
        setDuration(String(saved.durationMinutes / 60));
      } else {
        setDuration(String(saved.durationMinutes));
      }
    }
    setLoaded(true);
  }, []);

  const questionCount = Number.parseInt(count, 10);
  const durationValue = Number.parseFloat(duration);
  const minutes =
    Number.isFinite(durationValue) && durationValue > 0
      ? Math.round(unit === "hours" ? durationValue * 60 : durationValue)
      : 0;

  const countValid =
    Number.isInteger(questionCount) &&
    questionCount >= 1 &&
    questionCount <= MAX_QUESTIONS;
  const durationValid = minutes >= 1 && minutes <= 600;
  const canContinue = selected.length > 0 && countValid && durationValid;

  const split = useMemo(
    () => (canContinue ? distribute(selected, questionCount) : {}),
    [canContinue, selected, questionCount],
  );

  function toggle(id: SubjectId) {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id],
    );
  }

  function submit() {
    if (!canContinue) return;
    storage.setConfig({
      subjects: selected,
      questionCount,
      durationMinutes: minutes,
      distribution: split,
    });
    storage.clearPaper();
    router.push("/prompt");
  }

  if (!loaded) return <Screen>{null}</Screen>;

  return (
    <Screen wide>
      <TopBar title="Set up the paper" step="Step 1 of 4" back="/" />

      <div className="lg:grid lg:grid-cols-2 lg:items-start lg:gap-14">
        <section className="pt-6">
          <h2 className="text-[1.6rem] leading-tight font-semibold tracking-tight">
            What do you want to practise?
          </h2>

          <div className="mt-5 overflow-hidden rounded-3xl border border-line bg-raised">
            {SUBJECTS.map((s, i) => {
              const on = selected.includes(s.id);
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => toggle(s.id)}
                  aria-pressed={on}
                  className={`flex w-full items-start gap-4 p-4 text-left transition-colors hover:bg-line/30 ${
                    i > 0 ? "border-t border-line" : ""
                  }`}
                >
                  <span
                    className={`mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-lg border ${
                      on ? "border-ink bg-ink text-paper" : "border-line"
                    }`}
                  >
                    {on && (
                      <svg
                        viewBox="0 0 24 24"
                        className="size-4"
                        aria-hidden="true"
                      >
                        <path
                          d="M5 12.5l4.5 4.5L19 7"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.25"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-baseline justify-between gap-3">
                      <span className="text-[0.98rem] font-medium tracking-tight">
                        {s.name}
                      </span>
                      <span className="tnum shrink-0 text-[0.8rem] text-muted">
                        {s.kind === "descriptive"
                          ? `${s.marks} marks`
                          : `+${s.marks} / −${s.marks / 4}`}
                      </span>
                    </span>
                    <span className="mt-1 block text-[0.83rem] leading-snug text-muted">
                      {s.blurb}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        <div>
          <section className="pt-9 lg:pt-6">
            <h2 className="text-[1.6rem] leading-tight font-semibold tracking-tight">
              How long is it?
            </h2>

            <div className="mt-5 space-y-3">
              <label className="block rounded-3xl border border-line bg-raised p-4">
                <span className="text-[0.85rem] text-muted">Questions</span>
                <input
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={MAX_QUESTIONS}
                  value={count}
                  onChange={(e) => setCount(e.target.value)}
                  placeholder="69"
                  className="tnum mt-1 w-full bg-transparent text-[2rem] font-semibold tracking-tight outline-none"
                />
              </label>

              <div className="flex gap-3">
                <label className="flex-1 rounded-3xl border border-line bg-raised p-4">
                  <span className="text-[0.85rem] text-muted">Time</span>
                  <input
                    type="number"
                    inputMode="decimal"
                    min={1}
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                    placeholder="30"
                    className="tnum mt-1 w-full bg-transparent text-[2rem] font-semibold tracking-tight outline-none"
                  />
                </label>
                <label className="flex w-[8.5rem] flex-col justify-end rounded-3xl border border-line bg-raised p-4">
                  <span className="text-[0.85rem] text-muted">Unit</span>
                  <select
                    value={unit}
                    onChange={(e) => setUnit(e.target.value as Unit)}
                    className="mt-1 w-full appearance-none bg-transparent py-1 text-[1.05rem] font-medium tracking-tight outline-none"
                  >
                    <option value="minutes">Minutes</option>
                    <option value="hours">Hours</option>
                  </select>
                </label>
              </div>
            </div>

            {!countValid && count.trim() !== "" && (
              <p className="pt-3 text-[0.85rem] text-bad">
                Enter a whole number between 1 and {MAX_QUESTIONS}.
              </p>
            )}
            {!durationValid && duration.trim() !== "" && (
              <p className="pt-2 text-[0.85rem] text-bad">
                Enter a time between 1 minute and 10 hours.
              </p>
            )}
          </section>

          {canContinue && (
            <section className="pt-9 lg:pt-8">
              <p className="text-[0.85rem] text-muted">
                {questionCount} questions across {selected.length} subject
                {selected.length === 1 ? "" : "s"}, {minutes} minute
                {minutes === 1 ? "" : "s"} on the clock.
              </p>
              <ul className="mt-3 border-t border-line">
                {Object.entries(split).map(([name, n]) => (
                  <li
                    key={name}
                    className="flex items-baseline justify-between border-b border-line py-3 text-[0.92rem]"
                  >
                    <span>{name}</span>
                    <span className="tnum text-muted">{n}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      </div>

      <ActionBar>
        <Button full onClick={submit} disabled={!canContinue}>
          Generate the prompt
        </Button>
      </ActionBar>
    </Screen>
  );
}
