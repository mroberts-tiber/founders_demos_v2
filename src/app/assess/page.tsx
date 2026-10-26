import type { Metadata } from "next";
import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { industries, shortForms } from "@/db/schema";
import { getIdentityQuestions } from "@/lib/questionnaire";
import { QuestionField } from "@/components/QuestionField";
import { SubmitButton } from "@/components/SubmitButton";
import { startAssessment } from "./actions";

export const metadata: Metadata = { title: "Start your assessment" };

// Step 1 of the survey: contact details + identity questions.
// URL: /assess                         -> industry chosen by the identity question
//      /assess?industry=saas           -> industry preset; the industry picker is hidden
//      /assess?industry=saas&form=3    -> preset industry, short-form survey
export default async function StartPage({ searchParams }: PageProps<"/assess">) {
  const { industry: industrySlug, form, error } = await searchParams;

  const activeIndustries = await db
    .select({ id: industries.id, name: industries.name, slug: industries.slug })
    .from(industries)
    .where(eq(industries.isActive, true))
    .orderBy(asc(industries.name));

  const preset = activeIndustries.find((i) => i.slug === industrySlug);
  const shortForm =
    preset && typeof form === "string" && /^\d+$/.test(form)
      ? await db.query.shortForms.findFirst({
          where: and(eq(shortForms.id, Number(form)), eq(shortForms.industryId, preset.id)),
        })
      : undefined;

  const identity = (await getIdentityQuestions()).filter((q) => !(preset && q.answerType === "industry"));

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-12">
      <p className="text-sm font-medium text-accent">Step 1 of 2</p>
      <h1 className="mt-1 text-3xl font-semibold text-brand">Tell us about your company</h1>
      {preset && (
        <p className="mt-2 text-gray-600">
          Track: <strong>{preset.name}</strong>
          {shortForm ? ` · ${shortForm.name}` : " · Full assessment"}
        </p>
      )}

      {error && (
        <p className="mt-6 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          Please fill in your company name, email, and industry.
        </p>
      )}

      <form action={startAssessment} className="mt-8 space-y-4">
        {preset && <input type="hidden" name="industryId" value={preset.id} />}
        {shortForm && <input type="hidden" name="shortFormId" value={shortForm.id} />}

        <div className="card grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="companyName" className="label">
              Company name
            </label>
            <input id="companyName" name="companyName" required className="input" autoComplete="organization" />
          </div>
          <div>
            <label htmlFor="contactEmail" className="label">
              Your email
            </label>
            <input id="contactEmail" name="contactEmail" type="email" required className="input" autoComplete="email" />
          </div>
        </div>

        {identity.map((q, i) => (
          <QuestionField key={q.id} question={q} number={i + 1} industries={activeIndustries} />
        ))}

        <div className="flex justify-end pt-2">
          <SubmitButton pendingText="Starting…">Continue to your industry survey →</SubmitButton>
        </div>
      </form>
    </main>
  );
}
