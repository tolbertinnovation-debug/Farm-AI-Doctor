export const MAX_CROP_PHOTO_BYTES = 4 * 1024 * 1024;

export function isValidPhotoType(type) {
  return typeof type === "string" && type.startsWith("image/");
}

export function isValidPhotoSize(size) {
  const n = Number(size);
  return Number.isFinite(n) && n > 0 && n <= MAX_CROP_PHOTO_BYTES;
}

export function buildSparkMessages(imageDataUrl, cropHint = "") {
  const hint = String(cropHint || "").slice(0, 100);
  return [
    { role: "system", content: "You help farmers. Describe crop leaf photos in simple, short words." },
    {
      role: "user",
      content: [
        { type: "text", text: "Describe what you see on this leaf. Crop: " + (hint || "unknown") + ". Say colour, spots, damage in 3 to 5 short lines." },
        { type: "image_url", image_url: { url: imageDataUrl } }
      ]
    }
  ];
}

export function buildWonderMessages(description, cropName = "") {
  const desc = String(description || "").slice(0, 2000);
  const crop = String(cropName || "").slice(0, 100);
  return [
    { role: "system", content: "You are a kind crop doctor. Use simple English. Reply with JSON only." },
    { role: "user", content: "Crop: " + (crop || "unknown") + "\nWhat was seen: " + desc + '\nReply with JSON only like {"disease":"name or unknown","treatment":"2-3 short steps","confidence":"low or medium or high"}' }
  ];
}

export function parseWonderResult(text) {
  if (typeof text !== "string") {
    return { disease: "Unknown", treatment: "", confidence: "low" };
  }
  const t = text.trim();
  try {
    const start = t.indexOf("{");
    const end = t.lastIndexOf("}");
    if (start === -1 || end === -1) throw new Error("no json");
    const obj = JSON.parse(t.slice(start, end + 1));
    const conf = String(obj.confidence || "low").toLowerCase();
    return {
      disease: String(obj.disease || "Unknown").slice(0, 200) || "Unknown",
      treatment: String(obj.treatment || "").slice(0, 1000),
      confidence: conf === "medium" || conf === "high" ? conf : "low"
    };
  } catch {
    return { disease: "Unknown", treatment: t.slice(0, 1000), confidence: "low" };
  }
}