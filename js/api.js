/**
 * @fileoverview LexAI — API Interaction Module
 * @description  Handles communication with Gemini API
 * @module       LexAI.API
 */

import Config from './config.js';

// In-memory cache for deterministic AI responses (rights / templates)
const responseCache = new Map();

export function cacheKey(feature, ...parts) {
  return `${feature}::${parts.join("::")}`;
}

export function getCached(key) {
  return responseCache.has(key) ? responseCache.get(key) : null;
}

export function setCache(key, value) {
  if (responseCache.size >= Config.MAX_CACHE_SIZE) {
    // Evict oldest entry to prevent unbounded memory growth
    const firstKey = responseCache.keys().next().value;
    responseCache.delete(firstKey);
  }
  responseCache.set(key, value);
}

function setApiStatus(status, text) {
  const apiStatus = document.getElementById("api-status");
  const apiStatusText = apiStatus?.querySelector(".status-text");
  if (!apiStatus || !apiStatusText) return;
  
  apiStatus.className = `api-status ${status}`;
  apiStatusText.textContent = text;
  if (status === "success" || status === "error") {
    setTimeout(() => {
      apiStatus.className = "api-status idle";
      apiStatusText.textContent = "Ready";
    }, 3000);
  }
}

export async function callGemini(systemPrompt, userMessage, chatHistory = [], useHistory = false) {
  const apiKey = localStorage.getItem('gemini_api_key');
  if (!apiKey) {
    throw new Error("API_KEY_MISSING");
  }

  setApiStatus("loading", "Thinking...");
  const contents = [];

  if (useHistory && chatHistory.length > 0) {
    contents.push(...chatHistory);
  }
  contents.push({ role: "user", parts: [{ text: userMessage }] });

  const body = {
    contents,
    systemInstruction: { parts: [{ text: systemPrompt }] },
    generationConfig: Config.GENERATION_CONFIG,
    safetySettings: Config.SAFETY_SETTINGS
  };

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${Config.GEMINI_MODEL}:generateContent`;
  const headers = { 
    "Content-Type": "application/json",
    "X-goog-api-key": apiKey
  };

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: headers,
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const errText = await response.text();
      if (response.status === 400 && errText.includes("API key not valid")) {
         throw new Error("API_KEY_INVALID");
      }
      throw new Error(`API Error ${response.status}: ${errText}`);
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!text) throw new Error("Empty response from AI model.");

    setApiStatus("success", "Response received");
    return text;
  } catch (err) {
    console.error("Gemini API Error:", err);
    setApiStatus("error", "API Error");
    throw err;
  }
}
