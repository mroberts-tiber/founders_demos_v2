import type { Metadata } from "next";
import Link from "next/link";
import { and, asc, eq, exists, ilike, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { industries, questionKind, questions, questionTags, tags, type QuestionKind } from "@/db/schema";
import { ANSWER_TYPE_LABELS, KindBadge, TagBadge } from "@/components/Badges";

export const metadata: Metadata = { title: "Questions" };

const KIND_ORDER: Record<QuestionKind, number> = { identity: 0, core: 1, industry: 2, tagged: 3 };

// The filter form uses method GET, so filters live in the URL query string
// (?kind=core&tag=3) and arrive here as searchParams, just like
// request.getParameter() in a servlet.
export default async function QuestionsPage({ searchParams }: PageProps<"/admin/questions">) {
  const sp = await searchParams;
  const kind = questionKind.enumValues.find((k) => k === sp.kind);
  const tagId = Number(sp.tag) || null;
  const industryId = Number(sp.industry) || null;
  const search = typeof sp.q === "string" ? sp.q.trim() : "";

  const filters: SQL[] = [];
  if (kind) filters.push(eq(questions.kind, kind));
  if (industryId) filters.push(eq(questions.industryId, industryId));
  if (search) filters.push(ilike(questions.prompt, `%${search}%`));
  if (tagId)
    filters.push(
      exists(
        db
          .select()
          .from(questionTags)
          .where(and(eq(questionTags.questionId, questions.id), eq(questionTags.tagId, tagId))),
      ),
    );

  const [rows, allTags, allIndustries] = await Promise.all([
    db.query.questions.findMany({
      where: filters.length ? and(...filters) : undefined,
      with: { industry: true, questionTags: { with: { tag: true } } },
      orderBy: asc(questions.id),
    }),
    db.select().from(tags).orderBy(asc(tags.name)),
    db.select().from(industries).orderBy(asc(industries.name)),
  ]);

  // Show questions in the same default order the surveys use.
  const firstTag = (q: (typeof rows)[number]) =>
    q.questionTags.map((qt) => qt.tag.name).sort((a, b) => a.localeCompare(b))[0] ?? "";
  rows.sort(
    (a, b) =>
      KIND_ORDER[a.kind] - KIND_ORDER[b.kind] ||
      (a.industry?.name ?? "").localeCompare(b.industry?.name ?? "") ||
      firstTag(a).localeCompare(firstTag(b)) ||
      a.id - b.id,
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-brand">Questions</h1>
        <Link href="/admin/questions/new" className="btn-primary">
          + New question
        </Link>
      </div>

      <form method="GET" className="card flex flex-wrap items-end gap-3 p-4">
        <div>
          <label className="label" htmlFor="q">
            Search
          </label>
          <input id="q" name="q" defaultValue={search} className="input w-56" placeholder="Question text" />
        </div>
        <div>
          <label className="label" htmlFor="kind">
            Type
          </label>
          <select id="kind" name="kind" defaultValue={kind ?? ""} className="input">
            <option value="">All</option>
            <option value="identity">Identity</option>
            <option value="core">Core</option>
            <option value="industry">Industry-specific</option>
            <option value="tagged">Tagged</option>
          </select>
        </div>
        <div>
          <label className="label" htmlFor="industry">
            Industry
          </label>
          <select id="industry" name="industry" defaultValue={industryId ?? ""} className="input">
            <option value="">All</option>
            {allIndustries.map((i) => (
              <option key={i.id} value={i.id}>
                {i.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="tag">
            Tag
          </label>
          <select id="tag" name="tag" defaultValue={tagId ?? ""} className="input">
            <option value="">All</option>
            {allTags.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>
        <button className="btn-secondary">Filter</button>
        <Link href="/admin/questions" className="pb-2 text-sm text-gray-500 hover:text-brand">
          Clear
        </Link>
      </form>

      <div className="card p-0">
        <table className="table">
          <thead>
            <tr>
              <th className="pl-6">Question</th>
              <th>Type</th>
              <th>Applies to</th>
              <th>Answer</th>
              <th>Weight</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((q) => (
              <tr key={q.id} className={q.isActive ? "" : "opacity-50"}>
                <td className="pl-6">
                  <Link href={`/admin/questions/${q.id}`} className="link">
                    {q.prompt}
                  </Link>
                  {!q.isActive && <span className="badge ml-2 bg-gray-100 text-gray-600">Inactive</span>}
                </td>
                <td>
                  <KindBadge kind={q.kind} />
                </td>
                <td>
                  {q.kind === "identity" && <span className="text-gray-500">Start page</span>}
                  {q.kind === "core" && <span className="text-gray-500">All industries</span>}
                  {q.industry && q.industry.name}
                  <div className="flex flex-wrap gap-1">
                    {q.questionTags.map(({ tag }) => (
                      <TagBadge key={tag.id} name={tag.name} />
                    ))}
                  </div>
                </td>
                <td className="whitespace-nowrap text-gray-600">{ANSWER_TYPE_LABELS[q.answerType]}</td>
                <td className="text-gray-600">{q.kind === "identity" ? "—" : q.weight}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={5} className="py-8 text-center text-gray-500">
                  No questions match these filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
