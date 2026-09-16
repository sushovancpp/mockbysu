import { SUBJECT_BY_NAME, SUBJECTS } from "./subjects";
import type {
  DescriptiveQuestion,
  ExamConfig,
  ExamPaper,
  MCQQuestion,
  OptionKey,
  Question,
} from "./types";

export interface ValidationIssue {
  level: "error" | "warning";
  where: string;
  message: string;
  fix?: string;
}

export interface ValidationResult {
  ok: boolean;
  paper: ExamPaper | null;
  issues: ValidationIssue[];
}

const OPTION_KEYS: OptionKey[] = ["A", "B", "C", "D"];

/** Tolerate fenced or chatty LLM output by pulling out the outermost object. */
function extractJson(raw: string): string {
  let text = raw.trim();
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) text = fence[1].trim();
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start > 0 || (end >= 0 && end < text.length - 1)) {
    if (start !== -1 && end !== -1 && end > start) {
      text = text.slice(start, end + 1);
    }
  }
  return text;
}

function isString(v: unknown): v is string {
  return typeof v === "string" && v.trim().length > 0;
}

export function validatePaper(
  raw: string,
  config: ExamConfig | null,
): ValidationResult {
  const issues: ValidationIssue[] = [];
  const fail = (message: string, where = "Input", fix?: string) => ({
    ok: false,
    paper: null,
    issues: [{ level: "error" as const, where, message, fix }],
  });

  if (!raw.trim()) return fail("Nothing pasted yet.");

  let data: unknown;
  try {
    data = JSON.parse(extractJson(raw));
  } catch (err) {
    return fail(
      err instanceof Error ? err.message : "The text is not valid JSON.",
      "JSON syntax",
      "Paste the model's reply again without any text around the JSON object.",
    );
  }

  if (typeof data !== "object" || data === null || Array.isArray(data)) {
    return fail("The top level must be a JSON object.", "Structure");
  }

  const obj = data as Record<string, unknown>;
  if (!Array.isArray(obj.questions)) {
    return fail(
      'The "questions" array is missing.',
      "Structure",
      'Ask the model to return { "exam": …, "duration": …, "questions": [ … ] }.',
    );
  }
  if (obj.questions.length === 0) {
    return fail("The questions array is empty.", "Structure");
  }

  const allowedNames = config
    ? SUBJECTS.filter((s) => config.subjects.includes(s.id)).map((s) => s.name)
    : SUBJECTS.map((s) => s.name);

  const questions: Question[] = [];
  const seenIds = new Set<number>();

  obj.questions.forEach((item, index) => {
    const where = `Question ${index + 1}`;
    const err = (message: string, fix?: string) =>
      issues.push({ level: "error", where, message, fix });
    const warn = (message: string, fix?: string) =>
      issues.push({ level: "warning", where, message, fix });

    if (typeof item !== "object" || item === null || Array.isArray(item)) {
      err("This entry is not an object.");
      return;
    }
    const q = item as Record<string, unknown>;

    let id = typeof q.id === "number" ? q.id : Number(q.id);
    if (!Number.isFinite(id)) {
      warn(`No usable "id". Renumbered to ${index + 1}.`);
      id = index + 1;
    }
    if (seenIds.has(id)) {
      warn(`Duplicate id ${id}. Renumbered to ${index + 1}.`);
      id = index + 1;
    }
    while (seenIds.has(id)) id += 1;
    seenIds.add(id);

    if (!isString(q.question)) {
      err('The "question" text is missing or empty.');
      return;
    }

    const subjectName = isString(q.subject) ? q.subject.trim() : "";
    const meta = SUBJECT_BY_NAME[subjectName];
    if (!meta) {
      err(
        `Unknown subject ${subjectName ? `"${subjectName}"` : "(missing)"}.`,
        `Use one of: ${allowedNames.join(", ")}.`,
      );
      return;
    }
    if (config && !allowedNames.includes(meta.name)) {
      warn(`"${meta.name}" was not one of the subjects you chose.`);
    }

    const declaredType = isString(q.type) ? q.type.trim().toLowerCase() : "";
    const isDescriptive =
      declaredType === "descriptive" ||
      (declaredType === "" && meta.kind === "descriptive" && !q.options);

    let marks = typeof q.marks === "number" ? q.marks : Number(q.marks);
    if (!Number.isFinite(marks) || marks <= 0) {
      warn(`Marks missing. Set to ${meta.marks} for ${meta.name}.`);
      marks = meta.marks;
    } else if (!isDescriptive && marks !== meta.marks) {
      warn(`Marks were ${marks}. Corrected to ${meta.marks} for ${meta.name}.`);
      marks = meta.marks;
    }

    if (isDescriptive) {
      const wordLimit =
        typeof q.wordLimit === "number" && q.wordLimit > 0
          ? q.wordLimit
          : undefined;
      const descriptive: DescriptiveQuestion = {
        id,
        type: "descriptive",
        subject: meta.name,
        question: q.question.trim(),
        marks,
        wordLimit,
        guidelines: isString(q.guidelines) ? q.guidelines.trim() : undefined,
      };
      questions.push(descriptive);
      return;
    }

    const rawOptions = q.options;
    if (
      typeof rawOptions !== "object" ||
      rawOptions === null ||
      Array.isArray(rawOptions)
    ) {
      err('The "options" object is missing.', 'Needs keys "A" to "D".');
      return;
    }
    const opts = rawOptions as Record<string, unknown>;
    const options = {} as Record<OptionKey, string>;
    let optionsOk = true;
    for (const key of OPTION_KEYS) {
      const value = opts[key] ?? opts[key.toLowerCase()];
      if (!isString(value)) {
        err(`Option ${key} is missing or empty.`);
        optionsOk = false;
      } else {
        options[key] = value.trim();
      }
    }
    if (!optionsOk) return;

    const answerRaw = isString(q.correctAnswer)
      ? q.correctAnswer.trim().toUpperCase()
      : "";
    if (!answerRaw) {
      err('The "correctAnswer" field is missing.');
      return;
    }
    if (!OPTION_KEYS.includes(answerRaw as OptionKey)) {
      err(
        `"correctAnswer" is "${q.correctAnswer}".`,
        'Use "A", "B", "C" or "D".',
      );
      return;
    }

    const mcq: MCQQuestion = {
      id,
      type: "mcq",
      subject: meta.name,
      question: q.question.trim(),
      options,
      correctAnswer: answerRaw as OptionKey,
      marks,
      explanation: isString(q.explanation) ? q.explanation.trim() : undefined,
    };
    questions.push(mcq);
  });

  const hasErrors = issues.some((i) => i.level === "error");
  if (hasErrors) return { ok: false, paper: null, issues };

  if (config && questions.length !== config.questionCount) {
    issues.push({
      level: "warning",
      where: "Question count",
      message: `You asked for ${config.questionCount}, the file has ${questions.length}.`,
      fix: "You can still start — the exam will use what was loaded.",
    });
  }

  const duration =
    typeof obj.duration === "number" && obj.duration > 0
      ? obj.duration
      : (config?.durationMinutes ?? 30);

  return {
    ok: true,
    issues,
    paper: {
      exam: isString(obj.exam) ? obj.exam.trim() : "IBPS SO IT",
      duration: config?.durationMinutes ?? duration,
      questions,
    },
  };
}
