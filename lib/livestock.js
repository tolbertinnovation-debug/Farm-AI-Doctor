export const MAX_LIVESTOCK_PHOTO_BYTES = 4 * 1024 * 1024;

export function isValidPhotoType(type) {
  return typeof type === "string" && type.startsWith("image/");
}

export function isValidPhotoSize(size) {
  const n = Number(size);
  return Number.isFinite(n) && n > 0 && n <= MAX_LIVESTOCK_PHOTO_BYTES;
}

export function buildSparkMessages(imageDataUrl, animalType = "") {
  const hint = String(animalType || "").slice(0, 100);
  return [
    { role: "system", content: "You help farmers. Describe animal photos in simple, short words." },
    {
      role: "user",
      content: [
        { type: "text", text: "Describe what you see on this animal. Animal: " + (hint || "unknown") + ". Say body part, colour, swelling, discharge in 3 to 5 short lines." },
        { type: "image_url", image_url: { url: imageDataUrl } }
      ]
    }
  ];
}

export function buildWonderMessages(description, animalType = "") {
  const desc = String(description || "").slice(0, 2000);
  const animal = String(animalType || "").slice(0, 100);
  return [
    { role: "system", content: "You are a kind animal doctor. Use simple English. Reply with JSON only." },
    { role: "user", content: "Animal: " + (animal || "unknown") + "\nWhat was seen: " + desc + '\nReply with JSON only like {"cause":"name or unknown","firstAid":"2-3 short steps","callVet":"when to call vet","confidence":"low or medium or high"}' }
  ];
}

export function parseWonderResult(text) {
  if (typeof text !== "string") {
    return { cause: "Unknown", firstAid: "", callVet: "", confidence: "low" };
  }
  const t = text.trim();
  try {
    const start = t.indexOf("{");
    const end = t.lastIndexOf("}");
    if (start === -1 || end === -1) throw new Error("no json");
    const obj = JSON.parse(t.slice(start, end + 1));
    const conf = String(obj.confidence || "low").toLowerCase();
    return {
      cause: String(obj.cause || "Unknown").slice(0, 200) || "Unknown",
      firstAid: String(obj.firstAid || "").slice(0, 1000),
      callVet: String(obj.callVet || "").slice(0, 1000),
      confidence: conf === "medium" || conf === "high" ? conf : "low"
    };
  } catch {
    return { cause: "Unknown", firstAid: t.slice(0, 1000), callVet: "", confidence: "low" };
  }
}