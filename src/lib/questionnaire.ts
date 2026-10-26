/**
 * Builds the ordered list of questions for an industry's survey. This is the
 * heart of the business rules:
 *
 *   1. Identity questions are global and asked first (on the start page).
 *   2. An industry's survey = all core questions
 *                           + that industry's own questions
 *                           + every tagged question sharing a tag with the industry.
 *   3. Default order: core, industry-specific, then tagged questions grouped by
 *      tag name (a question with several matching tags sorts under the
 *      alphabetically first one). Ties break by question id (creation order).
 *   4. If an admin saved a custom order for the industry, it wins; questions
 *      without a saved position go to the end in default order.
 *   5. A short form is a subset of rule 2's list, kept in the same order.
 */
import "server-only";
import { and, asc, eq, inArray, or } from "drizzle-orm";
import { db } from "@/db";
import {
  industryQuestionOrder,
  industryTags,
  questions,
  questionTags,
  shortFormQuestions,
  tags,
  type ChoiceOption,
  type Question,
} from "@/db/schema";

export type SurveyQuestion = Pick<
  Question,
  "id" | "prompt" | "helpText" | "kind" | "answerType" | "weight"
> & {
  options: ChoiceOption[];
  /** For tagged questions: the tags that pulled it into this industry, A-Z. */
  tagNames: string[];
};

const KIND_RANK = { identity: 0, core: 1, industry: 2, tagged: 3 } as const;

function compareDefault(a: SurveyQuestion, b: SurveyQuestion) {
  return (
    KIND_RANK[a.kind] - KIND_RANK[b.kind] ||
    (a.tagNames[0] ?? "").localeCompare(b.tagNames[0] ?? "") ||
    a.id - b.id
  );
}

function toSurveyQuestion(q: Question, tagNames: string[] = []): SurveyQuestion {
  return {
    id: q.id,
    prompt: q.prompt,
    helpText: q.helpText,
    kind: q.kind,
    answerType: q.answerType,
    weight: q.weight,
    options: q.options,
    tagNames,
  };
}

export async function getIdentityQuestions(): Promise<SurveyQuestion[]> {
  const rows = await db
    .select()
    .from(questions)
    .where(and(eq(questions.kind, "identity"), eq(questions.isActive, true)))
    .orderBy(asc(questions.id));
  return rows.map((q) => toSurveyQuestion(q));
}

/**
 * All non-identity questions for an industry, in survey order.
 * `customOrder` tells the admin UI whether a saved order is in effect.
 */
export async function getIndustryQuestions(
  industryId: number,
): Promise<{ questions: SurveyQuestion[]; customOrder: boolean }> {
  const industryTagRows = await db
    .select({ id: tags.id, name: tags.name })
    .from(industryTags)
    .innerJoin(tags, eq(tags.id, industryTags.tagId))
    .where(eq(industryTags.industryId, industryId));
  const tagNameById = new Map(industryTagRows.map((t) => [t.id, t.name]));

  const candidates = await db
    .select()
    .from(questions)
    .where(
      and(
        eq(questions.isActive, true),
        or(
          eq(questions.kind, "core"),
          and(eq(questions.kind, "industry"), eq(questions.industryId, industryId)),
          eq(questions.kind, "tagged"),
        ),
      ),
    );

  // Which of the industry's tags does each tagged question carry?
  const matches =
    tagNameById.size === 0
      ? []
      : await db
          .select()
          .from(questionTags)
          .where(inArray(questionTags.tagId, [...tagNameById.keys()]));
  const matchedTags = new Map<number, string[]>();
  for (const m of matches) {
    const list = matchedTags.get(m.questionId) ?? [];
    list.push(tagNameById.get(m.tagId)!);
    matchedTags.set(m.questionId, list);
  }

  const list = candidates
    .filter((q) => q.kind !== "tagged" || matchedTags.has(q.id))
    .map((q) => toSurveyQuestion(q, (matchedTags.get(q.id) ?? []).sort((a, b) => a.localeCompare(b))))
    .sort(compareDefault);

  const saved = await db
    .select()
    .from(industryQuestionOrder)
    .where(eq(industryQuestionOrder.industryId, industryId));
  if (saved.length === 0) return { questions: list, customOrder: false };

  const position = new Map(saved.map((r) => [r.questionId, r.position]));
  const defaultIndex = new Map(list.map((q, i) => [q.id, i]));
  list.sort(
    (a, b) =>
      (position.get(a.id) ?? Infinity) - (position.get(b.id) ?? Infinity) ||
      defaultIndex.get(a.id)! - defaultIndex.get(b.id)!,
  );
  return { questions: list, customOrder: true };
}

/** The questions to show for a survey: the full industry list, or a short form's subset of it. */
export async function getSurveyQuestions(
  industryId: number,
  shortFormId: number | null,
): Promise<SurveyQuestion[]> {
  const { questions: all } = await getIndustryQuestions(industryId);
  if (shortFormId === null) return all;

  const members = await db
    .select({ questionId: shortFormQuestions.questionId })
    .from(shortFormQuestions)
    .where(eq(shortFormQuestions.shortFormId, shortFormId));
  const ids = new Set(members.map((m) => m.questionId));
  return all.filter((q) => ids.has(q.id));
}
