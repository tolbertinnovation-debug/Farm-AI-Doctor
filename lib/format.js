export function formatCheckDate(value) {
  if (!value) return "";
  try {
    const dt = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(dt.getTime())) return String(value).slice(0, 10);
    return dt.toISOString().slice(0, 10);
  } catch {
    return String(value || "").slice(0, 10);
  }
}