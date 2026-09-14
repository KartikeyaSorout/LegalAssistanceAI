/**
 * @fileoverview LexAI — API Interaction Module
 * @description  Handles communication with Gemini API (either direct or via Cloud Function proxy)
 * @module       LexAI.API
 */
(function (LexAI) {
  "use strict";

  // In-memory cache for deterministic AI responses (rights / templates)
  const responseCache = new Map();

  function cacheKey(feature, ...parts) {
    return `${feature}::${parts.join("::")}`;
  }

  function getCached(key) {
    return responseCache.has(key) ? responseCache.get(key) : null;
  }

  function setCache(key, value) {
    if (responseCache.size >= LexAI.Config.MAX_CACHE_SIZE) {
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

  async function callGemini(systemPrompt, userMessage, chatHistory = [], useHistory = false) {
    setApiStatus("loading", "Thinking...");
    const contents = [];

    if (useHistory && chatHistory.length > 0) {
      contents.push(...chatHistory);
    }
    contents.push({ role: "user", parts: [{ text: userMessage }] });

    const body = {
      contents,
      systemInstruction: { parts: [{ text: systemPrompt }] },
      generationConfig: LexAI.Config.GENERATION_CONFIG,
      safetySettings: LexAI.Config.SAFETY_SETTINGS
    };

    let endpoint = "";
    const headers = { "Content-Type": "application/json" };
    
    if (LexAI.Config.USE_CLOUD_FUNCTION) {
      // Use proxy backend
      endpoint = "/api/gemini"; 
    } else {
      // Fallback for direct client-side
      endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${LexAI.Config.GEMINI_MODEL}:generateContent`;
      headers["X-goog-api-key"] = LexAI.Config.GEMINI_API_KEY;
    }

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: headers,
        body: JSON.stringify(body)
      });

      if (!response.ok) {
        const errText = await response.text();
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

  // Export module functions
  LexAI.API = {
    cacheKey,
    getCached,
    setCache,
    callGemini
  };

})(window.LexAI = window.LexAI || {});
