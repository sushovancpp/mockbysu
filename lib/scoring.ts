import { penaltyFor } from "./subjects";
import type { ExamResult, ExamSession, SubjectScore } from "./types";

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function scoreSession(
  session: ExamSession,
  reason: "manual" | "timeout",
  finishedAt = Date.now(),
): ExamResult {
  const bySubject = new Map<string, SubjectScore>();
  let score = 0;
  let maxScore = 0;
  let correct = 0;
  let wrong = 0;
  let skipped = 0;
  let attempted = 0;
  let descriptiveCount = 0;

  for (const q of session.paper.questions) {
    const row = bySubject.get(q.subject) ?? {
      subject: q.subject,
      total: 0,
      attempted: 0,
      correct: 0,
      wrong: 0,
      skipped: 0,
      score: 0,
      maxScore: 0,
    };
    row.total += 1;

    const answer = session.answers[q.id];
    const answered = typeof answer === "string" && answer.trim().length > 0;

    if (q.type === "descriptive") {
      descriptiveCount += 1;
      if (answered) {
        row.attempted += 1;
        attempted += 1;
      } else {
        row.skipped += 1;
        skipped += 1;
      }
      bySubject.set(q.subject, row);
      continue;
    }

    row.maxScore += q.marks;
    maxScore += q.marks;

    if (!answered) {
      row.skipped += 1;
      skipped += 1;
    } else if (answer === q.correctAnswer) {
      row.attempted += 1;
      row.correct += 1;
      row.score += q.marks;
      attempted += 1;
      correct += 1;
      score += q.marks;
    } else {
      const penalty = penaltyFor(q.marks);
      row.attempted += 1;
      row.wrong += 1;
      row.score -= penalty;
      attempted += 1;
      wrong += 1;
      score -= penalty;
    }
    bySubject.set(q.subject, row);
  }

  const mcqAttempted = correct + wrong;

  return {
    id: session.id,
    finishedAt,
    reason,
    config: session.config,
    paper: session.paper,
    answers: session.answers,
    durationUsedSeconds: Math.max(
      0,
      Math.round((finishedAt - session.startedAt) / 1000),
    ),
    score: round2(score),
    maxScore: round2(maxScore),
    totalQuestions: session.paper.questions.length,
    attempted,
    correct,
    wrong,
    skipped,
    accuracy: mcqAttempted === 0 ? 0 : round2((correct / mcqAttempted) * 100),
    subjects: [...bySubject.values()].map((s) => ({
      ...s,
      score: round2(s.score),
      maxScore: round2(s.maxScore),
    })),
    descriptiveCount,
  };
}

export function formatClock(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(sec)}` : `${pad(m)}:${pad(sec)}`;
}
