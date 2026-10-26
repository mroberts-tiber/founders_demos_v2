import Link from "next/link";
import { asc, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { db } from "@/db";
import { industries, tags } from "@/db/schema";
import { getIndustryQuestions } from "@/lib/questionnaire";
import { ActionForm } from "@/components/ActionForm";
import { ConfirmButton } from "@/components/ConfirmButton";
import { SubmitButton } from "@/components/SubmitButton";
import { createShortForm, deleteIndustry, updateIndustry } from "../../actions";

export default async function IndustryPage({ params }: PageProps<"/admin/industries/[id]">) {
  const id = Number((await params).id);
  if (!Number.isInteger(id)) notFound();

  const industry = await db.query.industries.findFirst({
    where: eq(industries.id, id),
    with: {
      industryTags: true,
      shortForms: { with: { shortFormQuestions: true }, orderBy: (sf, { asc }) => asc(sf.name) },
    },
  });
  if (!industry) notFound();

  const [allTags, { questions, customOrder }] = await Promise.all([
    db.select().from(tags).orderBy(asc(tags.name)),
    getIndustryQuestions(id),
  ]);
  const selectedTags = new Set(industry.industryTags.map((t) => t.tagId));

  return (
    <div className="space-y-8">
      <div>
        <Link href="/admin/industries" className="text-sm text-gray-500 hover:text-brand">
          ← Industries
        </Link>
        <div className="mt-1 flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-brand">{industry.name}</h1>
          <Link href={`/assess?industry=${industry.slug}`} className="btn-secondary btn-sm" target="_blank">
            Preview survey ↗
          </Link>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card">
          <h2 className="font-semibold text-gray-900">Details & tags</h2>
          <ActionForm action={updateIndustry.bind(null, id)} className="mt-4 space-y-4">
            <div>
              <label className="label" htmlFor="name">
                Name
              </label>
              <input id="name" name="name" defaultValue={industry.name} required className="input" />
            </div>
            <div>
              <label className="label" htmlFor="slug">
                URL slug
              </label>
              <input id="slug" name="slug" defaultValue={industry.slug} className="input" />
            </div>
            <div>
              <label className="label" htmlFor="description">
                Description
              </label>
              <textarea id="description" name="description" defaultValue={industry.description} rows={2} className="input" />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="isActive" defaultChecked={industry.isActive} className="accent-brand" />
              Active (shown to the public)
            </label>
            <fieldset>
              <legend className="label">Tags</legend>
              <p className="mb-2 text-xs text-gray-500">
                Tagged questions sharing any of these tags are added to this industry&apos;s survey.
              </p>
              <div className="grid grid-cols-2 gap-1">
                {allTags.map((tag) => (
                  <label key={tag.id} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      name="tagIds"
                      value={tag.id}
                      defaultChecked={selectedTags.has(tag.id)}
                      className="accent-brand"
                    />
                    {tag.name}
                  </label>
                ))}
              </div>
            </fieldset>
            <SubmitButton>Save industry</SubmitButton>
          </ActionForm>
        </section>

        <div className="space-y-6">
          <section className="card">
            <h2 className="font-semibold text-gray-900">Question order</h2>
            <p className="mt-1 text-sm text-gray-600">
              {questions.length} questions ·{" "}
              {customOrder ? "custom order" : "default order (core → industry-specific → tag name)"}
            </p>
            <Link href={`/admin/industries/${id}/order`} className="btn-primary mt-4">
              Arrange questions
            </Link>
          </section>

          <section className="card">
            <h2 className="font-semibold text-gray-900">Short-form surveys</h2>
            <p className="mt-1 text-sm text-gray-600">A short form is a subset of this industry&apos;s questions.</p>
            {industry.shortForms.length > 0 && (
              <ul className="mt-4 divide-y divide-gray-100 border-y border-gray-100">
                {industry.shortForms.map((sf) => (
                  <li key={sf.id} className="flex items-center justify-between py-2 text-sm">
                    <Link href={`/admin/industries/${id}/short-forms/${sf.id}`} className="link font-medium">
                      {sf.name}
                    </Link>
                    <span className="text-gray-500">{sf.shortFormQuestions.length} questions</span>
                  </li>
                ))}
              </ul>
            )}
            <ActionForm action={createShortForm.bind(null, id)} className="mt-4 flex items-start gap-2">
              <input name="name" required placeholder="New short form name" className="input" />
              <SubmitButton className="btn-secondary shrink-0">Add</SubmitButton>
            </ActionForm>
          </section>

          <section className="card border-red-100">
            <h2 className="font-semibold text-gray-900">Delete industry</h2>
            <p className="mt-1 text-sm text-gray-600">
              Also deletes its industry-specific questions, short forms, and all survey responses.
            </p>
            <form action={deleteIndustry.bind(null, id)} className="mt-4">
              <ConfirmButton message={`Delete ${industry.name} and all of its responses? This cannot be undone.`} className="btn-danger">
                Delete {industry.name}
              </ConfirmButton>
            </form>
          </section>
        </div>
      </div>
    </div>
  );
}
