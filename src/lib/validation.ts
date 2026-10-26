const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Response ids come from the URL; check the shape before handing them to Postgres. */
export function isUuid(value: string) {
  return UUID_RE.test(value);
}

/** Read a trimmed string field from a submitted form. */
export function str(formData: FormData, key: string) {
  const v = formData.get(key);
  return typeof v === "string" ? v.trim() : "";
}

/** Read a positive integer field (e.g. an id) from a submitted form, or null. */
export function int(formData: FormData, key: string) {
  const n = Number(str(formData, key));
  return Number.isInteger(n) && n > 0 ? n : null;
}

/** "Software & SaaS" -> "software-saas" */
export function slugify(text: string) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
