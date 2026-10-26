"use client";

/**
 * A submit button that asks "Are you sure?" first. Cancelling the browser
 * confirm dialog prevents the form from being submitted.
 */
export function ConfirmButton({
  children,
  message,
  className = "btn-danger btn-sm",
}: {
  children: React.ReactNode;
  message: string;
  className?: string;
}) {
  return (
    <button
      type="submit"
      className={className}
      onClick={(e) => {
        if (!confirm(message)) e.preventDefault();
      }}
    >
      {children}
    </button>
  );
}
