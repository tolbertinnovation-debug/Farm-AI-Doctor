import { buildSparkMessages, buildWonderMessages, parseWonderResult } from "./cropdoctor.js";
import { buildSparkMessages as buildAnimalSpark, buildWonderMessages as buildAnimalWonder, parseWonderResult as parseAnimalResult } from "./livestock.js";

export const META_BASE_URL = "https://api.meta.ai/v1";

export function getMetaKey() {
  return process.env.META_API_KEY || "";
}

export async function metaChatCompletion({ model, messages, maxTokens = 500 }) {
  const key = getMetaKey();
  if (!key) {
    throw new Error("Missing META_API_KEY. Add it in .env.local. See .env.example.");
  }
  const res = await fetch(META_BASE_URL + "/chat/completions", {
    method: "POST",
    headers: { Authorization: "Bearer " + key, "Content-Type": "application/json" },
    body: JSON.stringify({ model, messages, max_tokens: maxTokens })
  });
  if (!res.ok) {
    let extra = "";
    try {
      extra = await res.text();
    } catch {}
    throw new Error("AI service failed (" + res.status + "). " + String(extra).slice(0, 200));
  }
  const data = await res.json();
  const content = data && data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
  if (typeof content === "string") return content;
  if (Array.isArray(content)) return content.map((p) => p.text || "").join(" ");
  return "";
}

export async function describePhotoWithSpark(imageDataUrl, cropHint) {
  const messages = buildSparkMessages(imageDataUrl, cropHint);
  return metaChatCompletion({ model: "muse-spark-1.3", messages, maxTokens: 400 });
}

export async function diagnoseWithWonder(description, cropName) {
  const messages = buildWonderMessages(description, cropName);
  const text = await metaChatCompletion({ model: "muse-wonder-1.0", messages, maxTokens: 500 });
  const parsed = parseWonderResult(text);
  return { text, disease: parsed.disease, treatment: parsed.treatment, confidence: parsed.confidence };
}

export async function describeAnimalPhotoWithSpark(imageDataUrl, animalType) {
  const messages = buildAnimalSpark(imageDataUrl, animalType);
  return metaChatCompletion({ model: "muse-spark-1.3", messages, maxTokens: 400 });
}

export async function diagnoseAnimalWithWonder(description, animalType) {
  const messages = buildAnimalWonder(description, animalType);
  const text = await metaChatCompletion({ model: "muse-wonder-1.0", messages, maxTokens: 500 });
  const parsed = parseAnimalResult(text);
  return { text, cause: parsed.cause, firstAid: parsed.firstAid, callVet: parsed.callVet, confidence: parsed.confidence };
}