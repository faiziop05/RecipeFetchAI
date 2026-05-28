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

async function callWithRetry(
  buildRequest: (modelName: string) => Promise<any>,
  promptText: string,
): Promise<any> {
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
        return JSON.parse(result.response.text());
      } catch (err: any) {
        lastError = err;
        console.warn(
          `[Gemini] Error on model ${modelName}:`,
          err?.message || err,
          err,
        );

        // Detect critical authentication issues that cannot be resolved by cascading
        const isAuthError =
          err?.message?.includes("API_KEY_INVALID") ||
          err?.message?.includes("API key not valid") ||
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
        options: { response_format: { type: "json" } },
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
    return JSON.parse(data.response);
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
// ───────────────────────────────────────────────────────────────────────────

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
      const isTikTok =
        lowercaseInput.includes("tiktok.com");
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

          const descMatch = html.match(/"shortDescription"\s*:\s*"((?:[^"\\]|\\.)*)"/);
          if (descMatch && descMatch[1]) {
            decodedDesc = descMatch[1]
              .replace(/\\n/g, "\n")
              .replace(/\\"/g, '"')
              .replace(/\\'/g, "'")
              .replace(/\\\\/g, "\\")
              .replace(/\\u0026/g, "&");
          }

          // Fetch timedtext transcript if captions are available using ultra-robust multi-fallback direct regex matching
          try {
            let timedTextUrlRaw = "";
            const timedTextMatch1 = html.match(/"baseUrl"\s*:\s*"([^"]*?api(?:\\\/|\/|\\u002f)timedtext[^"]*?)"/i);
            const timedTextMatch2 = html.match(/"(https[^"]*?api(?:\\\/|\/|\\u002f)timedtext[^"]*?)"/i);
            const timedTextMatch3 = html.match(/\\"(https[^"]*?api(?:\\\/|\/|\\u002f)timedtext[^"]*?)\\"/i);
            const timedTextMatch4 = html.match(/(https:\\\/\\\/[^"]*?api\\\/timedtext[^"]*?)/i);

            if (timedTextMatch1) timedTextUrlRaw = timedTextMatch1[1];
            else if (timedTextMatch2) timedTextUrlRaw = timedTextMatch2[1];
            else if (timedTextMatch3) timedTextUrlRaw = timedTextMatch3[1];
            else if (timedTextMatch4) timedTextUrlRaw = timedTextMatch4[1];

            if (timedTextUrlRaw) {
              let timedTextUrl = timedTextUrlRaw
                .replace(/\\u0026/g, '&')
                .replace(/\\u003d/g, '=')
                .replace(/\\u002f/g, '/')
                .replace(/\\\//g, '/')
                .replace(/\\/g, ''); // strip any remaining escape slashes
              
              // Direct auto-translation logic to ensure subtitles fetch in English
              if (!timedTextUrl.includes('lang=en') && !timedTextUrl.includes('&tlang=en')) {
                timedTextUrl += '&tlang=en';
              }
              
              console.log(`[Scraper] Found YouTube timedtext URL: ${timedTextUrl}. Fetching spoken transcript...`);
              const subRes = await fetch(timedTextUrl, {
                headers: {
                  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36",
                  "Accept-Language": "en-US,en;q=0.9",
                  Cookie: "CONSENT=YES+cb.20210328-17-p0.en+FX+999",
                }
              });

              if (subRes.ok) {
                const xml = await subRes.text();
                cleanedTranscript = xml
                  .replace(/<text[^>]*>([\s\S]*?)<\/text>/gi, '$1 ')
                  .replace(/&amp;/g, '&')
                  .replace(/&lt;/g, '<')
                  .replace(/&gt;/g, '>')
                  .replace(/&#39;/g, "'")
                  .replace(/&quot;/g, '"')
                  .replace(/<[^>]+>/g, '')
                  .replace(/\s+/g, ' ')
                  .trim();
                  
                console.log(`[Scraper] Successfully parsed spoken transcript (${cleanedTranscript.length} chars).`);
              }
            } else {
              console.log("[Scraper] No timedtext baseUrl found in YouTube HTML.");
            }
          } catch (captionErr) {
            console.warn("[Scraper] Failed to fetch or parse YouTube captions:", captionErr);
          }

          // Combine everything into a powerful prompt payload
          scrapedText = `YouTube Video URL: ${urlOrText}\nVideo Title: ${videoTitle}`;
          if (decodedDesc) {
            scrapedText += `\n\n[Written Video Description]:\n${decodedDesc}`;
          }
          if (cleanedTranscript) {
            scrapedText += `\n\n[Spoken Video Transcript (Subtitles)]:\n${cleanedTranscript}`;
          }

          console.log(`[Scraper] Successfully processed YouTube URL. Title: "${videoTitle}".`);
        } else if (isTikTok) {
          let videoTitle = "";
          let videoDesc = "";

          const titleMatch = html.match(/<title>(.*?)<\/title>/i);
          if (titleMatch) {
            videoTitle = titleMatch[1].replace(" | TikTok", "");
          }

          const descMatch = 
            html.match(/<meta\s+property="og:description"\s+content="([^"]*)"/i) || 
            html.match(/<meta\s+name="description"\s+content="([^"]*)"/i) ||
            html.match(/"desc"\s*:\s*"((?:[^"\\]|\\.)*)"/);

          if (descMatch && descMatch[1]) {
            videoDesc = descMatch[1]
              .replace(/\\n/g, "\n")
              .replace(/\\"/g, '"')
              .replace(/\\'/g, "'")
              .replace(/\\\\/g, "\\");
          }

          scrapedText = `TikTok Video URL: ${urlOrText}`;
          if (videoTitle) {
            scrapedText += `\nVideo Title: ${videoTitle}`;
          }
          if (videoDesc) {
            scrapedText += `\n\n[Written Video Description / Tags]:\n${videoDesc}`;
          }

          console.log(`[Scraper] Successfully processed TikTok URL. Title: "${videoTitle}".`);
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
            html.match(/<meta\s+property="og:description"\s+content="([^"]*)"/i) || 
            html.match(/<meta\s+name="description"\s+content="([^"]*)"/i);

          if (descMatch && descMatch[1]) {
            postDesc = descMatch[1]
              .replace(/\\n/g, "\n")
              .replace(/\\"/g, '"')
              .replace(/\\'/g, "'")
              .replace(/\\\\/g, "\\");
          }

          scrapedText = `Instagram Post URL: ${urlOrText}`;
          if (postTitle) {
            scrapedText += `\nPost Title/Header: ${postTitle}`;
          }
          if (postDesc) {
            scrapedText += `\n\n[Post Caption / Recipe Context]:\n${postDesc}`;
          }

          console.log(`[Scraper] Successfully processed Instagram URL. Title: "${postTitle}".`);
        }

        // Extract JSON-LD recipe schema if available in standard recipe blog websites (Google Schema standards)
        if (!scrapedText) {
          try {
            const jsonLdMatches = html.match(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi);
            if (jsonLdMatches) {
              for (const scriptTag of jsonLdMatches) {
                const jsonText = scriptTag.replace(/<script[^>]*>|<\/script>/gi, '').trim();
                try {
                  const jsonObj = JSON.parse(jsonText);
                  
                  // Traverses schemas recursively to find "@type": "Recipe" inside nested Arrays or Graphs
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
                    console.log(`[Scraper] Found Google JSON-LD Recipe Schema: "${recipeSchema.name || 'Unnamed'}". Extracting structured content...`);
                    
                    let schemaText = `Structured JSON-LD Recipe Schema Data:\n`;
                    schemaText += `Recipe Name: ${recipeSchema.name || ''}\n`;
                    schemaText += `Prep Time: ${recipeSchema.prepTime || ''}\n`;
                    schemaText += `Cook Time: ${recipeSchema.cookTime || ''}\n`;
                    schemaText += `Total Time: ${recipeSchema.totalTime || ''}\n`;
                    schemaText += `Yield/Servings: ${recipeSchema.recipeYield || ''}\n`;
                    
                    if (recipeSchema.recipeCategory) {
                      schemaText += `Category: ${recipeSchema.recipeCategory}\n`;
                    }
                    
                    if (recipeSchema.recipeIngredient && Array.isArray(recipeSchema.recipeIngredient)) {
                      schemaText += `Ingredients List:\n- ` + recipeSchema.recipeIngredient.join('\n- ') + '\n';
                    }
                    
                    if (recipeSchema.recipeInstructions) {
                      schemaText += `Instructions List:\n`;
                      const parseInstructions = (inst: any): string[] => {
                        if (typeof inst === 'string') return [inst];
                        if (Array.isArray(inst)) {
                          return inst.map(i => {
                            if (typeof i === 'string') return i;
                            if (i.text) return i.text;
                            if (i.name) return i.name;
                            return JSON.stringify(i);
                          });
                        }
                        return [];
                      };
                      schemaText += parseInstructions(recipeSchema.recipeInstructions).join('\n') + '\n';
                    }
                    
                    if (recipeSchema.nutrition && typeof recipeSchema.nutrition === 'object') {
                      schemaText += `Nutrition Information: ${JSON.stringify(recipeSchema.nutrition)}\n`;
                    }

                    scrapedText = schemaText;
                    break;
                  }
                } catch (jsonErr) {
                  // Skip invalid scripts
                }
              }
            }
          } catch (ldErr) {
            console.warn("[Scraper] Google JSON-LD recipe schema extraction failed:", ldErr);
          }
        }

        if (!scrapedText) {
          // Standard HTML tag stripping for regular recipe blogs
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
          // Match all structured social profiles or schema formats
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

  const prompt = `You are a professional, high-end culinary assistant. Extract a recipe based on the provided input data.

CRITICAL EXTRACTION & RECONSTRUCTION RULE:
1. You MUST first search the provided input data (description details, subtitles transcript, webpage text) to extract ingredients, quantities/amounts, and preparation steps.
2. If the input data is a URL or text and does not contain a full written recipe (for example, the video description is empty or only has social media links), but you can identify a clear recipe/dish name from the video title, webpage title, or URL keywords, YOU MUST NOT return empty lists or an error. Instead, you MUST use your expert culinary knowledge as a master executive chef to reconstruct a professional, high-end, and mouth-watering recipe for that identified dish. This is a MANDATORY fallback behavior!
3. Only if there is absolutely no recipe text AND no identifiable recipe/dish title in the inputs, return a JSON object where the "title" is exactly "Error: Valid recipe details could not be extracted from this source" and leave the ingredients and instructions arrays completely empty.

CRITICAL NUTRITIONAL ESTIMATION & ACCURACY RULE:
- Recipe videos and texts almost never contain specific nutritional details for individual ingredients. You MUST use your extensive internal nutritional knowledge (based on standard USDA food databases and professional dietitian guides) to calculate precise, non-fabricated calories and macronutrients (protein, carbs, fat) based on the specific quantity/amount of each ingredient.
- DO NOT invent arbitrary numbers or provide false nutritional information. All estimations must be scientifically accurate and logically reasoned (e.g., estimating that 1 large egg contains 70 kcal, 6g protein, 5g fat, 0g carbs; or 1 medium banana contains 105 kcal, 27g carbs, 1.3g protein, 0.4g fat).
- The total recipe macros (Recipe.calories, Recipe.totalProtein, Recipe.totalCarbs, Recipe.totalFats) MUST be the exact mathematical sum of all the individual ingredients' nutritional values.

Input data: ${contextData}

You MUST return a JSON object that adheres EXACTLY to the following typescript schema interface:

interface Ingredient {
  name: string; // Keep this distinct, simple, and clean (e.g. "Hass Avocado")
  amount: string; // The quantity (e.g. "1/2 medium", "2 cups")
  description: string; // A highly educational, clear 1-2 sentence breakdown explaining exactly how these nutritional metrics were calculated based on the specified quantity/unit using standard USDA databases (e.g. "One medium banana (approx. 118g) contains ~105 kcal, 27g carbohydrates, 1.3g protein, and 0.4g fat based on standard USDA databases. It is an excellent source of potassium and dietary fiber.").
  nutrition: {
    calories: string; // Precise estimated calories for this specific ingredient amount, e.g. "120 kcal"
    protein: string; // Precise estimated protein for this specific ingredient amount, e.g. "2 g"
    carbs: string; // Precise estimated carbs for this specific ingredient amount, e.g. "8 g"
    fat: string; // Precise estimated fat for this specific ingredient amount, e.g. "10 g"
  };
  sourcingAdvantage: string; // A detailed paragraph (2-3 sentences) highlighting natural health advantages, sourcing tips, and organic benefits of this specific ingredient.
}

interface Recipe {
  title: string; // The appetizing name of the recipe found in the text
  prepTime: string; 
  calories: string; // Total calorie count for the entire recipe (must equal the exact sum of all ingredient calories, e.g. "450 kcal")
  totalProtein: string; // Total protein count for the entire recipe (must equal the exact sum of all ingredient protein, e.g. "35 g")
  totalCarbs: string; // Total carbs count for the entire recipe (must equal the exact sum of all ingredient carbs, e.g. "28 g")
  totalFats: string; // Total fats count for the entire recipe (must equal the exact sum of all ingredient fats, e.g. "15 g")
  ingredients: Ingredient[];
  instructions: string[]; // Chronological list of cooking steps
}

Ensure all JSON properties are populated accurately based on the source text if present.`;

  try {
    const result = await callWithRetry(async (modelName) => {
      const model = genAI!.getGenerativeModel({
        model: modelName,
        generationConfig: { responseMimeType: "application/json" },
      });
      if (imageBase64) {
        return model.generateContent([
          prompt,
          { inlineData: { data: imageBase64, mimeType: "image/jpeg" } },
        ]);
      }
      return model.generateContent(prompt);
    }, prompt);

    // Validate the AI output for extraction security template matching
    if (
      result?.title &&
      (result.title.toLowerCase().includes("error") ||
        result.title.toLowerCase().includes("could not be extracted"))
    ) {
      console.warn(
        `[Gemini] Security rule triggered: AI returned error signature: "${result.title}"`,
      );
      throw new Error(
        "We successfully reached the source, but could not extract any recipe ingredients or cooking steps.\n\n" +
          "💡 Pro-tip: Try copying and pasting the raw recipe text directly into the input field instead!",
      );
    }

    if (!result?.ingredients || result.ingredients.length === 0) {
      console.warn(
        "[Gemini] Security check: Scanned recipe has empty ingredients list.",
      );
      throw new Error(
        "We couldn't parse ingredients or instructions from this source.\n\n" +
          "💡 Pro-tip: Try copying and pasting the recipe text directly instead!",
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
      "Rewrite this recipe dataset to prioritize low-calorie, organic, and highly nutritious alternatives while preserving the identical JSON schema format.";
  } else if (mutationType === "tastier") {
    instructions =
      "Rewrite this recipe dataset to elevate taste and flavor profiles while preserving the identical JSON schema format.";
  } else {
    instructions = `Modify this recipe dataset according to the following guidelines: ${extraInstructions}. Preserve the identical JSON schema format.`;
  }

  const prompt = `You are a master executive chef and nutrition researcher. You are given this existing recipe JSON object:
${JSON.stringify(recipe, null, 2)}

Your task is to:
${instructions}

You MUST return a JSON object with the identical structure containing the updated recipe fields.`;

  try {
    return await callWithRetry(async (modelName) => {
      const model = genAI!.getGenerativeModel({
        model: modelName,
        generationConfig: { responseMimeType: "application/json" },
      });
      return model.generateContent(prompt);
    }, prompt);
  } catch (error) {
    console.warn("Recipe Mutation Failure:", error);
    throw error;
  }
}

/**
 * Recalculates nutritional values for a recipe based on its edited ingredients.
 */
export async function recalculateNutrition(recipe: any): Promise<any> {
  const prompt = `You are a professional dietitian and culinary scientist. You are given a recipe JSON object which has been manually edited by the user.
Some ingredient amounts or names may have changed, or new ingredients may have been added.

Recipe JSON:
${JSON.stringify(recipe, null, 2)}

Your task is to:
1. Re-analyze the ingredients list and estimate highly accurate, scientifically sound calories and macronutrients (protein, carbs, fat) for each ingredient based on its specified name and quantity/amount.
2. Update the "nutrition" field (calories, protein, carbs, fat) and "sourcingAdvantage" field for each ingredient in the array.
3. Calculate the new total calories, totalProtein, totalCarbs, and totalFats for the entire recipe, which MUST equal the exact mathematical sum of all the individual ingredients' nutritional values.
4. Keep the same title, ingredients name/amount, and instructions exactly as they are. Do not change the text of instructions or ingredients. Only calculate and update the nutrition numbers and description/sourcingAdvantage where necessary.

You MUST return a JSON object with the identical structure containing the updated recipe fields, satisfying the Recipe interface structure.`;

  try {
    return await callWithRetry(async (modelName) => {
      const model = genAI!.getGenerativeModel({
        model: modelName,
        generationConfig: { responseMimeType: "application/json" },
      });
      return model.generateContent(prompt);
    }, prompt);
  } catch (error) {
    console.warn("Recipe Nutrition Recalculation Failure:", error);
    throw error;
  }
}
