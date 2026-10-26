import type { Metadata } from "next";
import Link from "next/link";
import { asc, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { db } from "@/db";
import { industries, questions, tags } from "@/db/schema";
import { ConfirmButton } from "@/components/ConfirmButton";
import { deleteQuestion } from "../../actions";
import { QuestionForm } from "../QuestionForm";

export const metadata: Metadata = { title: "Edit question" };

export default async function EditQuestionPage({ params }: PageProps<"/admin/questions/[id]">) {
  const id = Number((await params).id);
  if (!Number.isInteger(id)) notFound();

  const [question, allIndustries, allTags] = await Promise.all([
    db.query.questions.findFirst({ where: eq(questions.id, id), with: { questionTags: true } }),
    db.select({ id: industries.id, name: industries.name }).from(industries).orderBy(asc(industries.name)),
    db.select({ id: tags.id, name: tags.name }).from(tags).orderBy(asc(tags.name)),
  ]);
  if (!question) notFound();

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <Link href="/admin/questions" className="text-sm text-gray-500 hover:text-brand">
          ← Questions
        </Link>
        <h1 className="mt-1 text-2xl font-semibold text-brand">Edit question #{question.id}</h1>
      </div>

      <QuestionForm
        industries={allIndustries}
        tags={allTags}
        initial={{
          id: question.id,
          prompt: question.prompt,
          helpText: question.helpText,
          kind: question.kind,
          industryId: question.industryId,
          answerType: question.answerType,
          options: question.options,
          weight: question.weight,
          isActive: question.isActive,
          tagIds: question.questionTags.map((qt) => qt.tagId),
        }}
      />

      <form action={deleteQuestion.bind(null, question.id)} className="border-t border-gray-200 pt-6">
        <p className="mb-3 text-sm text-gray-600">
          Deleting removes this question from every survey, short form, and past response. To retire it while keeping
          history, untick &quot;Active&quot; instead.
        </p>
        <ConfirmButton message="Delete this question permanently?" className="btn-danger">
          Delete question
        </ConfirmButton>
      </form>
    </div>
  );
}
