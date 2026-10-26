"use server";

/**
 * Every admin write operation. Each exported function is a Server Action: it
 * runs only on the server, and pages wire it to a <form> or call it from a
 * Client Component like an ordinary async function.
 *
 * Form actions take (…boundIds, prevState, formData) and return a FormState,
 * which <ActionForm> displays. After a write, revalidatePath() tells Next.js
 * to discard any rendered copies of pages so the next view shows fresh data.
 */
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/db";
import {
  answerType,
  industries,
  industryQuestionOrder,
  industryTags,
  questionKind,
  questions,
  questionTags,
  shortFormQuestions,
  shortForms,
  tags,
} from "@/db/schema";
import { isAuthorized } from "@/lib/auth";
import { int, slugify, str } from "@/lib/validation";
import { isUniqueViolation, type FormState } from "./form-state";

/**
 * Server Actions are public HTTP endpoints that can be POSTed to from any URL,
 * so the /admin check in proxy.ts is not enough on its own: every admin action
 * re-checks the credentials itself.
 */
async function requireAdmin() {
  if (!isAuthorized((await headers()).get("authorization"))) throw new Error("Not authorized");
}

function refreshAll() {
  revalidatePath("/", "layout");
}

const ids = (formData: FormData, key: string) =>
  formData
    .getAll(key)
    .map(Number)
    .filter((n) => Number.isInteger(n) && n > 0);

// ---------------------------------------------------------------- Industries

export async function createIndustry(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  const name = str(formData, "name");
  const slug = slugify(str(formData, "slug") || name);
  if (!name || !slug) return { error: "Name is required." };

  let id: number;
  try {
    [{ id }] = await db
      .insert(industries)
      .values({ name, slug, description: str(formData, "description") })
      .returning({ id: industries.id });
  } catch (e) {
    if (isUniqueViolation(e)) return { error: "An industry with that name or slug already exists." };
    throw e;
  }
  refreshAll();
  redirect(`/admin/industries/${id}`);
}

export async function updateIndustry(id: number, _prev: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  const name = str(formData, "name");
  const slug = slugify(str(formData, "slug") || name);
  if (!name || !slug) return { error: "Name is required." };
  const tagIds = ids(formData, "tagIds");

  try {
    await db.transaction(async (tx) => {
      await tx
        .update(industries)
        .set({ name, slug, description: str(formData, "description"), isActive: formData.has("isActive") })
        .where(eq(industries.id, id));
      await tx.delete(industryTags).where(eq(industryTags.industryId, id));
      if (tagIds.length) await tx.insert(industryTags).values(tagIds.map((tagId) => ({ industryId: id, tagId })));
    });
  } catch (e) {
    if (isUniqueViolation(e)) return { error: "An industry with that name or slug already exists." };
    throw e;
  }
  refreshAll();
  return { message: "Industry saved." };
}

export async function deleteIndustry(id: number) {
  await requireAdmin();
  await db.delete(industries).where(eq(industries.id, id));
  refreshAll();
  redirect("/admin/industries");
}

// ---------------------------------------------------------------- Tags

export async function createTag(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  const name = str(formData, "name");
  if (!name) return { error: "Tag name is required." };
  try {
    await db.insert(tags).values({ name, description: str(formData, "description") });
  } catch (e) {
    if (isUniqueViolation(e)) return { error: `A tag named "${name}" already exists.` };
    throw e;
  }
  refreshAll();
  return { message: `Tag "${name}" created.` };
}

export async function updateTag(id: number, _prev: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  const name = str(formData, "name");
  if (!name) return { error: "Tag name is required." };
  try {
    await db.update(tags).set({ name, description: str(formData, "description") }).where(eq(tags.id, id));
  } catch (e) {
    if (isUniqueViolation(e)) return { error: `A tag named "${name}" already exists.` };
    throw e;
  }
  refreshAll();
  return { message: "Saved." };
}

export async function deleteTag(id: number) {
  await requireAdmin();
  await db.delete(tags).where(eq(tags.id, id));
  refreshAll();
}

// ---------------------------------------------------------------- Questions

// Zod describes the expected shape of the submitted form and validates it in
// one step, like a Struts ActionForm's validate() method.
const questionSchema = z
  .object({
    prompt: z.string().trim().min(1, "Question text is required."),
    helpText: z.string().trim(),
    kind: z.enum(questionKind.enumValues),
    industryId: z.number().int().positive().nullable(),
    answerType: z.enum(answerType.enumValues),
    options: z.array(
      z.object({
        label: z.string().trim().min(1, "Every option needs a label."),
        score: z.number().int().min(1).max(5).nullable(),
      }),
    ),
    weight: z.number().int().min(0).max(10),
    isActive: z.boolean(),
    tagIds: z.array(z.number().int().positive()),
  })
  .superRefine((q, ctx) => {
    const fail = (message: string) => ctx.addIssue({ code: "custom", message });
    if (q.kind === "industry" && !q.industryId) fail("Choose the industry this question belongs to.");
    if (q.kind === "tagged" && q.tagIds.length === 0) fail("Tagged questions need at least one tag.");
    if (q.answerType === "industry" && q.kind !== "identity") fail("Only identity questions can use the industry picker.");
    if (q.answerType === "choice" && q.options.length < 2) fail("Multiple-choice questions need at least two options.");
    if (q.answerType === "choice" && q.kind !== "identity" && q.options.some((o) => o.score === null))
      fail("Give every option a score from 1 to 5.");
  });

export async function saveQuestion(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  const id = int(formData, "id");
  let options: unknown = [];
  try {
    options = JSON.parse(str(formData, "options") || "[]");
  } catch {}

  const parsed = questionSchema.safeParse({
    prompt: str(formData, "prompt"),
    helpText: str(formData, "helpText"),
    kind: str(formData, "kind"),
    industryId: int(formData, "industryId"),
    answerType: str(formData, "answerType"),
    options,
    weight: Number(str(formData, "weight") || 1),
    isActive: formData.has("isActive"),
    tagIds: ids(formData, "tagIds"),
  });
  if (!parsed.success) return { error: parsed.error.issues.map((i) => i.message).join(" ") };

  const q = parsed.data;
  const values = {
    prompt: q.prompt,
    helpText: q.helpText,
    kind: q.kind,
    // Drop fields that don't apply to the chosen kind / answer type.
    industryId: q.kind === "industry" ? q.industryId : null,
    answerType: q.answerType,
    options: q.answerType === "choice" ? q.options : [],
    weight: q.kind === "identity" ? 0 : q.weight,
    isActive: q.isActive,
  };
  const tagIds = q.kind === "tagged" ? q.tagIds : [];

  await db.transaction(async (tx) => {
    let questionId = id;
    if (questionId) {
      await tx.update(questions).set(values).where(eq(questions.id, questionId));
      await tx.delete(questionTags).where(eq(questionTags.questionId, questionId));
    } else {
      [{ id: questionId }] = await tx.insert(questions).values(values).returning({ id: questions.id });
    }
    if (tagIds.length) await tx.insert(questionTags).values(tagIds.map((tagId) => ({ questionId: questionId!, tagId })));
  });

  refreshAll();
  redirect("/admin/questions");
}

export async function deleteQuestion(id: number) {
  await requireAdmin();
  await db.delete(questions).where(eq(questions.id, id));
  refreshAll();
  redirect("/admin/questions");
}

// ---------------------------------------------------------------- Per-industry ordering

/** Called directly from the <OrderEditor> Client Component with the new order. */
export async function saveIndustryOrder(industryId: number, questionIds: number[]) {
  await requireAdmin();
  await db.transaction(async (tx) => {
    await tx.delete(industryQuestionOrder).where(eq(industryQuestionOrder.industryId, industryId));
    if (questionIds.length) {
      await tx
        .insert(industryQuestionOrder)
        .values(questionIds.map((questionId, position) => ({ industryId, questionId, position })));
    }
  });
  refreshAll();
}

export async function resetIndustryOrder(industryId: number) {
  await requireAdmin();
  await db.delete(industryQuestionOrder).where(eq(industryQuestionOrder.industryId, industryId));
  refreshAll();
}

// ---------------------------------------------------------------- Short forms

export async function createShortForm(industryId: number, _prev: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  const name = str(formData, "name");
  if (!name) return { error: "Name is required." };
  const [{ id }] = await db
    .insert(shortForms)
    .values({ industryId, name, description: str(formData, "description") })
    .returning({ id: shortForms.id });
  refreshAll();
  redirect(`/admin/industries/${industryId}/short-forms/${id}`);
}

export async function updateShortForm(id: number, _prev: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  const name = str(formData, "name");
  if (!name) return { error: "Name is required." };
  const questionIds = ids(formData, "questionIds");

  await db.transaction(async (tx) => {
    await tx.update(shortForms).set({ name, description: str(formData, "description") }).where(eq(shortForms.id, id));
    await tx.delete(shortFormQuestions).where(eq(shortFormQuestions.shortFormId, id));
    if (questionIds.length) {
      await tx.insert(shortFormQuestions).values(questionIds.map((questionId) => ({ shortFormId: id, questionId })));
    }
  });
  refreshAll();
  return { message: `Saved with ${questionIds.length} questions.` };
}

export async function deleteShortForm(industryId: number, id: number) {
  await requireAdmin();
  await db.delete(shortForms).where(and(eq(shortForms.id, id), eq(shortForms.industryId, industryId)));
  refreshAll();
  redirect(`/admin/industries/${industryId}`);
}
