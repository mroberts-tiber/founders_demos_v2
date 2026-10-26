/** What an admin form's Server Action returns: shown above the form by <ActionForm>. */
export type FormState = { error?: string; message?: string } | null;

/** Postgres error code 23505 = unique constraint violation. */
export function isUniqueViolation(e: unknown) {
  const err = e as { code?: string; cause?: { code?: string } };
  return err?.code === "23505" || err?.cause?.code === "23505";
}
