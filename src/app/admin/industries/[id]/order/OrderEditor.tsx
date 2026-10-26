"use client";

/**
 * Interactive list for reordering an industry's questions. This is a Client
 * Component ("use client"): it ships to the browser and keeps the working
 * order in React state. Nothing touches the database until "Save order" calls
 * the saveIndustryOrder Server Action.
 */
import { useState, useTransition } from "react";
import type { SurveyQuestion } from "@/lib/questionnaire";
import { KindBadge, TagBadge } from "@/components/Badges";
import { resetIndustryOrder, saveIndustryOrder } from "../../../actions";

export function OrderEditor({
  industryId,
  identity,
  initial,
  customOrder,
}: {
  industryId: number;
  identity: SurveyQuestion[];
  initial: SurveyQuestion[];
  customOrder: boolean;
}) {
  const [items, setItems] = useState(initial);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [pending, startTransition] = useTransition();
  const dirty = items.some((q, i) => q.id !== initial[i].id);

  function move(from: number, to: number) {
    if (to < 0 || to >= items.length || from === to) return;
    const next = [...items];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    setItems(next);
  }

  return (
    <div className="space-y-4">
      <div className="sticky top-0 z-10 flex items-center gap-3 rounded-lg border border-gray-200 bg-white/95 px-4 py-3 shadow-xs backdrop-blur">
        <button
          className="btn-primary"
          disabled={!dirty || pending}
          onClick={() => startTransition(() => saveIndustryOrder(industryId, items.map((q) => q.id)))}
        >
          {pending ? "Saving…" : "Save order"}
        </button>
        <button className="btn-secondary" disabled={!dirty || pending} onClick={() => setItems(initial)}>
          Discard changes
        </button>
        <button
          className="btn-secondary ml-auto"
          disabled={!customOrder || pending}
          onClick={() => {
            if (confirm("Discard the custom order and go back to the default sort?"))
              startTransition(() => resetIndustryOrder(industryId));
          }}
        >
          Reset to default order
        </button>
        <span className="text-sm text-gray-500">
          {dirty ? "Unsaved changes" : customOrder ? "Custom order" : "Default order"}
        </span>
      </div>

      <ol className="space-y-1.5">
        {identity.map((q, i) => (
          <li
            key={q.id}
            className="flex items-center gap-3 rounded-md border border-dashed border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-500"
          >
            <span className="w-6 text-right tabular-nums">{i + 1}</span>
            <KindBadge kind={q.kind} />
            <span className="flex-1">{q.prompt}</span>
            <span className="text-xs">locked</span>
          </li>
        ))}

        {items.map((q, i) => (
          <li
            key={q.id}
            draggable
            onDragStart={() => setDragIndex(i)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => {
              if (dragIndex !== null) move(dragIndex, i);
              setDragIndex(null);
            }}
            onDragEnd={() => setDragIndex(null)}
            className={`flex cursor-grab items-center gap-3 rounded-md border bg-white px-3 py-2 text-sm active:cursor-grabbing ${
              dragIndex === i ? "border-brand opacity-50" : "border-gray-200"
            }`}
          >
            <span className="w-6 text-right text-gray-400 tabular-nums">{identity.length + i + 1}</span>
            <span className="text-gray-300" aria-hidden>
              ⋮⋮
            </span>
            <KindBadge kind={q.kind} />
            <span className="flex-1">{q.prompt}</span>
            <span className="flex gap-1">
              {q.tagNames.map((t) => (
                <TagBadge key={t} name={t} />
              ))}
            </span>
            <span className="flex gap-1">
              <button className="btn-secondary btn-sm" onClick={() => move(i, 0)} disabled={i === 0} title="Move to top">
                ⤒
              </button>
              <button className="btn-secondary btn-sm" onClick={() => move(i, i - 1)} disabled={i === 0} title="Move up">
                ↑
              </button>
              <button
                className="btn-secondary btn-sm"
                onClick={() => move(i, i + 1)}
                disabled={i === items.length - 1}
                title="Move down"
              >
                ↓
              </button>
              <button
                className="btn-secondary btn-sm"
                onClick={() => move(i, items.length - 1)}
                disabled={i === items.length - 1}
                title="Move to bottom"
              >
                ⤓
              </button>
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}
