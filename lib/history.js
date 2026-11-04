export function cleanHistorySearch(value) {
  if (typeof value !== "string") return "";
  return value.trim().replace(/\s+/g, " ").slice(0, 100);
}

export function isValidHistoryKind(kind) {
  return kind === "" || kind === "crop" || kind === "livestock" || kind === "chat";
}

export function isValidHistoryDate(s) {
  if (typeof s !== "string") return false;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return false;
  return d.toISOString().slice(0, 10) === s;
}

export function getCheckDateString(c) {
  if (!c) return "";
  const v = c.created_at;
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  return String(v || "").slice(0, 10);
}

export function filterChecks(list, opts = {}) {
  const q = cleanHistorySearch(opts.q || "").toLowerCase();
  const kind = typeof opts.kind === "string" ? opts.kind : "";
  const date = typeof opts.date === "string" ? opts.date : "";
  const arr = Array.isArray(list) ? list : [];
  return arr.filter((c) => {
    if (kind && kind !== "all" && c.kind !== kind) return false;
    if (date && getCheckDateString(c) !== date) return false;
    if (q) {
      const hay = String(c.title || "") + " " + String(c.summary || "");
      if (!hay.toLowerCase().includes(q)) return false;
    }
    return true;
  });
}