# IBPS SO IT — Mock exam

A mobile-first exam engine for IBPS SO (IT Officer) practice. You choose the
subjects, the number of questions and the clock; the app writes a prompt for any
chatbot, validates the JSON that comes back, runs the timed paper and keeps
every attempt in the browser.

Next.js 15 (App Router) · React 19 · TypeScript (strict) · Tailwind CSS v4.
No backend, no database, no API keys.

## Run it

```bash
npm install
npm run dev     # http://localhost:3000
npm run build   # production build
npm run typecheck
```

Open it on your phone during development with `npm run dev -- -H 0.0.0.0` and
visit `http://<your-laptop-ip>:3000`.

## Flow

```
/            landing, resume in-progress exam, last score
/configure   subjects + free-form question count + free-form duration
/prompt      generated LLM prompt, copy to clipboard
/import      paste JSON, validate, start
/exam        timer, palette, answers (auto-saved every change)
/result/[id] score, subject breakdown, full review
/history     every past attempt
```

## Where the data lives

Everything is `localStorage`, written through `lib/storage.ts`:

| Key                | Holds                                                   |
| ------------------ | ------------------------------------------------------- |
| `ibps.config.v1`   | last configuration, so the setup screen reopens filled   |
| `ibps.paper.v1`    | last validated paper                                     |
| `ibps.session.v1`  | live exam: answers, flags, `startedAt` / `endsAt`        |
| `ibps.history.v1`  | up to 50 finished attempts, newest first                 |

The timer is derived from `endsAt`, not from a counter, so closing the tab or
locking the phone does not pause or reset it — reopening `/` offers to resume
and the remaining time is still correct. Answers are persisted on every tap, so
a crash costs nothing.

## Marking

Each subject carries its own marks and the penalty is always one quarter of them.

| Subject                | Correct | Wrong  |
| ---------------------- | ------- | ------ |
| English                | +1      | −0.25  |
| Quantitative Aptitude  | +1      | −0.25  |
| Reasoning              | +1      | −0.25  |
| Professional Knowledge | +2      | −0.50  |
| English Descriptive    | 10      | none   |

Blank answers score zero. English Descriptive is handled apart from the MCQ
engine: it renders a textarea with a word count, is excluded from the score and
from accuracy, and is kept in the review tab so you can grade it yourself.

## Question count and duration

Both are plain numeric inputs. Any count from 1 to 300 and any duration from
1 minute to 10 hours is accepted, in any combination — 60 questions in 1 minute
is allowed. Nothing is preset and the two values never constrain each other.

The count is split across the chosen subjects in `lib/subjects.ts`; English
Descriptive is capped at 2 questions when MCQ subjects are also selected.

## JSON contract

```json
{
  "exam": "IBPS SO IT",
  "duration": 30,
  "questions": [
    {
      "id": 1,
      "type": "mcq",
      "subject": "Professional Knowledge",
      "question": "…",
      "options": { "A": "…", "B": "…", "C": "…", "D": "…" },
      "correctAnswer": "B",
      "marks": 2,
      "explanation": "…"
    }
  ]
}
```

`lib/validate.ts` strips code fences and chatter around the object, then splits
problems into two levels. Errors block the start: unparseable JSON, a missing
`questions` array, an unknown subject, missing question text, missing or
malformed options, a missing or invalid `correctAnswer`. Warnings do not:
duplicate or missing ids get renumbered, wrong `marks` get corrected to the
subject's value, and a count that differs from what you asked for is reported
but still playable. Error messages name the question and say what to fix, so you
can paste them straight back to the model.

## Adding direct LLM calls later

`buildPrompt(config)` and `validatePaper(raw, config)` are pure functions with
no UI in them. To skip the copy-paste step, call your provider from a route
handler with `buildPrompt(config)` as the user message and feed the reply into
`validatePaper` — the rest of the app does not change.

## Phone and laptop

One codebase, two layouts, switching at Tailwind's `lg` breakpoint (1024px).

On a phone: one column capped at 34rem, the primary action pinned to the bottom
of the screen within thumb reach, and the question palette behind a bottom
sheet. On a laptop: the column widens, the pinned bar drops back into the flow
at the end of the page (a floating bar on a wide screen reads as a phone app
squeezed into a browser), and the pages that have two jobs split into two
columns — subjects beside the timing inputs, score beside the full review, the
question palette as a permanent sticky rail next to the paper.

Behaviour adapts too, not just layout. The exam takes keyboard input on a
laptop: 1&ndash;4 or A&ndash;D to answer, arrows to move between questions,
ignored while you are typing a descriptive answer. Hover states only exist
where there is a pointer. Modals are bottom sheets on a phone and centred
dialogs on a laptop.

Everything in between — tablets, split-screen windows, a resized browser — gets
the phone layout, which is the safer default at any width.

## Design notes

One typeface (Geist, with Geist Mono for the timer and every figure), a warm
paper background, ink-black type, and colour used only where it carries meaning:
red for the last minute and wrong answers, green for correct, amber for marked.
Dark mode follows the system. Actions sit in a fixed bar within thumb reach,
tap targets are at least 52px, inputs are 16px so iOS never zooms, and
`env(safe-area-inset-*)` keeps content clear of the notch and home indicator.
