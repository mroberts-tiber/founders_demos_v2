import Link from "next/link";
import { and, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { db } from "@/db";
import { shortForms } from "@/db/schema";
import { getIndustryQuestions } from "@/lib/questionnaire";
import { ActionForm } from "@/components/ActionForm";
import { ConfirmButton } from "@/components/ConfirmButton";
import { KindBadge, TagBadge } from "@/components/Badges";
import { SubmitButton } from "@/components/SubmitButton";
import { deleteShortForm, updateShortForm } from "../../../../actions";

export default async function ShortFormPage({ params }: PageProps<"/admin/industries/[id]/short-forms/[formId]">) {
  const { id: rawId, formId: rawFormId } = await params;
  const industryId = Number(rawId);
  const formId = Number(rawFormId);
  if (!Number.isInteger(industryId) || !Number.isInteger(formId)) notFound();

  const form = await db.query.shortForms.findFirst({
    where: and(eq(shortForms.id, formId), eq(shortForms.industryId, industryId)),
    with: { industry: true, shortFormQuestions: true },
  });
  if (!form) notFound();

  const { questions } = await getIndustryQuestions(industryId);
  const selected = new Set(form.shortFormQuestions.map((q) => q.questionId));

  return (
    <div className="space-y-6">
      <div>
        <Link href={`/admin/industries/${industryId}`} className="text-sm text-gray-500 hover:text-brand">
          ← {form.industry.name}
        </Link>
        <div className="mt-1 flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-brand">Short form: {form.name}</h1>
          <Link
            href={`/assess?industry=${form.industry.slug}&form=${form.id}`}
            className="btn-secondary btn-sm"
            target="_blank"
          >
            Preview survey ↗
          </Link>
        </div>
        <p className="mt-1 text-sm text-gray-600">
          Pick which of the industry&apos;s questions to include. They&apos;re asked in the industry&apos;s order;
          identity questions are always asked first.
        </p>
      </div>

      <ActionForm action={updateShortForm.bind(null, formId)} className="space-y-6">
        <div className="card grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="name">
              Name
            </label>
            <input id="name" name="name" defaultValue={form.name} required className="input" />
          </div>
          <div>
            <label className="label" htmlFor="description">
              Description
            </label>
            <input id="description" name="description" defaultValue={form.description} className="input" />
          </div>
        </div>

        <fieldset className="card p-0">
          <legend className="sr-only">Questions</legend>
          <ul className="divide-y divide-gray-100">
            {questions.map((q, i) => (
              <li key={q.id}>
                <label className="flex cursor-pointer items-center gap-3 px-4 py-2.5 text-sm hover:bg-gray-50 has-checked:bg-brand/5">
                  <input
                    type="checkbox"
                    name="questionIds"
                    value={q.id}
                    defaultChecked={selected.has(q.id)}
                    className="accent-brand"
                  />
                  <span className="w-6 text-right text-gray-400 tabular-nums">{i + 1}</span>
                  <KindBadge kind={q.kind} />
                  <span className="flex-1">{q.prompt}</span>
                  {q.tagNames.map((t) => (
                    <TagBadge key={t} name={t} />
                  ))}
                </label>
              </li>
            ))}
          </ul>
        </fieldset>

        <SubmitButton>Save short form</SubmitButton>
      </ActionForm>

      <form action={deleteShortForm.bind(null, industryId, formId)}>
        <ConfirmButton message={`Delete the "${form.name}" short form?`} className="btn-danger">
          Delete short form
        </ConfirmButton>
      </form>
    </div>
  );
}
