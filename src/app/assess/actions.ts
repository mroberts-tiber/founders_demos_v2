"use server";

/**
 * Server Actions for taking a survey. A Server Action is a function that runs
 * on the server but can be used directly as a <form action={...}>, similar
 * to a servlet's doPost(). Next.js generates the HTTP endpoint for it.
 */
import { and, eq } from "drizzle-orm";
import { notFound, redirect } from "next/navigation";
import { db } from "@/db";
import { answers, industries, responses, shortForms } from "@/db/schema";
import { getIdentityQuestions, getSurveyQuestions } from "@/lib/questionnaire";
import { scoreAnswer, weightedAverage } from "@/lib/scoring";
import { int, isUuid, str } from "@/lib/validation";

/** Step 1: save the identity answers, work out the industry, and create the response. */
export async function startAssessment(formData: FormData) {
  const companyName = str(formData, "companyName");
  const contactEmail = str(formData, "contactEmail");
  let industryId = int(formData, "industryId"); // set when the user arrived via an industry link
  let shortFormId = int(formData, "shortFormId");

  const identity = await getIdentityQuestions();
  const identityAnswers: { questionId: number; value: string }[] = [];
  for (const q of identity) {
    const value = str(formData, `q_${q.id}`);
    if (!value) continue;
    identityAnswers.push({ questionId: q.id, value });
    if (q.answerType === "industry" && industryId === null) industryId = Number(value);
  }

  const industry =
    industryId === null
      ? undefined
      : await db.query.industries.findFirst({
          where: and(eq(industries.id, industryId), eq(industries.isActive, true)),
        });
  if (!companyName || !contactEmail || !industry) redirect("/assess?error=missing");

  if (shortFormId !== null) {
    const form = await db.query.shortForms.findFirst({
      where: and(eq(shortForms.id, shortFormId), eq(shortForms.industryId, industry.id)),
    });
    if (!form) shortFormId = null;
  }

  // A transaction makes the two inserts all-or-nothing, like JDBC's
  // setAutoCommit(false) ... commit().
  const responseId = await db.transaction(async (tx) => {
    const [response] = await tx
      .insert(responses)
      .values({ industryId: industry.id, shortFormId, companyName, contactEmail })
      .returning({ id: responses.id });
    if (identityAnswers.length > 0) {
      await tx.insert(answers).values(identityAnswers.map((a) => ({ ...a, responseId: response.id })));
    }
    return response.id;
  });

  // redirect() works by throwing, so it must be outside try/catch blocks.
  redirect(`/assess/${responseId}`);
}

/** Step 2: score the industry survey and mark the response complete. */
export async function submitAssessment(responseId: string, formData: FormData) {
  if (!isUuid(responseId)) notFound();
  const response = await db.query.responses.findFirst({ where: eq(responses.id, responseId) });
  if (!response) notFound();
  if (response.status === "completed") redirect(`/results/${responseId}`);

  const surveyQuestions = await getSurveyQuestions(response.industryId, response.shortFormId);
  const rows = surveyQuestions.flatMap((q) => {
    const value = str(formData, `q_${q.id}`);
    return value ? [{ responseId, questionId: q.id, value, score: scoreAnswer(q, value) }] : [];
  });

  const weightById = new Map(surveyQuestions.map((q) => [q.id, q.weight]));
  const score = weightedAverage(rows.map((r) => ({ score: r.score, weight: weightById.get(r.questionId)! })));

  await db.transaction(async (tx) => {
    if (rows.length > 0) await tx.insert(answers).values(rows);
    await tx
      .update(responses)
      .set({ status: "completed", score, completedAt: new Date() })
      .where(eq(responses.id, responseId));
  });

  redirect(`/results/${responseId}`);
}
