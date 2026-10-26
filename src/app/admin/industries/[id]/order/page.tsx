import Link from "next/link";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { db } from "@/db";
import { industries } from "@/db/schema";
import { getIdentityQuestions, getIndustryQuestions } from "@/lib/questionnaire";
import { OrderEditor } from "./OrderEditor";

// A Server Component that loads data, then hands it to the interactive
// OrderEditor Client Component, which runs in the browser.
export default async function OrderPage({ params }: PageProps<"/admin/industries/[id]/order">) {
  const id = Number((await params).id);
  if (!Number.isInteger(id)) notFound();
  const industry = await db.query.industries.findFirst({ where: eq(industries.id, id) });
  if (!industry) notFound();

  const [identity, { questions, customOrder }] = await Promise.all([getIdentityQuestions(), getIndustryQuestions(id)]);

  return (
    <div className="space-y-6">
      <div>
        <Link href={`/admin/industries/${id}`} className="text-sm text-gray-500 hover:text-brand">
          ← {industry.name}
        </Link>
        <h1 className="mt-1 text-2xl font-semibold text-brand">Question order: {industry.name}</h1>
        <p className="mt-1 text-sm text-gray-600">
          Drag questions, or use the arrows, then save. Identity questions are shared by every industry and always come
          first, so they can&apos;t be moved here.
        </p>
      </div>
      <OrderEditor
        // Changing the key remounts the editor, so it picks up fresh server data after a save or reset.
        key={questions.map((q) => q.id).join(",")}
        industryId={id}
        identity={identity}
        initial={questions}
        customOrder={customOrder}
      />
    </div>
  );
}
