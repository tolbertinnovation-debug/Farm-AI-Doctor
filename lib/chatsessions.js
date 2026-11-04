export function cleanChatText(value, maxLen = 2000) {
  if (typeof value !== "string") return "";
  let t = value.trim();
  if (t.length > maxLen) t = t.slice(0, maxLen);
  return t;
}

export function makeSessionTitle(firstText) {
  const t = cleanChatText(firstText, 60);
  if (!t) return "New chat";
  if (t.length <= 40) return t;
  return t.slice(0, 40);
}

export function isValidSessionId(id) {
  const n = Number(id);
  return Number.isInteger(n) && n > 0;
}

export function buildAssistantMessages(history, newText) {
  const list = Array.isArray(history) ? history.slice(-20) : [];
  const msgs = [
    { role: "system", content: "You help farmers in Liberia. Use simple short English. Short answer. If code or table is asked, show it plain." }
  ];
  for (const h of list) {
    if (h && (h.role === "user" || h.role === "assistant") && typeof h.content === "string") {
      msgs.push({ role: h.role, content: h.content.slice(0, 2000) });
    }
  }
  msgs.push({ role: "user", content: String(newText || "").slice(0, 2000) });
  return msgs;
}