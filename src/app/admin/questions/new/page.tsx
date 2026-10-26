import type { Metadata } from "next";
import Link from "next/link";
import { asc } from "drizzle-orm";
import { db } from "@/db";
import { industries, tags } from "@/db/schema";
import { QuestionForm } from "../QuestionForm";

export const metadata: Metadata = { title: "New question" };

export default async function NewQuestionPage() {
  const [allIndustries, allTags] = await Promise.all([
    db.select({ id: industries.id, name: industries.name }).from(industries).orderBy(asc(industries.name)),
    db.select({ id: tags.id, name: tags.name }).from(tags).orderBy(asc(tags.name)),
  ]);

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <Link href="/admin/questions" className="text-sm text-gray-500 hover:text-brand">
          ← Questions
        </Link>
        <h1 className="mt-1 text-2xl font-semibold text-brand">New question</h1>
      </div>
      <QuestionForm
        industries={allIndustries}
        tags={allTags}
        initial={{
          prompt: "",
          helpText: "",
          kind: "core",
          industryId: null,
          answerType: "scale",
          options: [],
          weight: 1,
          isActive: true,
          tagIds: [],
        }}
      />
    </div>
  );
}
