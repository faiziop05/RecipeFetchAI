import { GoogleGenerativeAI } from "@google/generative-ai";

// Retrieve the Gemini API key from environment variables
const GEMINI_API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY || "";

let genAI: GoogleGenerativeAI | null = null;
if (GEMINI_API_KEY) {
  console.log(
    `[Gemini] Found EXPO_PUBLIC_GEMINI_API_KEY (starts with: ${GEMINI_API_KEY.substring(0, 6)}...). Initializing GoogleGenerativeAI...`,
  );
  genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
} else {
  console.warn(
    "[Gemini] Warning: EXPO_PUBLIC_GEMINI_API_KEY environment variable is not defined or is empty. Gemini API calls will be skipped.",
  );
}

// ─── Retry & Fallback Configuration ─────────────────────────────────────────

const MODEL_CASCADE = [
  "gemini-2.5-flash",
  "gemini-2.5-flash-lite",
  "gemini-3.5-flash",
  "gemini-3.1-flash-lite",
  "gemini-2.0-flash",
  "gemini-2.0-flash-lite",
];

const CLOUD_PROXY_PROVIDER = {
  name: "Cloud Proxy",
  url: "https://ollama.com/api/generate",
  key: process.env.OLLEMA_API_KEY || "AIzaSyA9LvCQs8j9gIq4xnJ2DL2UPy5u1QDqVS4",
  model: "qwen3:14b",
};

/**
 * Calls Gemini / Cloud Proxy models and returns raw text response (token-efficient).
 */
async function callWithRetry(
  buildRequest: (modelName: string) => Promise<any>,
  promptText: string,
): Promise<string> {
  let lastError: any = null;

  if (genAI) {
    console.log(
      `[Gemini] Starting model cascade with ${MODEL_CASCADE.length} models...`,
    );
    for (let i = 0; i < MODEL_CASCADE.length; i++) {
      const modelName = MODEL_CASCADE[i];
      try {
        console.log(`[Gemini] Attempting request using model: ${modelName}...`);
        const result = await buildRequest(modelName);
        console.log(`[Gemini] Success on model ${modelName}!`);
        return result.response.text();
      } catch (err: any) {
        lastError = err;
        console.warn(
          `[Gemini] Error on model ${modelName}:`,
          err?.message || err,
          err,
        );

        const isAuthError =
          err?.message?.includes("API_KEY_INVALID") ||
          err?.message?.includes("API key not valid") ||
          err?.message?.includes("leaked") ||
          err?.status === 403;

        if (isAuthError) {
          console.warn(
            `[Gemini] Auth error on model ${modelName}. Aborting cascade...`,
            err?.message || err,
          );
          break;
        }

        const isLast = i === MODEL_CASCADE.length - 1;
        if (!isLast) {
          const is503 =
            err?.message?.includes("503") ||
            err?.message?.includes("high demand") ||
            err?.status === 503;

          const delayMs = is503 ? Math.pow(2, i) * 1000 : 0;

          if (delayMs > 0) {
            console.warn(
              `[Gemini] ${modelName} returned 503 (high demand). Retrying cascade with next model in ${delayMs / 1000}s...`,
            );
            await new Promise((res) => setTimeout(res, delayMs));
          } else {
            console.warn(
              `[Gemini] ${modelName} failed (rate limit/quota/error). Cascading immediately to next model...`,
            );
          }
        } else {
          console.warn(
            `[Gemini] ${modelName} failed on the final model in the cascade. No more models left to try.`,
          );
        }
      }
    }
  } else {
    console.warn(
      "[Gemini] Skipping cascade because genAI is not initialized (API key is missing).",
    );
  }

  // Handle specific leaked/invalid API key error cleanly
  const isLeakedKey =
    lastError?.message?.includes("leaked") ||
    lastError?.message?.includes("API_KEY_INVALID") ||
    lastError?.status === 403;

  if (isLeakedKey) {
    throw new Error(
      "🔑 API Key Revoked / Leaked\n\n" +
        "Google automatically revoked your Gemini API key because it was detected in a public repository.\n\n" +
        "Fix: Get a new free key at https://aistudio.google.com/app/apikey and paste it into `.env` under `EXPO_PUBLIC_GEMINI_API_KEY`.",
    );
  }

  if (!CLOUD_PROXY_PROVIDER.key) {
    const missingKeysMsg =
      `No operational API keys found.\n` +
      `- Gemini: ${GEMINI_API_KEY ? "Loaded (but failed all cascade models)" : "Missing (EXPO_PUBLIC_GEMINI_API_KEY is empty)"}\n` +
      `- Cloud Proxy: Missing (OLLEMA_API_KEY is empty)`;

    console.warn(`[Fallback] ${missingKeysMsg}`);
    throw new Error(
      `${missingKeysMsg}\nLast Gemini error: ${lastError?.message || lastError}`,
    );
  }

  console.warn(
    `[Fallback] Routing request to ${CLOUD_PROXY_PROVIDER.name} (model: ${CLOUD_PROXY_PROVIDER.model})...`,
  );
  try {
    const response = await fetch(CLOUD_PROXY_PROVIDER.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(CLOUD_PROXY_PROVIDER.key
          ? { Authorization: `Bearer ${CLOUD_PROXY_PROVIDER.key}` }
          : {}),
      },
      body: JSON.stringify({
        model: CLOUD_PROXY_PROVIDER.model,
        prompt: promptText,
        stream: false,
      }),
    });

    if (!response.ok) {
      const errBody = await response
        .text()
        .catch(() => "No error response body");
      console.warn(
        `[Fallback] Cloud Proxy endpoint returned non-OK response: Status ${response.status}. Body:`,
        errBody,
      );
      throw new Error(
        `Cloud Proxy endpoint returned status ${response.status}: ${errBody}`,
      );
    }

    const data = await response.json();
    console.log(
      `[Fallback] Successfully received response from ${CLOUD_PROXY_PROVIDER.name}.`,
    );
    return data.response;
  } catch (proxyError: any) {
    console.warn(
      "[Fallback] Cloud Proxy failed as well:",
      proxyError?.message || proxyError,
      proxyError,
    );

    const finalErrorMessage =
      `All recipe extraction pathways failed:\n` +
      `1. Gemini Cascade Error: ${lastError?.message || lastError || "Skipped (no API key)"}\n` +
      `2. Cloud Proxy Error: ${proxyError?.message || proxyError}`;

    const finalError = new Error(finalErrorMessage);
    (finalError as any).lastError = lastError;
    (finalError as any).proxyError = proxyError;
    throw finalError;
  }
}

// ─── Compact Text Parsers ───────────────────────────────────────────────────

/**
 * Parses a single compact text recipe into a structured JSON/JS Object.
 * Fallback to JSON.parse if LLM returns JSON.
 */
export function parseCompactRecipeText(text: string): any {
  if (!text) throw new Error("Empty AI response received.");

  const trimmed = text.trim();

  // 1. Try parsing JSON if LLM returned JSON directly or inside markdown ```json ... ```
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
    try {
      const json = JSON.parse(trimmed);
      if (json && (json.title || json.ingredients)) return json;
    } catch (e) {}
  }

  const jsonBlockMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (jsonBlockMatch) {
    try {
      const json = JSON.parse(jsonBlockMatch[1]);
      if (json && (json.title || json.ingredients)) return json;
    } catch (e) {}
  }

  // 2. Parse custom compact line-based text format
  const lines = trimmed.split("\n");
  let title = "";
  let prepTime = "20 mins";
  let calories = "0 kcal";
  let totalProtein = "0g";
  let totalCarbs = "0g";
  let totalFats = "0g";

  const ingredients: any[] = [];
  const instructions: string[] = [];

  let currentSection: "header" | "ingredient" | "instructions" = "header";
  let currentIng: any = null;

  for (let rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    const lower = line.toLowerCase();

    // Section markers
    if (
      lower.startsWith("---ingredient---") ||
      lower.startsWith("---ingredients---") ||
      lower.startsWith("===ingredient===") ||
      lower.startsWith("===ingredients===")
    ) {
      if (currentIng && currentIng.name) {
        ingredients.push(currentIng);
      }
      currentIng = {
        name: "",
        amount: "1 unit",
        description: "",
        nutrition: { calories: "0 kcal", protein: "0g", carbs: "0g", fat: "0g" },
        sourcingAdvantage: "",
      };
      currentSection = "ingredient";
      continue;
    }

    if (
      lower.startsWith("---instruction") ||
      lower.startsWith("---instructions") ||
      lower.startsWith("===instruction") ||
      lower.startsWith("===instructions")
    ) {
      if (currentIng && currentIng.name) {
        ingredients.push(currentIng);
        currentIng = null;
      }
      currentSection = "instructions";
      continue;
    }

    // Line parsing based on current section
    if (currentSection === "header") {
      if (lower.startsWith("title:")) title = line.substring(6).trim();
      else if (lower.startsWith("prep:") || lower.startsWith("preptime:"))
        prepTime = line.substring(line.indexOf(":") + 1).trim();
      else if (lower.startsWith("calories:") || lower.startsWith("totalcalories:"))
        calories = line.substring(line.indexOf(":") + 1).trim();
      else if (lower.startsWith("protein:") || lower.startsWith("totalprotein:"))
        totalProtein = line.substring(line.indexOf(":") + 1).trim();
      else if (lower.startsWith("carbs:") || lower.startsWith("totalcarbs:"))
        totalCarbs = line.substring(line.indexOf(":") + 1).trim();
      else if (
        lower.startsWith("fat:") ||
        lower.startsWith("fats:") ||
        lower.startsWith("totalfats:")
      )
        totalFats = line.substring(line.indexOf(":") + 1).trim();
    } else if (currentSection === "ingredient" && currentIng) {
      if (lower.startsWith("name:")) currentIng.name = line.substring(5).trim();
      else if (lower.startsWith("amount:") || lower.startsWith("quantity:"))
        currentIng.amount = line.substring(line.indexOf(":") + 1).trim();
      else if (lower.startsWith("calories:"))
        currentIng.nutrition.calories = line.substring(9).trim();
      else if (lower.startsWith("protein:"))
        currentIng.nutrition.protein = line.substring(8).trim();
      else if (lower.startsWith("carbs:"))
        currentIng.nutrition.carbs = line.substring(6).trim();
      else if (lower.startsWith("fat:") || lower.startsWith("fats:"))
        currentIng.nutrition.fat = line.substring(line.indexOf(":") + 1).trim();
      else if (lower.startsWith("desc:") || lower.startsWith("description:"))
        currentIng.description = line.substring(line.indexOf(":") + 1).trim();
      else if (lower.startsWith("source:") || lower.startsWith("sourcing:"))
        currentIng.sourcingAdvantage = line.substring(line.indexOf(":") + 1).trim();
      else if (!currentIng.name) {
        currentIng.name = line.replace(/^[-*•\d.]+\s*/, "").trim();
      }
    } else if (currentSection === "instructions") {
      const cleanStep = line.replace(/^[-*•\d.]+\s*/, "").trim();
      if (cleanStep) instructions.push(cleanStep);
    }
  }

  if (currentIng && currentIng.name) {
    ingredients.push(currentIng);
  }

  return {
    title: title || "Recipe",
    prepTime: prepTime || "20 mins",
    calories: calories || "350 kcal",
    totalProtein: totalProtein || "0g",
    totalCarbs: totalCarbs || "0g",
    totalFats: totalFats || "0g",
    ingredients,
    instructions,
  };
}

/**
 * Parses compact pantry meal text into array of PantryRecipe objects.
 */
export function parseCompactPantryMealsText(text: string): any[] {
  if (!text) throw new Error("Empty AI response received.");

  const trimmed = text.trim();

  // Try JSON parsing first
  if (trimmed.startsWith("[") || trimmed.startsWith("{")) {
    try {
      const json = JSON.parse(trimmed);
      if (Array.isArray(json)) return json;
      if (json && Array.isArray(json.recipes)) return json.recipes;
    } catch (e) {}
  }

  const jsonBlockMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (jsonBlockMatch) {
    try {
      const parsed = JSON.parse(jsonBlockMatch[1]);
      if (Array.isArray(parsed)) return parsed;
    } catch (e) {}
  }

  const blocks = trimmed.split(/===RECIPE===/i).filter((b) => b.trim().length > 0);
  const recipes: any[] = [];

  for (const block of blocks) {
    try {
      const recipe = parseCompactRecipeText(block);

      let difficulty: any = "Easy";
      let matchScore = 85;
      let tier: any = "Tier 1: Exact";
      let ingredientsUsed: string[] = [];
      let missingIngredients: string[] = [];
      const substitutions: Record<string, string> = {};

      const lines = block.split("\n");
      for (const rawLine of lines) {
        const line = rawLine.trim();
        const lower = line.toLowerCase();
        if (lower.startsWith("difficulty:")) difficulty = line.substring(11).trim();
        else if (lower.startsWith("score:") || lower.startsWith("matchscore:")) {
          const num = parseInt(line.substring(line.indexOf(":") + 1).replace(/\D/g, ""), 10);
          if (!isNaN(num)) matchScore = num;
        } else if (lower.startsWith("tier:")) tier = line.substring(5).trim();
        else if (lower.startsWith("used:") || lower.startsWith("ingredientsused:")) {
          ingredientsUsed = line
            .substring(line.indexOf(":") + 1)
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean);
        } else if (
          lower.startsWith("missing:") ||
          lower.startsWith("missingingredients:")
        ) {
          missingIngredients = line
            .substring(line.indexOf(":") + 1)
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean);
        } else if (lower.startsWith("substitutions:")) {
          const subStr = line.substring(14).trim();
          subStr.split(",").forEach((pair) => {
            const parts = pair.split(/->|:/);
            if (parts.length === 2) {
              substitutions[parts[0].trim()] = parts[1].trim();
            }
          });
        }
      }

      recipes.push({
        ...recipe,
        difficulty: difficulty || "Easy",
        matchScore: matchScore || 85,
        tier: tier || "Tier 1: Exact",
        ingredientsUsed:
          ingredientsUsed.length > 0
            ? ingredientsUsed
            : recipe.ingredients.map((i: any) => i.name),
        missingIngredients,
        substitutions,
      });
    } catch (e) {
      console.warn("[Gemini] Failed to parse pantry recipe block:", e);
    }
  }

  return recipes;
}

/**
 * Parses compact meal plan text into DailyPlan[] array.
 */
export function parseCompactMealPlanText(text: string): any[] {
  if (!text) throw new Error("Empty AI response received.");

  const trimmed = text.trim();

  if (trimmed.startsWith("[") || trimmed.startsWith("{")) {
    try {
      const json = JSON.parse(trimmed);
      if (Array.isArray(json)) return json;
      if (json && Array.isArray(json.weeklyPlan)) return json.weeklyPlan;
    } catch (e) {}
  }

  const jsonBlockMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (jsonBlockMatch) {
    try {
      const parsed = JSON.parse(jsonBlockMatch[1]);
      if (Array.isArray(parsed)) return parsed;
    } catch (e) {}
  }

  const dayBlocks = trimmed.split(/===DAY===/i).filter((b) => b.trim().length > 0);
  const weeklyPlan: any[] = [];

  for (const dayBlock of dayBlocks) {
    const lines = dayBlock.split("\n");
    let date = "";
    let dayName = "";

    for (const line of lines) {
      const l = line.trim();
      if (l.toLowerCase().startsWith("date:")) date = l.substring(5).trim();
      if (
        l.toLowerCase().startsWith("dayname:") ||
        l.toLowerCase().startsWith("day:")
      )
        dayName = l.substring(l.indexOf(":") + 1).trim();
    }

    const mealBlocks = dayBlock.split(/---MEAL:\s*/i);
    const meals: any = { breakfast: null, lunch: null, dinner: null };

    for (const mBlock of mealBlocks) {
      const mTrimmed = mBlock.trim();
      const lower = mTrimmed.toLowerCase();
      let mealType: "breakfast" | "lunch" | "dinner" | null = null;
      if (lower.startsWith("breakfast")) mealType = "breakfast";
      else if (lower.startsWith("lunch")) mealType = "lunch";
      else if (lower.startsWith("dinner")) mealType = "dinner";

      if (mealType) {
        try {
          const recipeObj = parseCompactRecipeText(mTrimmed);
          meals[mealType] = recipeObj;
        } catch (e) {
          console.warn(`[Gemini] Failed to parse meal ${mealType}:`, e);
        }
      }
    }

    if (date || dayName || meals.breakfast || meals.lunch || meals.dinner) {
      weeklyPlan.push({
        date: date || new Date().toISOString().split("T")[0],
        dayName: dayName || "Day",
        meals,
      });
    }
  }

  return weeklyPlan;
}

// ───────────────────────────────────────────────────────────────────────────

/**
 * Helper to inspect video descriptions for external recipe links and fetch their webpage content.
 */
async function fetchLinkFromDescription(descText: string): Promise<string> {
  if (!descText) return "";
  const linkMatches = descText.match(/https?:\/\/[^\s"'>]+/gi);
  if (!linkMatches || linkMatches.length === 0) return "";

  for (const linkUrl of linkMatches) {
    const lowerLink = linkUrl.toLowerCase();
    const isSocialOrIgnored =
      lowerLink.includes("instagram.com") ||
      lowerLink.includes("tiktok.com") ||
      lowerLink.includes("youtube.com") ||
      lowerLink.includes("youtu.be") ||
      lowerLink.includes("twitter.com") ||
      lowerLink.includes("facebook.com") ||
      lowerLink.includes("spotify.com") ||
      lowerLink.includes("amzn.to") ||
      lowerLink.includes("amazon.com");

    if (!isSocialOrIgnored) {
      try {
        console.log(
          `[Scraper] Found external link in description: ${linkUrl}. Attempting to fetch recipe page...`,
        );
        const extRes = await fetch(linkUrl, {
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36",
            "Accept-Language": "en-US,en;q=0.9",
          },
        });
        if (extRes.ok) {
          const extHtml = await extRes.text();
          const cleanText = extHtml
            .replace(/<script[^>]*>([\s\S]*?)<\/script>/gi, "")
            .replace(/<style[^>]*>([\s\S]*?)<\/style>/gi, "")
            .replace(/<[^>]+>/g, " ")
            .replace(/\s+/g, " ")
            .trim()
            .substring(0, 35000);

          if (cleanText.length > 200) {
            console.log(
              `[Scraper] Successfully extracted content from linked recipe URL (${cleanText.length} chars).`,
            );
            return `\n\n[Recipe Content Fetched From Description Link (${linkUrl})]:\n${cleanText}`;
          }
        }
      } catch (err) {
        console.warn(`[Scraper] External link fetch error for ${linkUrl}:`, err);
      }
    }
  }

  return "";
}

/**
 * Extracts a recipe based on fetched text data or url.
 */
export async function extractRecipe(
  urlOrText: string,
  imageBase64?: string,
): Promise<any> {
  let contextData = urlOrText.trim();
  const lowercaseInput = contextData.toLowerCase();
  const isUrl =
    contextData.startsWith("http://") || contextData.startsWith("https://");

  if (isUrl) {
    try {
      console.log(
        `[Scraper] Detected URL: ${urlOrText}. Fetching page content...`,
      );
      const isYouTube =
        lowercaseInput.includes("youtube.com") ||
        lowercaseInput.includes("youtu.be");
      const isTikTok = lowercaseInput.includes("tiktok.com");
      const isInstagram =
        lowercaseInput.includes("instagram.com") ||
        lowercaseInput.includes("instagr.am");

      const response = await fetch(urlOrText, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36",
          "Accept-Language": "en-US,en;q=0.9",
          ...(isYouTube
            ? { Cookie: "CONSENT=YES+cb.20210328-17-p0.en+FX+999" }
            : {}),
        },
      });

      if (response.ok) {
        const html = await response.text();
        let scrapedText = "";

        if (isYouTube) {
          let videoTitle = "";
          let decodedDesc = "";
          let cleanedTranscript = "";

          const titleMatch = html.match(/<title>(.*?)<\/title>/i);
          if (titleMatch) {
            videoTitle = titleMatch[1].replace(" - YouTube", "");
          }

          const descMatch = html.match(
            /"shortDescription"\s*:\s*"((?:[^"\\]|\\.)*)"/,
          );
          if (descMatch && descMatch[1]) {
            decodedDesc = descMatch[1]
              .replace(/\\n/g, "\n")
              .replace(/\\"/g, '"')
              .replace(/\\'/g, "'")
              .replace(/\\\\/g, "\\")
              .replace(/\\u0026/g, "&");
          }

          // Fetch external link from description if present
          const externalLinkedRecipe = await fetchLinkFromDescription(decodedDesc);

          try {
            let timedTextUrlRaw = "";
            const timedTextMatch1 = html.match(
              /"baseUrl"\s*:\s*"([^"]*?api(?:\\\/|\/|\\u002f)timedtext[^"]*?)"/i,
            );
            const timedTextMatch2 = html.match(
              /"(https[^"]*?api(?:\\\/|\/|\\u002f)timedtext[^"]*?)"/i,
            );
            const timedTextMatch3 = html.match(
              /\\"(https[^"]*?api(?:\\\/|\/|\\u002f)timedtext[^"]*?)\\"/i,
            );
            const timedTextMatch4 = html.match(
              /(https:\\\/\\\/[^"]*?api\\\/timedtext[^"]*?)/i,
            );

            if (timedTextMatch1) timedTextUrlRaw = timedTextMatch1[1];
            else if (timedTextMatch2) timedTextUrlRaw = timedTextMatch2[1];
            else if (timedTextMatch3) timedTextUrlRaw = timedTextMatch3[1];
            else if (timedTextMatch4) timedTextUrlRaw = timedTextMatch4[1];

            if (timedTextUrlRaw) {
              let timedTextUrl = timedTextUrlRaw
                .replace(/\\u0026/g, "&")
                .replace(/\\u003d/g, "=")
                .replace(/\\u002f/g, "/")
                .replace(/\\\//g, "/")
                .replace(/\\/g, "");

              if (
                !timedTextUrl.includes("lang=en") &&
                !timedTextUrl.includes("&tlang=en")
              ) {
                timedTextUrl += "&tlang=en";
              }

              console.log(
                `[Scraper] Found YouTube timedtext URL: ${timedTextUrl}. Fetching spoken transcript...`,
              );
              const subRes = await fetch(timedTextUrl, {
                headers: {
                  "User-Agent":
                    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36",
                  "Accept-Language": "en-US,en;q=0.9",
                  Cookie: "CONSENT=YES+cb.20210328-17-p0.en+FX+999",
                },
              });

              if (subRes.ok) {
                const xml = await subRes.text();
                cleanedTranscript = xml
                  .replace(/<text[^>]*>([\s\S]*?)<\/text>/gi, "$1 ")
                  .replace(/&amp;/g, "&")
                  .replace(/&lt;/g, "<")
                  .replace(/&gt;/g, ">")
                  .replace(/&#39;/g, "'")
                  .replace(/&quot;/g, '"')
                  .replace(/<[^>]+>/g, "")
                  .replace(/\s+/g, " ")
                  .trim();

                console.log(
                  `[Scraper] Successfully parsed spoken transcript (${cleanedTranscript.length} chars).`,
                );
              }
            } else {
              console.log(
                "[Scraper] No timedtext baseUrl found in YouTube HTML.",
              );
            }
          } catch (captionErr) {
            console.warn(
              "[Scraper] Failed to fetch or parse YouTube captions:",
              captionErr,
            );
          }

          scrapedText = `YouTube Video URL: ${urlOrText}\nVideo Title: ${videoTitle}`;
          if (externalLinkedRecipe) {
            scrapedText += externalLinkedRecipe;
          }
          if (decodedDesc) {
            scrapedText += `\n\n[Written Video Description]:\n${decodedDesc}`;
          }
          if (cleanedTranscript) {
            scrapedText += `\n\n[Spoken Video Transcript (Subtitles)]:\n${cleanedTranscript}`;
          }

          console.log(
            `[Scraper] Successfully processed YouTube URL. Title: "${videoTitle}".`,
          );
        } else if (isTikTok) {
          let videoTitle = "";
          let videoDesc = "";

          const titleMatch = html.match(/<title>(.*?)<\/title>/i);
          if (titleMatch) {
            videoTitle = titleMatch[1].replace(" | TikTok", "");
          }

          const descMatch =
            html.match(
              /<meta\s+property="og:description"\s+content="([^"]*)"/i,
            ) ||
            html.match(/<meta\s+name="description"\s+content="([^"]*)"/i) ||
            html.match(/"desc"\s*:\s*"((?:[^"\\]|\\.)*)"/);

          if (descMatch && descMatch[1]) {
            videoDesc = descMatch[1]
              .replace(/\\n/g, "\n")
              .replace(/\\"/g, '"')
              .replace(/\\'/g, "'")
              .replace(/\\\\/g, "\\");
          }

          const externalLinkedRecipe = await fetchLinkFromDescription(videoDesc);

          scrapedText = `TikTok Video URL: ${urlOrText}`;
          if (videoTitle) {
            scrapedText += `\nVideo Title: ${videoTitle}`;
          }
          if (externalLinkedRecipe) {
            scrapedText += externalLinkedRecipe;
          }
          if (videoDesc) {
            scrapedText += `\n\n[Written Video Description / Tags]:\n${videoDesc}`;
          }

          console.log(
            `[Scraper] Successfully processed TikTok URL. Title: "${videoTitle}".`,
          );
        } else if (isInstagram) {
          let postTitle = "";
          let postDesc = "";

          const titleMatch = html.match(/<title>(.*?)<\/title>/i);
          if (titleMatch) {
            postTitle = titleMatch[1]
              .replace(" • Instagram photos and videos", "")
              .replace(" | Instagram", "");
          }

          const descMatch =
            html.match(
              /<meta\s+property="og:description"\s+content="([^"]*)"/i,
            ) || html.match(/<meta\s+name="description"\s+content="([^"]*)"/i);

          if (descMatch && descMatch[1]) {
            postDesc = descMatch[1]
              .replace(/\\n/g, "\n")
              .replace(/\\"/g, '"')
              .replace(/\\'/g, "'")
              .replace(/\\\\/g, "\\");
          }

          const externalLinkedRecipe = await fetchLinkFromDescription(postDesc);

          scrapedText = `Instagram Post URL: ${urlOrText}`;
          if (postTitle) {
            scrapedText += `\nPost Title/Header: ${postTitle}`;
          }
          if (externalLinkedRecipe) {
            scrapedText += externalLinkedRecipe;
          }
          if (postDesc) {
            scrapedText += `\n\n[Post Caption / Recipe Context]:\n${postDesc}`;
          }

          console.log(
            `[Scraper] Successfully processed Instagram URL. Title: "${postTitle}".`,
          );
        }

        if (!scrapedText) {
          try {
            const jsonLdMatches = html.match(
              /<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi,
            );
            if (jsonLdMatches) {
              for (const scriptTag of jsonLdMatches) {
                const jsonText = scriptTag
                  .replace(/<script[^>]*>|<\/script>/gi, "")
                  .trim();
                try {
                  const jsonObj = JSON.parse(jsonText);

                  const findRecipeSchema = (obj: any): any => {
                    if (!obj) return null;
                    if (obj["@type"] === "Recipe") return obj;
                    if (Array.isArray(obj)) {
                      for (const item of obj) {
                        const found = findRecipeSchema(item);
                        if (found) return found;
                      }
                    }
                    if (obj["@graph"] && Array.isArray(obj["@graph"])) {
                      for (const item of obj["@graph"]) {
                        const found = findRecipeSchema(item);
                        if (found) return found;
                      }
                    }
                    return null;
                  };

                  const recipeSchema = findRecipeSchema(jsonObj);
                  if (recipeSchema) {
                    let schemaText = `Structured JSON-LD Recipe Schema Data:\n`;
                    schemaText += `Recipe Name: ${recipeSchema.name || ""}\n`;
                    schemaText += `Prep Time: ${recipeSchema.prepTime || ""}\n`;
                    schemaText += `Cook Time: ${recipeSchema.cookTime || ""}\n`;
                    schemaText += `Total Time: ${recipeSchema.totalTime || ""}\n`;
                    schemaText += `Yield/Servings: ${recipeSchema.recipeYield || ""}\n`;

                    if (recipeSchema.recipeCategory) {
                      schemaText += `Category: ${recipeSchema.recipeCategory}\n`;
                    }

                    if (
                      recipeSchema.recipeIngredient &&
                      Array.isArray(recipeSchema.recipeIngredient)
                    ) {
                      schemaText +=
                        `Ingredients List:\n- ` +
                        recipeSchema.recipeIngredient.join("\n- ") +
                        "\n";
                    }

                    if (recipeSchema.recipeInstructions) {
                      schemaText += `Instructions List:\n`;
                      const parseInstructions = (inst: any): string[] => {
                        if (typeof inst === "string") return [inst];
                        if (Array.isArray(inst)) {
                          return inst.map((i) => {
                            if (typeof i === "string") return i;
                            if (i.text) return i.text;
                            if (i.name) return i.name;
                            return JSON.stringify(i);
                          });
                        }
                        return [];
                      };
                      schemaText +=
                        parseInstructions(recipeSchema.recipeInstructions).join(
                          "\n",
                        ) + "\n";
                    }

                    if (
                      recipeSchema.nutrition &&
                      typeof recipeSchema.nutrition === "object"
                    ) {
                      schemaText += `Nutrition Information: ${JSON.stringify(recipeSchema.nutrition)}\n`;
                    }

                    scrapedText = schemaText;
                    break;
                  }
                } catch (jsonErr) {}
              }
            }
          } catch (ldErr) {
            console.warn(
              "[Scraper] Google JSON-LD recipe schema extraction failed:",
              ldErr,
            );
          }
        }

        if (!scrapedText) {
          const cleanText = html
            .replace(/<script[^>]*>([\s\S]*?)<\/script>/gi, "")
            .replace(/<style[^>]*>([\s\S]*?)<\/style>/gi, "")
            .replace(/<!--[\s\S]*?-->/g, "")
            .replace(/<[^>]+>/g, " ")
            .replace(/\s+/g, " ")
            .trim();

          scrapedText = cleanText.substring(0, 45000);
        }

        const isVideoOrSocialScrape =
          scrapedText.startsWith("YouTube Video URL") ||
          scrapedText.startsWith("TikTok Video URL") ||
          scrapedText.startsWith("Instagram Post URL") ||
          scrapedText.startsWith("Structured JSON-LD Recipe Schema Data");

        if (scrapedText.length > 250 || isVideoOrSocialScrape) {
          contextData = isVideoOrSocialScrape
            ? scrapedText
            : `Source Webpage URL: ${urlOrText}\n\nScraped Webpage Content Text:\n${scrapedText}`;
          console.log(
            `[Scraper] Successfully scraped page (${scrapedText.length} chars). Appended to prompt context.`,
          );
        } else {
          console.warn(
            `[Scraper] Scraped content too short (${scrapedText.length} chars), likely a consent/redirect page. Passing URL directly.`,
          );
        }
      } else {
        console.warn(
          `[Scraper] Web request failed with status code ${response.status}. Passing URL directly.`,
        );
      }
    } catch (scrapeError) {
      console.warn("[Scraper] URL fetch/parsing failed:", scrapeError);
    }
  }

  const prompt = `You are an expert executive chef and culinary dietitian. Extract a complete, non-hallucinated recipe based on the input data.

Input data: ${contextData}

MANDATORY RULES:
1. EXHAUSTIVE EXTRACTION: You MUST extract 100% of all ingredients, exact quantities/amounts, and chronological cooking steps. Never summarize or omit ingredients.
2. NO HALLUCINATION: Strictly base ingredients on the provided text, description, transcript, external link, or image. Do NOT invent fake ingredients.
3. PREPARE TIME & NUTRITION: Calculate exact prep time and USDA-backed calories, protein, carbs, and fat for each ingredient.
4. EXACT MATHEMATICAL SUM: Total recipe CALORIES, PROTEIN, CARBS, and FAT MUST be the exact mathematical sum of all individual ingredient macros.
5. NO RECIPE FOUND RULE: If there are NO ingredients or cooking steps present in the input data (link, description, transcript, or image), return:
TITLE: Error: Valid recipe details could not be extracted from this source

DO NOT USE JSON FORMAT. Respond using this exact token-efficient compact plain text format:

TITLE: [Recipe Title]
PREP: [Prep/Cook Time, e.g. 20 mins]
CALORIES: [Total recipe calories, e.g. 450 kcal]
PROTEIN: [Total recipe protein, e.g. 35g]
CARBS: [Total recipe carbs, e.g. 28g]
FAT: [Total recipe fat, e.g. 15g]

---INGREDIENT---
NAME: [Ingredient Name]
AMOUNT: [Quantity/Amount]
CALORIES: [Estimated calories for this ingredient amount, e.g. 120 kcal]
PROTEIN: [Protein, e.g. 2g]
CARBS: [Carbs, e.g. 8g]
FAT: [Fat, e.g. 10g]
DESC: [1-2 sentence USDA calculation breakdown]
SOURCE: [2-3 sentences on health benefits and sourcing]

---INGREDIENT---
NAME: [Next Ingredient]
AMOUNT: [Quantity]
CALORIES: [Calories]
PROTEIN: [Protein]
CARBS: [Carbs]
FAT: [Fat]
DESC: [Description]
SOURCE: [Sourcing]

---INSTRUCTIONS---
1. [First instruction step]
2. [Second instruction step]
3. [Third instruction step]`;

  try {
    const rawText = await callWithRetry(async (modelName) => {
      const model = genAI!.getGenerativeModel({ model: modelName });
      if (imageBase64) {
        return model.generateContent([
          prompt,
          { inlineData: { data: imageBase64, mimeType: "image/jpeg" } },
        ]);
      }
      return model.generateContent(prompt);
    }, prompt);

    const result = parseCompactRecipeText(rawText);

    // Validate extracted recipe object and throw user error if no recipe returned
    if (
      !result ||
      !result.title ||
      result.title.toLowerCase().includes("error") ||
      result.title.toLowerCase().includes("could not be extracted") ||
      !result.ingredients ||
      result.ingredients.length === 0
    ) {
      throw new Error(
        "We reached the source, but could not extract any recipe ingredients or cooking steps.\n\n" +
          "💡 Pro-tip: Try copying and pasting the raw recipe text directly into the input field instead!",
      );
    }

    return result;
  } catch (error) {
    console.warn("Recipe Extraction Failure:", error);
    throw error;
  }
}

/**
 * Mutates an existing recipe
 */
export async function mutateRecipe(
  recipe: any,
  mutationType: "healthier" | "tastier" | "custom",
  extraInstructions?: string,
): Promise<any> {
  let instructions = "";
  if (mutationType === "healthier") {
    instructions =
      "Rewrite this recipe to prioritize low-calorie, organic, and highly nutritious alternatives.";
  } else if (mutationType === "tastier") {
    instructions =
      "Rewrite this recipe to elevate taste and flavor profiles.";
  } else {
    instructions = `Modify this recipe according to the following guidelines: ${extraInstructions}.`;
  }

  const prompt = `You are a master chef and culinary dietitian. Here is the existing recipe:
Title: ${recipe.title}
Prep Time: ${recipe.prepTime}
Ingredients: ${recipe.ingredients?.map((i: any) => `${i.amount} ${i.name}`).join(", ")}
Instructions: ${recipe.instructions?.join(" | ")}

Task: ${instructions}

RULES:
1. Extract ALL ingredients and steps without omitting data.
2. Total calories, protein, carbs, and fat MUST be the exact mathematical sum of individual ingredient values.
3. Do not hallucinate fake ingredients.

DO NOT USE JSON. Respond in this exact compact plain text format:

TITLE: [Updated Title]
PREP: [Prep Time]
CALORIES: [Total Calories]
PROTEIN: [Total Protein]
CARBS: [Total Carbs]
FAT: [Total Fat]

---INGREDIENT---
NAME: [Name]
AMOUNT: [Amount]
CALORIES: [Calories]
PROTEIN: [Protein]
CARBS: [Carbs]
FAT: [Fat]
DESC: [Description]
SOURCE: [Sourcing]

---INSTRUCTIONS---
1. [Step 1]
2. [Step 2]`;

  try {
    const rawText = await callWithRetry(async (modelName) => {
      const model = genAI!.getGenerativeModel({ model: modelName });
      return model.generateContent(prompt);
    }, prompt);

    return parseCompactRecipeText(rawText);
  } catch (error) {
    console.warn("Recipe Mutation Failure:", error);
    throw error;
  }
}

/**
 * Recalculates nutritional values for a recipe based on its edited ingredients.
 */
export async function recalculateNutrition(recipe: any): Promise<any> {
  const prompt = `You are a professional dietitian. Recalculate nutrition for this edited recipe:
Title: ${recipe.title}
Ingredients: ${recipe.ingredients?.map((i: any) => `${i.amount} ${i.name}`).join(", ")}
Instructions: ${recipe.instructions?.join(" | ")}

RULES:
1. Calculate exact USDA-backed calories, protein, carbs, and fat for each ingredient.
2. Total recipe calories, protein, carbs, and fat MUST equal the exact mathematical sum of all ingredient values.
3. Keep instructions exactly as they are.

DO NOT USE JSON. Respond in this exact compact plain text format:

TITLE: ${recipe.title}
PREP: ${recipe.prepTime || "20 mins"}
CALORIES: [Total sum calories]
PROTEIN: [Total sum protein]
CARBS: [Total sum carbs]
FAT: [Total sum fat]

---INGREDIENT---
NAME: [Ingredient Name]
AMOUNT: [Amount]
CALORIES: [Ingredient Calories]
PROTEIN: [Protein]
CARBS: [Carbs]
FAT: [Fat]
DESC: [Calculation breakdown]
SOURCE: [Health benefits]

---INSTRUCTIONS---
${recipe.instructions?.map((inst: string, i: number) => `${i + 1}. ${inst}`).join("\n")}`;

  try {
    const rawText = await callWithRetry(async (modelName) => {
      const model = genAI!.getGenerativeModel({ model: modelName });
      return model.generateContent(prompt);
    }, prompt);

    return parseCompactRecipeText(rawText);
  } catch (error) {
    console.warn("Recipe Nutrition Recalculation Failure:", error);
    throw error;
  }
}

// ─── Profile System Prompt Builder ───────────────────────────────────────────
export function getProfileSystemPrompt(profile: any): string {
  if (!profile) return "";

  let rules = "\n\nDIETARY & PROFILE CONSTRAINTS:\n";

  if (profile.dietary === "halal") {
    rules += "- Halal only. No pork, lard, gelatin, or alcohol.\n";
  } else if (profile.dietary === "vegetarian") {
    rules += "- Vegetarian only. No meat, poultry, fish, or seafood.\n";
  } else if (profile.dietary === "vegan") {
    rules += "- 100% Vegan only. No animal products or dairy.\n";
  }

  if (profile.allergies && profile.allergies.length > 0) {
    profile.allergies.forEach((allergy: string) => {
      rules += `- NO ${allergy.trim().toUpperCase()}.\n`;
    });
  }

  if (profile.culture && profile.culture !== "none") {
    rules += `- Prefer ${profile.culture} cuisine style.\n`;
  }

  if (profile.spicyLevel !== undefined) {
    rules += `- Spice level: ${profile.spicyLevel}/5.\n`;
  }

  if (profile.budgetLevel && profile.budgetLevel !== "none") {
    rules += `- Budget target: ${profile.budgetLevel}.\n`;
  }

  if (profile.cookingSkill) {
    rules += `- Skill target: ${profile.cookingSkill}.\n`;
  }

  return rules;
}

// ─── Pantry Suggestion Generator ────────────────────────────────────────────
export async function generatePantryMeals(
  pantryIngredients: string[],
  options: { timeLimit?: string; skillLevel?: string; profile: any },
): Promise<any[]> {
  const profileRules = getProfileSystemPrompt(options.profile);
  const prompt = `You are a professional chef. Given user pantry ingredients: ${pantryIngredients.join(", ")}.
Suggest 3 to 5 meal options.
${profileRules}
Time limit: ${options.timeLimit || "Any"}

RULES:
1. Provide an exhaustive list of every single ingredient required.
2. Do not hallucinate fake ingredients.
3. Total calories, protein, carbs, and fat MUST be the exact mathematical sum of individual ingredient values.

DO NOT USE JSON FORMAT. Respond in this exact compact plain text format for each recipe:

===RECIPE===
TITLE: [Recipe Title]
PREP: [25 mins]
DIFFICULTY: [Beginner/Intermediate/Advanced]
SCORE: [Match percentage 0-100]
TIER: [Tier 1: Exact / Tier 2: Near / Tier 3: Creative]
USED: [Pantry items used, comma separated]
MISSING: [Missing items, comma separated]
SUBSTITUTIONS: [Missing1 -> Alt1, Missing2 -> Alt2]
CALORIES: [350 kcal]
PROTEIN: [35g]
CARBS: [25g]
FAT: [12g]

---INGREDIENT---
NAME: [Name]
AMOUNT: [Amount]
CALORIES: [120 kcal]
PROTEIN: [5g]
CARBS: [10g]
FAT: [2g]
DESC: [Description]
SOURCE: [Sourcing]

---INSTRUCTIONS---
1. [Step 1]
2. [Step 2]`;

  try {
    const rawText = await callWithRetry(async (modelName) => {
      const model = genAI!.getGenerativeModel({ model: modelName });
      return model.generateContent(prompt);
    }, prompt);

    return parseCompactPantryMealsText(rawText);
  } catch (error) {
    console.error("generatePantryMeals error:", error);
    throw error;
  }
}

// ─── Meal Plan Generator ───────────────────────────────────────────────────
export async function generateMealPlan(
  daysCount: number,
  options: {
    pantryEnabled: boolean;
    pantryList: string[];
    profile: any;
    pastMeals: string[];
  },
): Promise<any[]> {
  const profileRules = getProfileSystemPrompt(options.profile);

  const today = new Date();
  const datesList = [];
  const weekdayNames = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];
  for (let i = 0; i < daysCount; i++) {
    const d = new Date();
    d.setDate(today.getDate() + i);
    const dateStr = d.toISOString().split("T")[0];
    const dayName = weekdayNames[d.getDay()];
    datesList.push({ date: dateStr, dayName });
  }

  const prompt = `You are a master dietitian. Generate a meal plan for ${daysCount} days:
${datesList.map((item) => `- ${item.date} (${item.dayName})`).join("\n")}
${profileRules}

RULES:
1. Provide exhaustive ingredients and steps for every meal.
2. Total calories, protein, carbs, and fat MUST be the exact mathematical sum of individual ingredient values.
3. Do not hallucinate fake ingredients.

DO NOT USE JSON FORMAT. Respond in this exact compact plain text format:

${datesList
  .map(
    (item) => `===DAY===
DATE: ${item.date}
DAYNAME: ${item.dayName}

---MEAL: breakfast---
TITLE: [Breakfast Title]
PREP: [15 mins]
CALORIES: [350 kcal]
PROTEIN: [20g]
CARBS: [35g]
FAT: [10g]
---INGREDIENT---
NAME: [Ingredient]
AMOUNT: [Amount]
CALORIES: [Calories]
PROTEIN: [Protein]
CARBS: [Carbs]
FAT: [Fat]
DESC: [Desc]
SOURCE: [Source]
---INSTRUCTIONS---
1. [Step 1]

---MEAL: lunch---
TITLE: [Lunch Title]
PREP: [20 mins]
CALORIES: [450 kcal]
PROTEIN: [30g]
CARBS: [40g]
FAT: [15g]
---INGREDIENT---
NAME: [Ingredient]
AMOUNT: [Amount]
CALORIES: [Calories]
PROTEIN: [Protein]
CARBS: [Carbs]
FAT: [Fat]
DESC: [Desc]
SOURCE: [Source]
---INSTRUCTIONS---
1. [Step 1]

---MEAL: dinner---
TITLE: [Dinner Title]
PREP: [25 mins]
CALORIES: [550 kcal]
PROTEIN: [40g]
CARBS: [45g]
FAT: [18g]
---INGREDIENT---
NAME: [Ingredient]
AMOUNT: [Amount]
CALORIES: [Calories]
PROTEIN: [Protein]
CARBS: [Carbs]
FAT: [Fat]
DESC: [Desc]
SOURCE: [Source]
---INSTRUCTIONS---
1. [Step 1]`,
  )
  .join("\n\n")}`;

  try {
    const rawText = await callWithRetry(async (modelName) => {
      const model = genAI!.getGenerativeModel({ model: modelName });
      return model.generateContent(prompt);
    }, prompt);

    return parseCompactMealPlanText(rawText);
  } catch (error) {
    console.error("generateMealPlan error:", error);
    throw error;
  }
}

// ─── Single Meal Item Regenerator ──────────────────────────────────────────
export async function regenerateMealItem(
  date: string,
  dayName: string,
  mealType: "breakfast" | "lunch" | "dinner",
  options: { pantryList: string[]; profile: any; pastMeals: string[] },
): Promise<any> {
  const profileRules = getProfileSystemPrompt(options.profile);

  const prompt = `Suggest a replacement ${mealType} meal for ${dayName} (${date}).
${profileRules}

RULES:
1. Provide exhaustive ingredients and steps.
2. Total calories, protein, carbs, and fat MUST be the exact mathematical sum of individual ingredient values.
3. Do not hallucinate fake ingredients.

DO NOT USE JSON FORMAT. Respond in this exact compact plain text format:

TITLE: [Meal Title]
PREP: [15 mins]
CALORIES: [400 kcal]
PROTEIN: [25g]
CARBS: [35g]
FAT: [12g]

---INGREDIENT---
NAME: [Ingredient Name]
AMOUNT: [Amount]
CALORIES: [Calories]
PROTEIN: [Protein]
CARBS: [Carbs]
FAT: [Fat]
DESC: [Desc]
SOURCE: [Source]

---INSTRUCTIONS---
1. [Step 1]
2. [Step 2]`;

  try {
    const rawText = await callWithRetry(async (modelName) => {
      const model = genAI!.getGenerativeModel({ model: modelName });
      return model.generateContent(prompt);
    }, prompt);

    return parseCompactRecipeText(rawText);
  } catch (error) {
    console.error("regenerateMealItem error:", error);
    throw error;
  }
}
