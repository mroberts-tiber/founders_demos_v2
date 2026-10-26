"use client";

/**
 * Create/edit form for a question. It's a Client Component because fields
 * appear and disappear as you change the question type (industry picker for
 * industry-specific questions, tag checkboxes for tagged ones, an options
 * editor for multiple choice).
 *
 * Fields are "controlled" (their values live in React state) so that if the
 * server rejects the save, nothing the admin typed is lost.
 */
import { useState } from "react";
import type { ChoiceOption, Industry, QuestionKind, AnswerType, Tag } from "@/db/schema";
import { ActionForm } from "@/components/ActionForm";
import { SubmitButton } from "@/components/SubmitButton";
import { ANSWER_TYPE_LABELS } from "@/components/Badges";
import { saveQuestion } from "../actions";

export type QuestionFormValues = {
  id?: number;
  prompt: string;
  helpText: string;
  kind: QuestionKind;
  industryId: number | null;
  answerType: AnswerType;
  options: ChoiceOption[];
  weight: number;
  isActive: boolean;
  tagIds: number[];
};

const KIND_HELP: Record<QuestionKind, string> = {
  identity: "Asked on the start page of every survey, before the industry is known. Not scored.",
  core: "Asked in every industry's survey.",
  industry: "Asked only in one industry's survey.",
  tagged: "Added to every industry that shares at least one of its tags.",
};

export function QuestionForm({
  initial,
  industries,
  tags,
}: {
  initial: QuestionFormValues;
  industries: Pick<Industry, "id" | "name">[];
  tags: Pick<Tag, "id" | "name">[];
}) {
  const [v, setV] = useState(initial);
  const set = <K extends keyof QuestionFormValues>(key: K, value: QuestionFormValues[K]) =>
    setV((prev) => ({ ...prev, [key]: value }));

  const scored = v.kind !== "identity";
  const answerTypes = (Object.keys(ANSWER_TYPE_LABELS) as AnswerType[]).filter(
    (t) => t !== "industry" || v.kind === "identity",
  );

  function setOption(i: number, patch: Partial<ChoiceOption>) {
    set(
      "options",
      v.options.map((o, j) => (j === i ? { ...o, ...patch } : o)),
    );
  }

  return (
    <ActionForm action={saveQuestion} className="space-y-6">
      {v.id && <input type="hidden" name="id" value={v.id} />}
      <input type="hidden" name="options" value={JSON.stringify(v.options)} />

      <div className="card space-y-4">
        <div>
          <label className="label" htmlFor="prompt">
            Question
          </label>
          <textarea
            id="prompt"
            name="prompt"
            rows={2}
            required
            className="input"
            value={v.prompt}
            onChange={(e) => set("prompt", e.target.value)}
          />
        </div>
        <div>
          <label className="label" htmlFor="helpText">
            Help text <span className="font-normal text-gray-400">(optional)</span>
          </label>
          <input
            id="helpText"
            name="helpText"
            className="input"
            value={v.helpText}
            onChange={(e) => set("helpText", e.target.value)}
          />
        </div>
      </div>

      <div className="card space-y-4">
        <div>
          <label className="label" htmlFor="kind">
            Question type
          </label>
          <select
            id="kind"
            name="kind"
            className="input max-w-xs"
            value={v.kind}
            onChange={(e) => {
              const kind = e.target.value as QuestionKind;
              setV((prev) => ({
                ...prev,
                kind,
                answerType: prev.answerType === "industry" && kind !== "identity" ? "scale" : prev.answerType,
              }));
            }}
          >
            <option value="identity">Identity</option>
            <option value="core">Core</option>
            <option value="industry">Industry-specific</option>
            <option value="tagged">Tagged</option>
          </select>
          <p className="mt-1 text-xs text-gray-500">{KIND_HELP[v.kind]}</p>
        </div>

        {v.kind === "industry" && (
          <div>
            <label className="label" htmlFor="industryId">
              Industry
            </label>
            <select
              id="industryId"
              name="industryId"
              required
              className="input max-w-xs"
              value={v.industryId ?? ""}
              onChange={(e) => set("industryId", Number(e.target.value) || null)}
            >
              <option value="" disabled>
                Choose…
              </option>
              {industries.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {v.kind === "tagged" && (
          <fieldset>
            <legend className="label">Tags</legend>
            <div className="grid grid-cols-2 gap-1 sm:grid-cols-3">
              {tags.map((t) => (
                <label key={t.id} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    name="tagIds"
                    value={t.id}
                    className="accent-brand"
                    checked={v.tagIds.includes(t.id)}
                    onChange={(e) =>
                      set("tagIds", e.target.checked ? [...v.tagIds, t.id] : v.tagIds.filter((id) => id !== t.id))
                    }
                  />
                  {t.name}
                </label>
              ))}
            </div>
          </fieldset>
        )}
      </div>

      <div className="card space-y-4">
        <div className="flex flex-wrap gap-4">
          <div>
            <label className="label" htmlFor="answerType">
              Answer type
            </label>
            <select
              id="answerType"
              name="answerType"
              className="input w-56"
              value={v.answerType}
              onChange={(e) => {
                const answerType = e.target.value as AnswerType;
                setV((prev) => ({
                  ...prev,
                  answerType,
                  options:
                    answerType === "choice" && prev.options.length === 0
                      ? [
                          { label: "", score: scored ? 1 : null },
                          { label: "", score: scored ? 5 : null },
                        ]
                      : prev.options,
                }));
              }}
            >
              {answerTypes.map((t) => (
                <option key={t} value={t}>
                  {ANSWER_TYPE_LABELS[t]}
                </option>
              ))}
            </select>
          </div>
          {scored && (
            <div>
              <label className="label" htmlFor="weight">
                Weight
              </label>
              <input
                id="weight"
                name="weight"
                type="number"
                min={0}
                max={10}
                className="input w-24"
                value={v.weight}
                onChange={(e) => set("weight", Number(e.target.value))}
              />
            </div>
          )}
        </div>
        <p className="text-xs text-gray-500">
          {v.answerType === "scale" && "Respondents pick 1 (strongly disagree) to 5 (strongly agree); that number is the score."}
          {v.answerType === "yes_no" && "Yes scores 5, No scores 1. Phrase the question so that Yes is the good answer."}
          {v.answerType === "choice" && scored && "Each option carries its own score from 1 to 5."}
          {v.answerType === "text" && "Free-text answers are stored but not scored."}
          {v.answerType === "industry" && "Shows a dropdown of active industries and routes the respondent into that track."}
          {scored && " Weight sets how much this question counts in the overall average (0 = not scored)."}
        </p>

        {v.answerType === "choice" && (
          <div className="space-y-2">
            <p className="label">Options</p>
            {v.options.map((o, i) => (
              <div key={i} className="flex items-center gap-2">
                <input
                  className="input"
                  placeholder={`Option ${i + 1}`}
                  value={o.label}
                  onChange={(e) => setOption(i, { label: e.target.value })}
                  aria-label={`Option ${i + 1} label`}
                />
                {scored && (
                  <select
                    className="input w-28"
                    value={o.score ?? ""}
                    onChange={(e) => setOption(i, { score: Number(e.target.value) || null })}
                    aria-label={`Option ${i + 1} score`}
                  >
                    <option value="">Score…</option>
                    {[1, 2, 3, 4, 5].map((s) => (
                      <option key={s} value={s}>
                        Score {s}
                      </option>
                    ))}
                  </select>
                )}
                <button
                  type="button"
                  className="btn-secondary btn-sm"
                  onClick={() => set("options", v.options.filter((_, j) => j !== i))}
                  aria-label={`Remove option ${i + 1}`}
                >
                  ✕
                </button>
              </div>
            ))}
            <button
              type="button"
              className="btn-secondary btn-sm"
              onClick={() => set("options", [...v.options, { label: "", score: null }])}
            >
              + Add option
            </button>
          </div>
        )}
      </div>

      <div className="flex items-center gap-6">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="isActive"
            className="accent-brand"
            checked={v.isActive}
            onChange={(e) => set("isActive", e.target.checked)}
          />
          Active (included in surveys)
        </label>
        <SubmitButton>{v.id ? "Save question" : "Create question"}</SubmitButton>
      </div>
    </ActionForm>
  );
}
