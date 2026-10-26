import type { Metadata } from "next";
import { asc } from "drizzle-orm";
import { db } from "@/db";
import { tags } from "@/db/schema";
import { ActionForm } from "@/components/ActionForm";
import { ConfirmButton } from "@/components/ConfirmButton";
import { SubmitButton } from "@/components/SubmitButton";
import { createTag, deleteTag, updateTag } from "../actions";

export const metadata: Metadata = { title: "Tags" };

export default async function TagsPage() {
  const rows = await db.query.tags.findMany({
    orderBy: asc(tags.name),
    with: { industryTags: { with: { industry: true } }, questionTags: true },
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-brand">Tags</h1>
        <p className="mt-1 text-sm text-gray-600">
          Tags connect general-purpose questions to industries: an industry&apos;s survey includes every tagged question
          that shares one of its tags. After the core and industry-specific questions, tagged questions are sorted by tag
          name.
        </p>
      </div>

      <div className="space-y-3">
        {rows.map((tag) => (
          <div key={tag.id} className="card flex flex-wrap items-start gap-4 p-4">
            <ActionForm action={updateTag.bind(null, tag.id)} className="flex flex-1 flex-wrap items-start gap-2">
              <input name="name" defaultValue={tag.name} required className="input w-56" aria-label="Tag name" />
              <input
                name="description"
                defaultValue={tag.description}
                className="input min-w-64 flex-1"
                aria-label="Description"
                placeholder="Description"
              />
              <SubmitButton className="btn-secondary">Save</SubmitButton>
            </ActionForm>
            <div className="w-56 text-xs text-gray-500">
              <div>{tag.questionTags.length} questions</div>
              <div>
                {tag.industryTags.length
                  ? `Used by: ${tag.industryTags.map((it) => it.industry.name).join(", ")}`
                  : "Not used by any industry"}
              </div>
            </div>
            <form action={deleteTag.bind(null, tag.id)}>
              <ConfirmButton
                message={`Delete the "${tag.name}" tag? Questions keep existing but lose this tag.`}
                className="btn-danger"
              >
                Delete
              </ConfirmButton>
            </form>
          </div>
        ))}
      </div>

      <section className="card max-w-xl">
        <h2 className="font-semibold text-gray-900">Add a tag</h2>
        <ActionForm action={createTag} className="mt-4 space-y-4">
          <div>
            <label className="label" htmlFor="new-name">
              Name
            </label>
            <input id="new-name" name="name" required className="input" placeholder="e.g. Environmental" />
          </div>
          <div>
            <label className="label" htmlFor="new-description">
              Description
            </label>
            <input id="new-description" name="description" className="input" />
          </div>
          <SubmitButton>Create tag</SubmitButton>
        </ActionForm>
      </section>
    </div>
  );
}
