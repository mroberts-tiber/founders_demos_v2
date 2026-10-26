import type { QuestionKind } from "@/db/schema";

const KIND_STYLES: Record<QuestionKind, { label: string; className: string }> = {
  identity: { label: "Identity", className: "bg-purple-100 text-purple-800" },
  core: { label: "Core", className: "bg-blue-100 text-blue-800" },
  industry: { label: "Industry", className: "bg-amber-100 text-amber-800" },
  tagged: { label: "Tagged", className: "bg-gray-100 text-gray-700" },
};

export function KindBadge({ kind }: { kind: QuestionKind }) {
  const { label, className } = KIND_STYLES[kind];
  return <span className={`badge ${className}`}>{label}</span>;
}

export function TagBadge({ name }: { name: string }) {
  return <span className="badge border border-accent/30 bg-accent-light text-accent">{name}</span>;
}

export const ANSWER_TYPE_LABELS = {
  scale: "1–5 scale",
  yes_no: "Yes / No",
  choice: "Multiple choice",
  text: "Free text",
  industry: "Industry picker",
} as const;
