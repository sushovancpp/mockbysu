import type { SubjectId, SubjectMeta } from "./types";

export const SUBJECTS: SubjectMeta[] = [
  {
    id: "english",
    name: "English",
    short: "English",
    kind: "mcq",
    marks: 1,
    blurb: "Reading comprehension, error spotting, cloze, para jumbles",
  },
  {
    id: "quant",
    name: "Quantitative Aptitude",
    short: "Quant",
    kind: "mcq",
    marks: 1,
    blurb: "Arithmetic, DI, number series, simplification",
  },
  {
    id: "reasoning",
    name: "Reasoning",
    short: "Reasoning",
    kind: "mcq",
    marks: 1,
    blurb: "Puzzles, seating, syllogism, coding-decoding, inequalities",
  },
  {
    id: "descriptive",
    name: "English Descriptive",
    short: "Descriptive",
    kind: "descriptive",
    marks: 10,
    blurb: "Letter and essay writing. Typed answers, scored by you",
  },
  {
    id: "pk",
    name: "Professional Knowledge",
    short: "PK",
    kind: "mcq",
    marks: 2,
    blurb:
      "DBMS, networks, OS, data structures, software engineering, security",
  },
];

export const SUBJECT_BY_ID: Record<SubjectId, SubjectMeta> = SUBJECTS.reduce(
  (acc, s) => ({ ...acc, [s.id]: s }),
  {} as Record<SubjectId, SubjectMeta>,
);

export const SUBJECT_BY_NAME: Record<string, SubjectMeta> = SUBJECTS.reduce(
  (acc, s) => ({ ...acc, [s.name]: s }),
  {} as Record<string, SubjectMeta>,
);

/** Negative marking is always one fourth of the marks carried by the question. */
export function penaltyFor(marks: number): number {
  return marks / 4;
}

/**
 * Split a free-form question count across the chosen subjects.
 * English Descriptive is capped at 2 questions — a 60-question descriptive
 * paper makes no sense — and the remainder goes to the MCQ subjects.
 */
export function distribute(
  subjectIds: SubjectId[],
  count: number,
): Record<string, number> {
  const out: Record<string, number> = {};
  if (subjectIds.length === 0 || count <= 0) return out;

  const ordered = SUBJECTS.filter((s) => subjectIds.includes(s.id));
  const mcq = ordered.filter((s) => s.kind === "mcq");
  const descriptive = ordered.filter((s) => s.kind === "descriptive");

  let remaining = count;

  for (const s of descriptive) {
    const fair = Math.floor(count / ordered.length);
    const share = mcq.length === 0 ? remaining : Math.max(1, Math.min(2, fair));
    out[s.name] = Math.min(share, remaining);
    remaining -= out[s.name];
  }

  if (mcq.length > 0) {
    const base = Math.floor(remaining / mcq.length);
    let extra = remaining - base * mcq.length;
    for (const s of mcq) {
      const bonus = extra > 0 ? 1 : 0;
      extra -= bonus;
      out[s.name] = base + bonus;
    }
  }

  return out;
}
