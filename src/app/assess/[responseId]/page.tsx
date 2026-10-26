import type { Metadata } from "next";
import { eq } from "drizzle-orm";
import { notFound, redirect } from "next/navigation";
import { db } from "@/db";
import { responses } from "@/db/schema";
import { getSurveyQuestions } from "@/lib/questionnaire";
import { isUuid } from "@/lib/validation";
import { QuestionField } from "@/components/QuestionField";
import { SubmitButton } from "@/components/SubmitButton";
import { submitAssessment } from "../actions";

export const metadata: Metadata = { title: "Your industry survey" };

// Step 2 of the survey: core, industry-specific, and tagged questions in the
// industry's order (or the short form's subset of them).
export default async function SurveyPage({ params }: PageProps<"/assess/[responseId]">) {
  const { responseId } = await params;
  if (!isUuid(responseId)) notFound();

  const response = await db.query.responses.findFirst({
    where: eq(responses.id, responseId),
    with: { industry: true, shortForm: true },
  });
  if (!response) notFound();
  if (response.status === "completed") redirect(`/results/${responseId}`);

  const questions = await getSurveyQuestions(response.industryId, response.shortFormId);

  // .bind() pre-fills the first argument, so the action receives (responseId, formData).
  const submit = submitAssessment.bind(null, responseId);

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-12">
      <p className="text-sm font-medium text-accent">Step 2 of 2</p>
      <h1 className="mt-1 text-3xl font-semibold text-brand">{response.industry.name}</h1>
      <p className="mt-2 text-gray-600">
        {response.shortForm ? response.shortForm.name : "Full assessment"} for <strong>{response.companyName}</strong>{" "}
        · {questions.length} questions
      </p>

      <form action={submit} className="mt-8 space-y-4">
        {questions.map((q, i) => (
          <QuestionField key={q.id} question={q} number={i + 1} />
        ))}
        <div className="flex justify-end pt-2">
          <SubmitButton pendingText="Scoring…" className="btn-accent px-6 py-3 text-base">
            See my readiness score
          </SubmitButton>
        </div>
      </form>
    </main>
  );
}
