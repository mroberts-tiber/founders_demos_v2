import Link from "next/link";
import { count, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { industries, questions, responses, shortForms, tags } from "@/db/schema";

export default async function AdminOverview() {
  // Run the independent queries in parallel rather than one after another.
  const [[industryCount], [questionCount], [tagCount], [shortFormCount], recent] = await Promise.all([
    db.select({ n: count() }).from(industries),
    db.select({ n: count() }).from(questions),
    db.select({ n: count() }).from(tags),
    db.select({ n: count() }).from(shortForms),
    db
      .select({
        id: responses.id,
        companyName: responses.companyName,
        contactEmail: responses.contactEmail,
        status: responses.status,
        score: responses.score,
        createdAt: responses.createdAt,
        industry: industries.name,
        shortForm: shortForms.name,
      })
      .from(responses)
      .innerJoin(industries, eq(industries.id, responses.industryId))
      .leftJoin(shortForms, eq(shortForms.id, responses.shortFormId))
      .orderBy(desc(responses.createdAt))
      .limit(20),
  ]);

  const stats = [
    { label: "Industries", value: industryCount.n, href: "/admin/industries" },
    { label: "Questions", value: questionCount.n, href: "/admin/questions" },
    { label: "Tags", value: tagCount.n, href: "/admin/tags" },
    { label: "Short forms", value: shortFormCount.n, href: "/admin/industries" },
  ];

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-semibold text-brand">Overview</h1>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((s) => (
          <Link key={s.label} href={s.href} className="card p-5 hover:border-brand/40">
            <div className="text-3xl font-semibold text-brand">{s.value}</div>
            <div className="text-sm text-gray-500">{s.label}</div>
          </Link>
        ))}
      </div>

      <section className="card p-0">
        <h2 className="px-6 pt-5 pb-3 font-semibold text-gray-900">Recent responses</h2>
        {recent.length === 0 ? (
          <p className="px-6 pb-6 text-sm text-gray-500">
            No responses yet.{" "}
            <Link href="/assess" className="link">
              Take the assessment
            </Link>{" "}
            to create one.
          </p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th className="pl-6">Company</th>
                <th>Industry</th>
                <th>Survey</th>
                <th>Score</th>
                <th>Started</th>
              </tr>
            </thead>
            <tbody>
              {recent.map((r) => (
                <tr key={r.id}>
                  <td className="pl-6">
                    <div className="font-medium">{r.companyName}</div>
                    <div className="text-xs text-gray-500">{r.contactEmail}</div>
                  </td>
                  <td>{r.industry}</td>
                  <td>{r.shortForm ?? "Full"}</td>
                  <td>
                    {r.status === "completed" ? (
                      <Link href={`/results/${r.id}`} className="link font-semibold">
                        {r.score?.toFixed(1) ?? "—"}
                      </Link>
                    ) : (
                      <span className="badge bg-gray-100 text-gray-600">In progress</span>
                    )}
                  </td>
                  <td className="text-gray-500">{r.createdAt.toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
