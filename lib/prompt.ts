import { SUBJECT_BY_NAME, penaltyFor } from "./subjects";
import type { ExamConfig } from "./types";

const PK_SYLLABUS = [
  "Database management systems (SQL, normalisation, transactions, indexing)",
  "Data structures and algorithms (complexity, trees, graphs, sorting)",
  "Operating systems (scheduling, deadlocks, memory, file systems)",
  "Computer networks (OSI/TCP-IP, routing, subnetting, protocols)",
  "Software engineering (SDLC, testing, agile, UML)",
  "Object-oriented programming and basic programming concepts",
  "Web technologies and client-server architecture ",
  "Information security and cryptography",
  "Cloud computing, virtualisation and emerging technologies",
  "Data warehousing, big data and basic AI/ML concepts",
];

export function buildPrompt(config: ExamConfig): string {
  const entries = Object.entries(config.distribution).filter(([, n]) => n > 0);
  const hasDescriptive = entries.some(
    ([name]) => SUBJECT_BY_NAME[name]?.kind === "descriptive",
  );
  const hasPK = entries.some(([name]) => name === "Professional Knowledge");

  const distributionLines = entries
    .map(([name, n]) => {
      const meta = SUBJECT_BY_NAME[name];
      const scheme =
        meta.kind === "descriptive"
          ? `${meta.marks} marks each, written answer, no negative marking`
          : `${meta.marks} mark${meta.marks > 1 ? "s" : ""} each, −${penaltyFor(
              meta.marks,
            )} for a wrong answer`;
      return `- ${name}: ${n} question${n === 1 ? "" : "s"} (${scheme})`;
    })
    .join("\n");

  const mcqNames = entries
    .filter(([name]) => SUBJECT_BY_NAME[name]?.kind === "mcq")
    .map(([name]) => name);

  const hasMcq = mcqNames.length > 0;
  const mcqExampleSubject = mcqNames[0];

  const mcqExample = hasMcq
    ? `{
      "id": 1,
      "type": "mcq",
      "subject": "${mcqExampleSubject}",
      "question": "Full question text, self-contained.",
      "options": { "A": "…", "B": "…", "C": "…", "D": "…" },
      "correctAnswer": "B",
      "marks": ${SUBJECT_BY_NAME[mcqExampleSubject].marks},
      "explanation": "One or two sentences on why B is correct."
    }`
    : null;

  const descriptiveExample = hasDescriptive
    ? `{
      "id": ${hasMcq ? 2 : 1},
      "type": "descriptive",
      "subject": "English Descriptive",
      "question": "Full writing task with the situation and what to produce.",
      "marks": 10,
      "wordLimit": 150,
      "guidelines": "What a full-marks answer must contain."
    }`
    : null;

  const exampleQuestions = [mcqExample, descriptiveExample]
    .filter((q): q is string => q !== null)
    .join(",\n    ");

  const sample = `{
  "exam": "IBPS SO IT",
  "duration": ${config.durationMinutes},
  "questions": [
    ${exampleQuestions}
  ]
}`;

  return `You are setting a mock paper for the IBPS SO (Specialist Officer) — IT Officer Scale I examination. Produce the paper as a single JSON object and nothing else.

PAPER
Exam: IBPS SO IT
Total questions: ${config.questionCount}
Time limit: ${config.durationMinutes} minute${config.durationMinutes === 1 ? "" : "s"}

QUESTIONS PER SUBJECT (follow these counts exactly)
${distributionLines}

CONTENT RULES
- Match the real IBPS SO IT standard: moderate difficulty overall, with roughly 20% easy, 20% moderate and 60% hard questions spread across the paper.
- Every question must be self-contained. Do not refer to a passage, figure or table unless you include it in full inside the "question" text.${
    hasPK
      ? `
- Professional Knowledge must stay inside the IT Officer syllabus and rotate across these areas rather than clustering on one: ${PK_SYLLABUS.join("; ")}.`
      : ""
  }
- Exactly one option is correct. The other three must be plausible distractors, not obvious filler.
- Keep option texts short, mutually exclusive, and free of "All of the above" / "None of the above" unless the concept genuinely requires it.
- No repeated questions, no rephrased duplicates, no answer-key pattern (do not make B correct every time — spread the correct option roughly evenly across A, B, C and D).
- Use plain text only. No markdown, no LaTeX, no HTML inside any field.

OUTPUT FORMAT
Return one JSON object. No commentary before or after it, no markdown code fences, no trailing commas.

${sample}

FIELD RULES
- "id": integers from 1 to ${config.questionCount}, consecutive, no gaps, no duplicates.
- "type": "mcq" or "descriptive".
- "subject": exactly one of ${entries.map(([n]) => `"${n}"`).join(", ")} — spelled exactly as written.
- "options": required for mcq, exactly the four keys A, B, C, D, all non-empty.
- "correctAnswer": required for mcq, one of "A", "B", "C", "D".
- "marks": must match the subject's marks listed above.
- "explanation": optional but preferred for mcq.${
    hasDescriptive
      ? `
- Descriptive questions have no "options" and no "correctAnswer". Include "wordLimit" and "guidelines".`
      : ""
  }

BEFORE YOU ANSWER, CHECK
1. The questions array has exactly ${config.questionCount} items.
2. Per-subject counts match the list above.
3. Every id is unique and every required field is present.
4. Every correctAnswer refers to an option that exists and is actually correct.
5. The whole response parses as JSON on its own.`;
}