const https = require("https");

const DEFAULT_MODEL = "gemini-2.5-flash";
const DEFAULT_TIMEOUT_MS = 20000;

function parseGeminiText(payload) {
  const parts = payload?.candidates?.[0]?.content?.parts || [];
  return parts.map((part) => part.text).filter(Boolean).join("\n").trim();
}

function requestGemini(prompt, {
  model = process.env.AI_MODEL || DEFAULT_MODEL,
  temperature = 0.4,
  maxOutputTokens = 1024,
  timeoutMs = DEFAULT_TIMEOUT_MS,
} = {}) {
  return new Promise((resolve, reject) => {
    const apiKey = process.env.GOOGLE_API_KEY;
    if (!apiKey) {
      reject(Object.assign(new Error("GOOGLE_API_KEY is missing"), { code: "AI_API_KEY_MISSING" }));
      return;
    }

    const body = JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature,
        maxOutputTokens,
      },
    });

    const request = https.request({
      hostname: "generativelanguage.googleapis.com",
      path: `/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(body),
      },
      timeout: timeoutMs,
    }, (response) => {
      let responseBody = "";
      response.on("data", (chunk) => {
        responseBody += chunk;
      });
      response.on("end", () => {
        let payload = {};
        try {
          payload = responseBody ? JSON.parse(responseBody) : {};
        } catch {
          payload = { raw: responseBody };
        }

        if (response.statusCode < 200 || response.statusCode >= 300) {
          const error = new Error(payload?.error?.message || `Gemini request failed with status ${response.statusCode}`);
          error.code = payload?.error?.status || "AI_MODEL_ERROR";
          error.statusCode = response.statusCode;
          error.details = payload?.error;
          reject(error);
          return;
        }

        const text = parseGeminiText(payload);
        if (!text) {
          reject(Object.assign(new Error("Gemini returned an empty response"), { code: "AI_EMPTY_RESPONSE" }));
          return;
        }

        resolve(text);
      });
    });

    request.on("timeout", () => {
      request.destroy(Object.assign(new Error(`Gemini request timed out after ${timeoutMs}ms`), { code: "AI_TIMEOUT" }));
    });

    request.on("error", reject);
    request.write(body);
    request.end();
  });
}

module.exports = {
  requestGemini,
};
