import type { Metadata } from "next";
import Link from "next/link";
import { asc } from "drizzle-orm";
import { db } from "@/db";
import { industries } from "@/db/schema";
import { getIndustryQuestions } from "@/lib/questionnaire";
import { ActionForm } from "@/components/ActionForm";
import { SubmitButton } from "@/components/SubmitButton";
import { TagBadge } from "@/components/Badges";
import { createIndustry } from "../actions";

export const metadata: Metadata = { title: "Industries" };

export default async function IndustriesPage() {
  const rows = await db.query.industries.findMany({
    orderBy: asc(industries.name),
    with: { industryTags: { with: { tag: true } }, shortForms: true },
  });
  const questionCounts = await Promise.all(rows.map((i) => getIndustryQuestions(i.id)));

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-semibold text-brand">Industries</h1>

      <div className="card p-0">
        <table className="table">
          <thead>
            <tr>
              <th className="pl-6">Industry</th>
              <th>Tags</th>
              <th>Questions</th>
              <th>Short forms</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((industry, i) => (
              <tr key={industry.id}>
                <td className="pl-6">
                  <Link href={`/admin/industries/${industry.id}`} className="link font-medium">
                    {industry.name}
                  </Link>
                  <div className="text-xs text-gray-500">/{industry.slug}</div>
                </td>
                <td>
                  <div className="flex flex-wrap gap-1">
                    {industry.industryTags.map(({ tag }) => (
                      <TagBadge key={tag.id} name={tag.name} />
                    ))}
                  </div>
                </td>
                <td>
                  {questionCounts[i].questions.length}
                  {questionCounts[i].customOrder && <span className="ml-1 text-xs text-gray-500">(custom order)</span>}
                </td>
                <td>{industry.shortForms.length}</td>
                <td>
                  {industry.isActive ? (
                    <span className="badge bg-emerald-100 text-emerald-800">Active</span>
                  ) : (
                    <span className="badge bg-gray-100 text-gray-600">Hidden</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <section className="card max-w-xl">
        <h2 className="font-semibold text-gray-900">Add an industry</h2>
        <ActionForm action={createIndustry} className="mt-4 space-y-4">
          <div>
            <label className="label" htmlFor="name">
              Name
            </label>
            <input id="name" name="name" required className="input" placeholder="e.g. Construction" />
          </div>
          <div>
            <label className="label" htmlFor="slug">
              URL slug <span className="font-normal text-gray-400">(optional, generated from the name)</span>
            </label>
            <input id="slug" name="slug" className="input" placeholder="construction" />
          </div>
          <div>
            <label className="label" htmlFor="description">
              Description
            </label>
            <textarea id="description" name="description" rows={2} className="input" />
          </div>
          <SubmitButton>Create industry</SubmitButton>
        </ActionForm>
      </section>
    </div>
  );
}
