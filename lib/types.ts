export type SubjectId =
  "english" | "quant" | "reasoning" | "descriptive" | "pk";

export type OptionKey = "A" | "B" | "C" | "D";

export interface SubjectMeta {
  id: SubjectId;
  /** Exact string the LLM must emit in the `subject` field. */
  name: string;
  short: string;
  kind: "mcq" | "descriptive";
  /** Marks per question. Wrong answers lose marks / 4. */
  marks: number;
  blurb: string;
}

export interface MCQQuestion {
  id: number;
  type: "mcq";
  subject: string;
  question: string;
  options: Record<OptionKey, string>;
  correctAnswer: OptionKey;
  marks: number;
  explanation?: string;
}

export interface DescriptiveQuestion {
  id: number;
  type: "descriptive";
  subject: string;
  question: string;
  marks: number;
  wordLimit?: number;
  guidelines?: string;
}

export type Question = MCQQuestion | DescriptiveQuestion;

export interface ExamPaper {
  exam: string;
  duration: number;
  questions: Question[];
}

export interface ExamConfig {
  subjects: SubjectId[];
  questionCount: number;
  /** Always stored in minutes. */
  durationMinutes: number;
  /** Per-subject question split used in the prompt. */
  distribution: Record<string, number>;
}

export interface ExamSession {
  id: string;
  config: ExamConfig;
  paper: ExamPaper;
  startedAt: number;
  endsAt: number;
  answers: Record<number, string>;
  flagged: number[];
  visited: number[];
}

export interface SubjectScore {
  subject: string;
  total: number;
  attempted: number;
  correct: number;
  wrong: number;
  skipped: number;
  score: number;
  maxScore: number;
}

export interface ExamResult {
  id: string;
  finishedAt: number;
  reason: "manual" | "timeout";
  config: ExamConfig;
  paper: ExamPaper;
  answers: Record<number, string>;
  durationUsedSeconds: number;
  score: number;
  maxScore: number;
  totalQuestions: number;
  attempted: number;
  correct: number;
  wrong: number;
  skipped: number;
  accuracy: number;
  subjects: SubjectScore[];
  /** Descriptive answers are never auto-scored. */
  descriptiveCount: number;
}
