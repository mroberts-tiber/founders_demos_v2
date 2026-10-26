/**
 * Scoring rules. Pure functions with no database access, so they're easy to
 * reason about and could later run in the browser for a live preview.
 *
 * Every scored answer maps to 1-5. The overall score is the weighted average
 * of scored answers, rounded to one decimal place.
 */
import type { AnswerType, ChoiceOption } from "@/db/schema";

export const SCALE_LABELS = [
  "Strongly disagree",
  "Disagree",
  "Neutral",
  "Agree",
  "Strongly agree",
] as const;

export function scoreAnswer(
  q: { answerType: AnswerType; options: ChoiceOption[] },
  value: string,
): number | null {
  switch (q.answerType) {
    case "scale": {
      const n = Number(value);
      return Number.isInteger(n) && n >= 1 && n <= 5 ? n : null;
    }
    case "yes_no":
      return value === "yes" ? 5 : value === "no" ? 1 : null;
    case "choice":
      return q.options[Number(value)]?.score ?? null;
    default:
      return null;
  }
}

export function weightedAverage(items: { score: number | null; weight: number }[]): number | null {
  const scored = items.filter((i) => i.score !== null && i.weight > 0);
  const totalWeight = scored.reduce((sum, i) => sum + i.weight, 0);
  if (totalWeight === 0) return null;
  const total = scored.reduce((sum, i) => sum + i.score! * i.weight, 0);
  return Math.round((total / totalWeight) * 10) / 10;
}

export function readiness(score: number): { label: string; summary: string } {
  if (score >= 4.5)
    return {
      label: "Acquisition ready",
      summary: "Buyers will find a well-run, well-documented business. You're in a strong position to go to market.",
    };
  if (score >= 3.5)
    return {
      label: "Nearly ready",
      summary: "The fundamentals are solid. A few targeted improvements could materially raise your valuation.",
    };
  if (score >= 2.5)
    return {
      label: "Needs work",
      summary: "Several areas would draw scrutiny in due diligence. Plan on 12-18 months of preparation.",
    };
  if (score >= 1.5)
    return {
      label: "Significant gaps",
      summary: "Key gaps would likely reduce buyer interest or price. A structured readiness program is recommended.",
    };
  return {
    label: "Not yet ready",
    summary: "The business would struggle in a sale process today. Start with the foundations: financials, documentation, and owner independence.",
  };
}
