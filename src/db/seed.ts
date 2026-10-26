/**
 * Demo data. Run with `npm run db:seed`. It wipes all tables first, so it's
 * safe to re-run whenever you want a clean slate.
 *
 * This is a standalone Node script (not part of the Next.js app), so it opens
 * its own connection instead of importing "@/db".
 */
import { drizzle } from "drizzle-orm/node-postgres";
import { sql } from "drizzle-orm";
import { Pool } from "pg";
import * as schema from "./schema";
import type { AnswerType, ChoiceOption, QuestionKind } from "./schema";

try {
  process.loadEnvFile(".env");
} catch {}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool, { schema });

const INDUSTRIES = [
  {
    slug: "saas",
    name: "Software & SaaS",
    description: "Subscription software, platforms, and technology-enabled services.",
    tags: ["Recurring Revenue", "Intellectual Property", "Customer Concentration", "Workforce & Talent"],
  },
  {
    slug: "manufacturing",
    name: "Manufacturing",
    description: "Discrete and process manufacturers, fabricators, and contract manufacturers.",
    tags: ["Supply Chain", "Physical Assets", "Customer Concentration", "Regulatory Compliance"],
  },
  {
    slug: "healthcare-services",
    name: "Healthcare Services",
    description: "Clinics, practice groups, home health, and outpatient service providers.",
    tags: ["Regulatory Compliance", "Workforce & Talent", "Physical Assets"],
  },
  {
    slug: "professional-services",
    name: "Professional Services",
    description: "Consulting, accounting, engineering, marketing, and other expertise-based firms.",
    tags: ["Customer Concentration", "Workforce & Talent", "Recurring Revenue"],
  },
];

const TAGS: Record<string, string> = {
  "Recurring Revenue": "Predictability and durability of revenue streams.",
  "Intellectual Property": "Ownership and protection of proprietary technology and brands.",
  "Regulatory Compliance": "Licensing, regulatory standing, and compliance programs.",
  "Supply Chain": "Supplier dependence, inventory, and procurement resilience.",
  "Customer Concentration": "Dependence on a small number of customers.",
  "Workforce & Talent": "Key-person risk, retention, and team depth.",
  "Physical Assets": "Facilities, equipment, and real estate.",
};

type SeedQuestion = {
  key?: string; // used to reference the question from short forms below
  prompt: string;
  helpText?: string;
  kind: QuestionKind;
  answerType: AnswerType;
  industry?: string; // slug, for kind = 'industry'
  tags?: string[]; // for kind = 'tagged'
  options?: ChoiceOption[];
  weight?: number;
};

const opts = (...pairs: [string, number | null][]): ChoiceOption[] =>
  pairs.map(([label, score]) => ({ label, score }));

const QUESTIONS: SeedQuestion[] = [
  // Identity: asked before we know the industry. Unscored.
  {
    prompt: "Which industry best describes your company?",
    helpText: "This determines which assessment track you'll take.",
    kind: "identity",
    answerType: "industry",
  },
  {
    prompt: "What is your approximate annual revenue?",
    kind: "identity",
    answerType: "choice",
    options: opts(["Under $1M", null], ["$1M - $5M", null], ["$5M - $20M", null], ["$20M - $100M", null], ["Over $100M", null]),
  },
  {
    prompt: "How many full-time employees do you have?",
    kind: "identity",
    answerType: "choice",
    options: opts(["1 - 10", null], ["11 - 50", null], ["51 - 200", null], ["201 - 1,000", null], ["Over 1,000", null]),
  },
  {
    prompt: "How long has the company been operating?",
    kind: "identity",
    answerType: "choice",
    options: opts(["Less than 3 years", null], ["3 - 10 years", null], ["10 - 25 years", null], ["More than 25 years", null]),
  },

  // Core: every industry.
  {
    key: "core-financials",
    prompt: "What level of independent review do your financial statements receive?",
    helpText: "Buyers place far more confidence in audited financials.",
    kind: "core",
    answerType: "choice",
    weight: 3,
    options: opts(
      ["Internally prepared only", 1],
      ["Compiled by a CPA", 2],
      ["Reviewed by a CPA", 3],
      ["Audited for the most recent year", 4],
      ["Audited for three or more consecutive years", 5],
    ),
  },
  {
    key: "core-owner",
    prompt: "The business could run for 90 days without the owner's day-to-day involvement.",
    kind: "core",
    answerType: "scale",
    weight: 3,
  },
  {
    key: "core-growth",
    prompt: "Has revenue grown year over year in each of the last three years?",
    kind: "core",
    answerType: "yes_no",
    weight: 2,
  },
  {
    prompt: "We have a documented strategic plan covering the next three years.",
    kind: "core",
    answerType: "scale",
  },
  {
    prompt: "Contracts, leases, permits, and corporate records are organized and readily accessible.",
    helpText: "Think: could you populate a data room in two weeks?",
    kind: "core",
    answerType: "scale",
    weight: 2,
  },
  {
    prompt: "Is your capitalization table clean, with no outstanding ownership disputes?",
    kind: "core",
    answerType: "yes_no",
    weight: 2,
  },
  {
    prompt: "How does your EBITDA margin compare with industry peers?",
    kind: "core",
    answerType: "choice",
    weight: 2,
    options: opts(["Negative or break-even", 1], ["Below average", 2], ["About average", 3], ["Above average", 4], ["Top quartile", 5]),
  },

  // Industry-specific.
  {
    key: "saas-nrr",
    prompt: "What is your net revenue retention (NRR)?",
    kind: "industry",
    industry: "saas",
    answerType: "choice",
    weight: 3,
    options: opts(["Below 90%", 1], ["90% - 100%", 3], ["100% - 110%", 4], ["Above 110%", 5], ["We don't track it", 1]),
  },
  {
    prompt: "Our codebase is documented and tested, and no single engineer is irreplaceable.",
    kind: "industry",
    industry: "saas",
    answerType: "scale",
    weight: 2,
  },
  {
    prompt: "What is your SOC 2 status?",
    kind: "industry",
    industry: "saas",
    answerType: "choice",
    options: opts(["Not started", 1], ["In progress", 2], ["Type I complete", 4], ["Type II complete", 5]),
  },
  {
    key: "mfg-maintenance",
    prompt: "Equipment maintenance logs are current and we have a documented capital expenditure plan.",
    kind: "industry",
    industry: "manufacturing",
    answerType: "scale",
    weight: 2,
  },
  {
    prompt: "What is your average production capacity utilization?",
    kind: "industry",
    industry: "manufacturing",
    answerType: "choice",
    options: opts(["Below 50%", 2], ["50% - 70%", 4], ["70% - 85%", 5], ["Above 85% (constrained)", 3]),
  },
  {
    prompt: "Are your facilities ISO 9001 (or equivalent) certified?",
    kind: "industry",
    industry: "manufacturing",
    answerType: "yes_no",
  },
  {
    key: "hc-payer",
    prompt: "Our payer mix is diversified, with no single payer above 40% of revenue.",
    kind: "industry",
    industry: "healthcare-services",
    answerType: "scale",
    weight: 2,
  },
  {
    prompt: "How often are your billing and coding practices independently audited?",
    kind: "industry",
    industry: "healthcare-services",
    answerType: "choice",
    weight: 2,
    options: opts(["Never", 1], ["Only when issues arise", 2], ["Every two to three years", 3], ["Annually", 5]),
  },
  {
    prompt: "Are licensing and credentialing current for every provider?",
    kind: "industry",
    industry: "healthcare-services",
    answerType: "yes_no",
    weight: 2,
  },
  {
    key: "ps-utilization",
    prompt: "What is your average billable utilization rate?",
    kind: "industry",
    industry: "professional-services",
    answerType: "choice",
    weight: 2,
    options: opts(["Below 55%", 1], ["55% - 65%", 3], ["65% - 75%", 5], ["Above 75%", 4]),
  },
  {
    prompt: "Client relationships are institutional rather than tied to individual partners.",
    kind: "industry",
    industry: "professional-services",
    answerType: "scale",
    weight: 3,
  },
  {
    prompt: "Do all engagements run on standardized engagement letters or SOWs?",
    kind: "industry",
    industry: "professional-services",
    answerType: "yes_no",
  },

  // Tagged: slotted into any industry that shares a tag.
  {
    key: "tag-recurring",
    prompt: "What percentage of revenue is recurring or under multi-year contract?",
    kind: "tagged",
    tags: ["Recurring Revenue"],
    answerType: "choice",
    weight: 3,
    options: opts(["Under 20%", 1], ["20% - 40%", 2], ["40% - 60%", 3], ["60% - 80%", 4], ["Over 80%", 5]),
  },
  {
    prompt: "What is your average customer contract length?",
    kind: "tagged",
    tags: ["Recurring Revenue"],
    answerType: "choice",
    options: opts(["Month-to-month", 1], ["Up to 1 year", 2], ["1 - 2 years", 3], ["2 - 3 years", 4], ["3+ years", 5]),
  },
  {
    prompt: "Customer contracts are assignable to a buyer on a change of control.",
    helpText: "Check for change-of-control and anti-assignment clauses in your top contracts.",
    kind: "tagged",
    tags: ["Recurring Revenue", "Customer Concentration"],
    answerType: "scale",
    weight: 2,
  },
  {
    key: "tag-ip",
    prompt: "All key IP is owned by the company, with signed assignment agreements from every employee and contractor.",
    kind: "tagged",
    tags: ["Intellectual Property"],
    answerType: "scale",
    weight: 3,
  },
  {
    prompt: "Have you completed an open-source license audit in the last two years?",
    kind: "tagged",
    tags: ["Intellectual Property"],
    answerType: "yes_no",
  },
  {
    key: "tag-reg",
    prompt: "Are there any unresolved regulatory findings, fines, or investigations?",
    helpText: "Answer \"No\" if there are none (that's the good answer).",
    kind: "tagged",
    tags: ["Regulatory Compliance"],
    answerType: "choice",
    weight: 3,
    options: opts(["No", 5], ["Yes, minor and being remediated", 3], ["Yes, material", 1]),
  },
  {
    prompt: "We have a compliance program with a designated officer and annual staff training.",
    kind: "tagged",
    tags: ["Regulatory Compliance"],
    answerType: "scale",
  },
  {
    key: "tag-supplier",
    prompt: "Does any single supplier provide more than 25% of your critical inputs?",
    kind: "tagged",
    tags: ["Supply Chain"],
    answerType: "choice",
    weight: 2,
    options: opts(["No", 5], ["Yes, but alternatives are qualified", 3], ["Yes, with no qualified alternative", 1]),
  },
  {
    prompt: "Inventory is tracked in real time with accurate standard costing.",
    kind: "tagged",
    tags: ["Supply Chain"],
    answerType: "scale",
  },
  {
    key: "tag-concentration",
    prompt: "What share of revenue comes from your largest customer?",
    kind: "tagged",
    tags: ["Customer Concentration"],
    answerType: "choice",
    weight: 3,
    options: opts(["Over 30%", 1], ["20% - 30%", 2], ["10% - 20%", 3], ["5% - 10%", 4], ["Under 5%", 5]),
  },
  {
    key: "tag-retention",
    prompt: "Key employees have retention agreements and appropriate non-solicitation covenants.",
    kind: "tagged",
    tags: ["Workforce & Talent"],
    answerType: "scale",
    weight: 2,
  },
  {
    prompt: "What was your voluntary employee turnover over the last 12 months?",
    kind: "tagged",
    tags: ["Workforce & Talent"],
    answerType: "choice",
    options: opts(["Over 30%", 1], ["20% - 30%", 2], ["10% - 20%", 4], ["Under 10%", 5]),
  },
  {
    key: "tag-assets",
    prompt: "Facilities and major equipment are owned with clear title or held on long-term leases.",
    kind: "tagged",
    tags: ["Physical Assets"],
    answerType: "scale",
  },
  {
    prompt: "Has a Phase I environmental site assessment been completed for your facilities?",
    kind: "tagged",
    tags: ["Physical Assets"],
    answerType: "yes_no",
  },
];

/** One "Quick Check" short form per industry, by question key. */
const SHORT_FORMS: Record<string, string[]> = {
  saas: ["core-financials", "core-owner", "core-growth", "saas-nrr", "tag-recurring", "tag-ip"],
  manufacturing: ["core-financials", "core-owner", "core-growth", "mfg-maintenance", "tag-supplier", "tag-concentration"],
  "healthcare-services": ["core-financials", "core-owner", "core-growth", "hc-payer", "tag-reg", "tag-retention"],
  "professional-services": ["core-financials", "core-owner", "core-growth", "ps-utilization", "tag-concentration", "tag-retention"],
};

async function main() {
  console.log("Clearing existing data...");
  await db.execute(sql`
    TRUNCATE answers, responses, short_form_questions, short_forms, industry_question_order,
             question_tags, questions, industry_tags, tags, industries
    RESTART IDENTITY CASCADE
  `);

  const tagRows = await db
    .insert(schema.tags)
    .values(Object.entries(TAGS).map(([name, description]) => ({ name, description })))
    .returning();
  const tagId = new Map(tagRows.map((t) => [t.name, t.id]));

  const industryRows = await db
    .insert(schema.industries)
    .values(INDUSTRIES.map(({ slug, name, description }) => ({ slug, name, description })))
    .returning();
  const industryId = new Map(industryRows.map((i) => [i.slug, i.id]));

  await db.insert(schema.industryTags).values(
    INDUSTRIES.flatMap((i) => i.tags.map((t) => ({ industryId: industryId.get(i.slug)!, tagId: tagId.get(t)! }))),
  );

  const questionId = new Map<string, number>();
  for (const q of QUESTIONS) {
    const [row] = await db
      .insert(schema.questions)
      .values({
        prompt: q.prompt,
        helpText: q.helpText ?? "",
        kind: q.kind,
        industryId: q.industry ? industryId.get(q.industry)! : null,
        answerType: q.answerType,
        options: q.options ?? [],
        weight: q.kind === "identity" ? 0 : (q.weight ?? 1),
      })
      .returning();
    if (q.key) questionId.set(q.key, row.id);
    if (q.tags?.length) {
      await db.insert(schema.questionTags).values(q.tags.map((t) => ({ questionId: row.id, tagId: tagId.get(t)! })));
    }
  }

  for (const [slug, keys] of Object.entries(SHORT_FORMS)) {
    const [form] = await db
      .insert(schema.shortForms)
      .values({
        industryId: industryId.get(slug)!,
        name: "Quick Check",
        description: "A five-minute snapshot covering the highest-impact readiness factors.",
      })
      .returning();
    await db
      .insert(schema.shortFormQuestions)
      .values(keys.map((k) => ({ shortFormId: form.id, questionId: questionId.get(k)! })));
  }

  console.log(
    `Seeded ${industryRows.length} industries, ${tagRows.length} tags, ${QUESTIONS.length} questions, ` +
      `${Object.keys(SHORT_FORMS).length} short forms.`,
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
