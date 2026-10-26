"use client";

import { useActionState } from "react";
import type { FormState } from "@/app/admin/form-state";

/**
 * A <form> wired to a Server Action that returns a FormState. Shows the
 * returned error or success message above the fields. useActionState is the
 * React hook that keeps the action's latest return value between submits.
 */
export function ActionForm({
  action,
  children,
  className,
}: {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  children: React.ReactNode;
  className?: string;
}) {
  const [state, formAction] = useActionState(action, null);
  return (
    <form action={formAction} className={className}>
      {state?.error && (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{state.error}</p>
      )}
      {state?.message && (
        <p className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          {state.message}
        </p>
      )}
      {children}
    </form>
  );
}
