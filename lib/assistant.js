export const MAX_DOC_CHARS = 8000;

export function isValidDocName(name) {
  return typeof name === "string" && /\.(txt|md|csv)$/i.test(name.trim());
}

export function isValidDocType(type, name) {
  if (isValidDocName(name)) return true;
  return typeof type === "string" && type.startsWith("text/");
}

export function cleanDocText(text) {
  if (typeof text !== "string") return "";
  return text.replace(/\r/g, "").trim().slice(0, MAX_DOC_CHARS);
}

export function buildAssistantMessages(history, docText = "") {
  const msgs = [
    { role: "system", content: "You are a kind farm helper for Africa. Use simple English, short sentences. Give 2 to 4 steps. If you show code or a table, keep it short." }
  ];
  const doc = cleanDocText(docText);
  if (doc) {
    msgs.push({ role: "user", content: "My paper says:\n" + doc });
  }
  const h = Array.isArray(history) ? history.slice(-10) : [];
  for (const m of h) {
    if (!m || (m.role !== "user" && m.role !== "assistant")) continue;
    const c = String(m.content || "").slice(0, 2000);
    if (!c.trim()) continue;
    msgs.push({ role: m.role, content: c });
  }
  return msgs;
}