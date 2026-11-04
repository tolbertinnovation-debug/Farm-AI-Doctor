export function normalizeEmail(email) {
  if (typeof email !== "string") return "";
  return email.trim().toLowerCase();
}

export function isValidEmail(email) {
  if (typeof email !== "string") return false;
  if (email.length < 5 || email.length > 254) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function isValidPassword(password) {
  return typeof password === "string" && password.length >= 6;
}

export function isValidSignupRole(role) {
  return role === "farmer" || role === "expert";
}

export function cleanText(value, maxLen = 200) {
  if (typeof value !== "string") return "";
  let t = value.trim().replace(/\s+/g, " ");
  if (t.length > maxLen) t = t.slice(0, maxLen);
  return t;
}

export function isValidCropName(name) {
  return typeof name === "string" && name.trim().length >= 2 && name.trim().length <= 60;
}

export function isValidAnimalType(type) {
  return typeof type === "string" && type.trim().length >= 2 && type.trim().length <= 40;
}

export function isValidAnimalCount(value) {
  const n = Number(value);
  return Number.isInteger(n) && n >= 1 && n <= 100000;
}