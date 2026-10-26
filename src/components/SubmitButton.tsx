"use client";

import { useFormStatus } from "react-dom";

/**
 * A submit button that disables itself and shows a busy label while its form
 * is being processed by a Server Action. Must be rendered inside a <form>.
 */
export function SubmitButton({
  children,
  pendingText = "Saving…",
  className = "btn-primary",
}: {
  children: React.ReactNode;
  pendingText?: string;
  className?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={className}>
      {pending ? pendingText : children}
    </button>
  );
}
