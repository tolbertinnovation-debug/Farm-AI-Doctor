export function formatCheckDate(value) {
  if (!value) return "";
  try {
    const d = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(d.getTime())) {
      return String(value).slice(0, 10);
    }
    return d.toISOString();
  } catch {
    return "";
  }
}