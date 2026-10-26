import Link from "next/link";
import { Suspense } from "react";
import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { industries } from "@/db/schema";
import { SITE_TAGLINE } from "@/lib/site";

// Home page. The hero is static, so Next.js prerenders it at build time. The
// industry list needs the database, so it sits in a <Suspense> boundary and is
// rendered on each request, streaming in behind the fallback.
export default function HomePage() {
  return (
    <main>
      <section className="bg-brand text-white">
        <div className="mx-auto max-w-6xl px-4 py-20">
          <p className="text-sm font-semibold tracking-widest text-emerald-300 uppercase">{SITE_TAGLINE}</p>
          <h1 className="mt-3 max-w-3xl text-4xl font-semibold tracking-tight sm:text-5xl">
            Is your company ready to be acquired?
          </h1>
          <p className="mt-5 max-w-2xl text-lg text-blue-100">
            Answer a short, industry-specific assessment and get a readiness score from 1 to 5, plus the areas
            buyers will scrutinize most in due diligence.
          </p>
          <Link href="/assess" className="btn-accent mt-8 px-6 py-3 text-base">
            Start your assessment
          </Link>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-6 px-4 py-14 sm:grid-cols-3">
        {[
          ["1. Tell us about your company", "A few identity questions place you in the right industry track."],
          ["2. Answer your industry survey", "Core questions every buyer asks, plus ones specific to your industry."],
          ["3. Get your readiness score", "A 1–5 score and a dashboard of recommendations for improvement."],
        ].map(([title, body]) => (
          <div key={title}>
            <h2 className="font-semibold text-brand">{title}</h2>
            <p className="mt-1 text-sm text-gray-600">{body}</p>
          </div>
        ))}
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-20">
        <h2 className="text-xl font-semibold text-brand">Industry tracks</h2>
        <p className="mt-1 text-sm text-gray-600">Already know your track? Jump straight in.</p>
        <Suspense fallback={<p className="mt-6 text-sm text-gray-400">Loading industries…</p>}>
          <IndustryList />
        </Suspense>
      </section>
    </main>
  );
}

async function IndustryList() {
  const rows = await db.query.industries.findMany({
    where: eq(industries.isActive, true),
    orderBy: asc(industries.name),
    with: { shortForms: { orderBy: (sf, { asc }) => asc(sf.name) } },
  });

  return (
    <div className="mt-6 grid gap-4 sm:grid-cols-2">
      {rows.map((industry) => (
        <div key={industry.id} className="card flex flex-col">
          <h3 className="font-semibold text-gray-900">{industry.name}</h3>
          <p className="mt-1 flex-1 text-sm text-gray-600">{industry.description}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link href={`/assess?industry=${industry.slug}`} className="btn-primary btn-sm">
              Full assessment
            </Link>
            {industry.shortForms.map((sf) => (
              <Link key={sf.id} href={`/assess?industry=${industry.slug}&form=${sf.id}`} className="btn-secondary btn-sm">
                {sf.name}
              </Link>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
