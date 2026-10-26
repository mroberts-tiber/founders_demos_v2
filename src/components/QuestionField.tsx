import type { Industry } from "@/db/schema";
import type { SurveyQuestion } from "@/lib/questionnaire";
import { SCALE_LABELS } from "@/lib/scoring";

/**
 * Renders the input for one survey question. Plain HTML form controls named
 * `q_<questionId>`, so the form works without any JavaScript, exactly like a
 * classic HTML form posted to a servlet.
 */
export function QuestionField({
  question,
  number,
  industries = [],
}: {
  question: SurveyQuestion;
  number: number;
  industries?: Pick<Industry, "id" | "name">[];
}) {
  const name = `q_${question.id}`;

  return (
    <fieldset className="card">
      <legend className="sr-only">{question.prompt}</legend>
      <div className="flex gap-3">
        <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-gray-100 text-xs font-semibold text-gray-500">
          {number}
        </span>
        <div className="flex-1">
          <p className="font-medium text-gray-900">{question.prompt}</p>
          {question.helpText && <p className="mt-1 text-sm text-gray-500">{question.helpText}</p>}
          <div className="mt-4">
            <Input question={question} name={name} industries={industries} />
          </div>
        </div>
      </div>
    </fieldset>
  );
}

const optionClass =
  "flex cursor-pointer items-center gap-3 rounded-md border border-gray-200 px-3 py-2 text-sm hover:border-gray-300 has-checked:border-brand has-checked:bg-brand/5";

function Input({
  question,
  name,
  industries,
}: {
  question: SurveyQuestion;
  name: string;
  industries: Pick<Industry, "id" | "name">[];
}) {
  switch (question.answerType) {
    case "scale":
      return (
        <div className="grid grid-cols-5 gap-2">
          {SCALE_LABELS.map((label, i) => (
            <label
              key={label}
              className="flex cursor-pointer flex-col items-center gap-1 rounded-md border border-gray-200 px-1 py-2 text-center hover:border-gray-300 has-checked:border-brand has-checked:bg-brand has-checked:text-white"
            >
              <input type="radio" name={name} value={i + 1} required className="sr-only" />
              <span className="text-lg font-semibold">{i + 1}</span>
              <span className="text-[11px] leading-tight">{label}</span>
            </label>
          ))}
        </div>
      );
    case "yes_no":
      return (
        <div className="flex gap-2">
          {["yes", "no"].map((v) => (
            <label key={v} className={`${optionClass} w-28 justify-center capitalize`}>
              <input type="radio" name={name} value={v} required className="accent-brand" />
              {v}
            </label>
          ))}
        </div>
      );
    case "choice":
      return (
        <div className="grid gap-2">
          {question.options.map((o, i) => (
            <label key={i} className={optionClass}>
              <input type="radio" name={name} value={i} required className="accent-brand" />
              {o.label}
            </label>
          ))}
        </div>
      );
    case "industry":
      return (
        <select name={name} required defaultValue="" className="input max-w-md">
          <option value="" disabled>
            Select an industry…
          </option>
          {industries.map((i) => (
            <option key={i.id} value={i.id}>
              {i.name}
            </option>
          ))}
        </select>
      );
    case "text":
      return <textarea name={name} rows={3} className="input" />;
  }
}
