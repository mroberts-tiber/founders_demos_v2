import type { Metadata } from "next";
import Link from "next/link";
import { eq } from "drizzle-orm";
import { notFound, redirect } from "next/navigation";
import { db } from "@/db";
import { responses } from "@/db/schema";
import { readiness } from "@/lib/scoring";
import { isUuid } from "@/lib/validation";

export const metadata: Metadata = { title: "Your readiness score" };

export default async function ResultsPage({ params }: PageProps<"/results/[responseId]">) {
  const { responseId } = await params;
  if (!isUuid(responseId)) notFound();

  const response = await db.query.responses.findFirst({
    where: eq(responses.id, responseId),
    with: { industry: true, shortForm: true },
  });
  if (!response) notFound();
  if (response.status !== "completed") redirect(`/assess/${responseId}`);

  const score = response.score;
  const verdict = score === null ? null : readiness(score);

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-12">
      <p className="text-sm text-gray-500">
        {response.companyName} · {response.industry.name} ·{" "}
        {response.shortForm ? response.shortForm.name : "Full assessment"} ·{" "}
        {response.completedAt?.toLocaleDateString("en-US", { dateStyle: "medium" })}
      </p>

      <section className="card mt-4 flex flex-col items-center gap-8 p-8 sm:flex-row">
        <div className="text-center">
          <div className="text-7xl font-semibold text-brand">{score?.toFixed(1) ?? "—"}</div>
          <div className="mt-1 text-sm text-gray-500">out of 5</div>
        </div>
        <div className="flex-1">
          <h1 className="text-2xl font-semibold text-gray-900">{verdict?.label ?? "Not enough answers to score"}</h1>
          {verdict && <p className="mt-2 text-gray-600">{verdict.summary}</p>}
          <ScoreBar score={score ?? 0} />
        </div>
      </section>

      {response.shortForm && (
        <p className="mt-4 text-sm text-gray-600">
          This was the {response.shortForm.name}. For a complete picture,{" "}
          <Link href={`/assess?industry=${response.industry.slug}`} className="link">
            take the full {response.industry.name} assessment
          </Link>
          .
        </p>
      )}

      <DashboardPlaceholder />
    </main>
  );
}

function ScoreBar({ score }: { score: number }) {
  return (
    <div className="mt-5">
      <div className="relative h-3 rounded-full bg-gradient-to-r from-red-400 via-amber-300 to-emerald-500">
        <div
          className="absolute top-1/2 size-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-4 border-white bg-brand shadow"
          style={{ left: `${((Math.min(Math.max(score, 1), 5) - 1) / 4) * 100}%` }}
        />
      </div>
      <div className="mt-1 flex justify-between text-xs text-gray-400">
        <span>1 · Not yet ready</span>
        <span>5 · Acquisition ready</span>
      </div>
    </div>
  );
}

/** Placeholder for the recommendations dashboard (not part of this demo). */
function DashboardPlaceholder() {
  const panels = [
    { title: "Score by category", body: "Financials, operations, customers, team, and legal, scored separately." },
    { title: "Top recommendations", body: "The improvements that would raise your score and valuation the most." },
    { title: "Peer benchmark", body: "How you compare with other companies in your industry and size band." },
    { title: "Readiness roadmap", body: "A 6-18 month plan sequenced around your target exit date." },
  ];
  return (
    <section className="mt-10">
      <div className="flex items-center gap-3">
        <h2 className="text-xl font-semibold text-brand">Your readiness dashboard</h2>
        <span className="badge bg-amber-100 text-amber-800">Coming soon</span>
      </div>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        {panels.map((p) => (
          <div key={p.title} className="rounded-lg border-2 border-dashed border-gray-300 bg-white/50 p-6">
            <h3 className="font-medium text-gray-700">{p.title}</h3>
            <p className="mt-1 text-sm text-gray-500">{p.body}</p>
            <div className="mt-4 space-y-2">
              <div className="h-2 w-3/4 rounded bg-gray-200" />
              <div className="h-2 w-1/2 rounded bg-gray-200" />
              <div className="h-2 w-2/3 rounded bg-gray-200" />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
