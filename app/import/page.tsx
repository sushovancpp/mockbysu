"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ActionBar, Button, Screen, TopBar } from "@/components/ui";
import { newId, storage } from "@/lib/storage";
import { validatePaper, type ValidationResult } from "@/lib/validate";
import type { ExamConfig } from "@/lib/types";

export default function ImportPage() {
  const router = useRouter();
  const [config, setConfig] = useState<ExamConfig | null>(null);
  const [raw, setRaw] = useState("");
  const [result, setResult] = useState<ValidationResult | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const saved = storage.getConfig();
    if (!saved) {
      router.replace("/configure");
      return;
    }
    setConfig(saved);
    setLoaded(true);
  }, [router]);

  function validate() {
    setResult(validatePaper(raw, config));
  }

  async function paste() {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setRaw(text);
        setResult(validatePaper(text, config));
      }
    } catch {
      /* clipboard read is blocked — the textarea still works */
    }
  }

  function start() {
    if (!result?.ok || !result.paper || !config) return;
    const startedAt = Date.now();
    storage.setPaper(result.paper);
    storage.setSession({
      id: newId(),
      config,
      paper: result.paper,
      startedAt,
      endsAt: startedAt + config.durationMinutes * 60_000,
      answers: {},
      flagged: [],
      visited: [],
    });
    router.replace("/exam");
  }

  if (!loaded || !config) return <Screen>{null}</Screen>;

  const errors = result?.issues.filter((i) => i.level === "error") ?? [];
  const warnings = result?.issues.filter((i) => i.level === "warning") ?? [];

  return (
    <Screen>
      <TopBar title="Load the questions" step="Step 3 of 4" back="/prompt" />

      <section className="pt-6">
        <h2 className="text-[1.6rem] leading-tight font-semibold tracking-tight">
          Paste the JSON
        </h2>
        <p className="mt-3 text-[0.92rem] leading-relaxed text-muted">
          Stray text or code fences around the object are fine — they get
          stripped.
        </p>
      </section>

      <textarea
        value={raw}
        onChange={(e) => {
          setRaw(e.target.value);
          setResult(null);
        }}
        spellCheck={false}
        autoCapitalize="off"
        autoCorrect="off"
        placeholder='{ "exam": "IBPS SO IT", "questions": [ … ] }'
        className="mt-5 h-64 w-full lg:h-80 resize-y rounded-3xl border border-line bg-raised p-4 font-mono text-[0.8rem] leading-relaxed outline-none placeholder:text-muted/60"
      />

      <div className="mt-3 flex gap-3">
        <Button variant="secondary" onClick={paste} className="flex-1">
          Paste from clipboard
        </Button>
        <Button
          variant="ghost"
          onClick={() => {
            setRaw("");
            setResult(null);
          }}
          className="px-4"
        >
          Clear
        </Button>
      </div>

      {result && (
        <section className="pt-7">
          {result.ok && result.paper ? (
            <div className="rounded-3xl border border-line bg-raised p-5">
              <p className="text-[1.05rem] font-medium tracking-tight">
                {result.paper.questions.length} questions loaded
              </p>
              <p className="tnum mt-1 text-[0.88rem] text-muted">
                {config.durationMinutes} minute
                {config.durationMinutes === 1 ? "" : "s"} on the clock
              </p>
              <ul className="mt-4 border-t border-line">
                {Object.entries(
                  result.paper.questions.reduce<Record<string, number>>(
                    (acc, q) => ({
                      ...acc,
                      [q.subject]: (acc[q.subject] ?? 0) + 1,
                    }),
                    {},
                  ),
                ).map(([subject, n]) => (
                  <li
                    key={subject}
                    className="flex justify-between border-b border-line py-2.5 text-[0.9rem] last:border-0"
                  >
                    <span>{subject}</span>
                    <span className="tnum text-muted">{n}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <div className="rounded-3xl border border-bad/40 p-5">
              <p className="text-[1.05rem] font-medium tracking-tight text-bad">
                {errors.length} problem{errors.length === 1 ? "" : "s"} to fix
              </p>
              <ul className="mt-3 space-y-3">
                {errors.slice(0, 12).map((issue, i) => (
                  <li key={i} className="text-[0.88rem] leading-snug">
                    <span className="text-muted">{issue.where}: </span>
                    {issue.message}
                    {issue.fix && (
                      <span className="mt-0.5 block text-muted">
                        {issue.fix}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
              {errors.length > 12 && (
                <p className="mt-3 text-[0.85rem] text-muted">
                  and {errors.length - 12} more.
                </p>
              )}
              <p className="mt-4 text-[0.85rem] leading-snug text-muted">
                Send these lines back to the model and ask it to return the
                corrected JSON.
              </p>
            </div>
          )}

          {warnings.length > 0 && (
            <ul className="mt-4 space-y-2 border-t border-line pt-4">
              {warnings.slice(0, 8).map((issue, i) => (
                <li key={i} className="text-[0.85rem] leading-snug text-flag">
                  <span className="text-muted">{issue.where}: </span>
                  {issue.message}
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      <ActionBar>
        {result?.ok ? (
          <Button full onClick={start}>
            Start exam
          </Button>
        ) : (
          <Button full onClick={validate} disabled={!raw.trim()}>
            Check the JSON
          </Button>
        )}
      </ActionBar>
    </Screen>
  );
}
