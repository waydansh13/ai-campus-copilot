export const GEMINI_KEYS = [
  process.env.GEMINI_API_KEY_1,
  process.env.GEMINI_API_KEY_2,
  process.env.GEMINI_API_KEY_3,
  process.env.GEMINI_API_KEY_4,
].filter(Boolean);

let currentKeyIndex = 0;

export function getGeminiKey() {
  if (GEMINI_KEYS.length === 0) {
    throw new Error("No Gemini API keys configured");
  }

  const key = GEMINI_KEYS[currentKeyIndex];

  currentKeyIndex =
    (currentKeyIndex + 1) % GEMINI_KEYS.length;

  return key!;
}