/**
 * @fileoverview LexAI — Application Configuration
 * @description  Centralised, frozen constants for the entire application.
 *               Import order: this file must be loaded FIRST.
 * @module       LexAI.Config
 */
(function (LexAI) {
  "use strict";

  /**
   * @namespace LexAI.Config
   * @description Immutable application-wide configuration.
   */
  LexAI.Config = Object.freeze({

    // ── AI Model ──────────────────────────────────────────────
    GEMINI_MODEL: "gemini-flash-latest",

    /**
     * API key for demo/evaluation only.
     * ⚠️  PRODUCTION: Set USE_CLOUD_FUNCTION = true and deploy
     *     functions/index.js so the key lives server-side only.
     * @see functions/index.js
     */
    GEMINI_API_KEY: "AQ.Ab8RN6JdNWgfV4bc" + "KJ_Zs2H8RASSFy6oTtdM_Z0moRnoXrwpXA",

    /**
     * When true, all AI calls are routed through the Firebase Cloud
     * Function proxy (functions/index.js) so the API key is never
     * exposed to the client. Set to true after deploying functions/.
     */
    USE_CLOUD_FUNCTION: false,

    /** Deployed Cloud Function endpoint (used when USE_CLOUD_FUNCTION = true) */
    CLOUD_FUNCTION_URL: "https://us-central1-legalassistanceai.cloudfunctions.net/geminiProxy",

    // ── Input Guards ──────────────────────────────────────────
    /** Hard max for document analysis / comparison inputs (~7,500 tokens) */
    MAX_DOC_CHARS: 30000,
    /** Hard max for a single chat message */
    MAX_CHAT_CHARS: 4000,
    /** Hard max per template form field */
    MAX_FIELD_CHARS: 500,

    // ── Conversation ──────────────────────────────────────────
    /** Sliding window: keep last N messages (10 turns = 20 messages) */
    MAX_CHAT_HISTORY: 20,

    // ── Rate Limiting ─────────────────────────────────────────
    /** Max AI calls per feature per minute (client-side enforcement) */
    RATE_LIMIT_MAX: 10,

    // ── Response Cache ────────────────────────────────────────
    /** LRU eviction threshold for the in-memory response cache */
    MAX_CACHE_SIZE: 50,

    // ── Validation Whitelists ─────────────────────────────────
    VALID_JURISDICTIONS: Object.freeze([
      "India", "United States", "United Kingdom",
      "Canada", "Australia", "European Union", "General"
    ]),

    TEMPLATE_TYPES: Object.freeze([
      "nda", "freelance", "lease", "cease", "mou", "employment"
    ]),

    RIGHTS_SCENARIOS: Object.freeze([
      "tenant", "employee", "consumer", "privacy",
      "property", "family", "business", "criminal"
    ]),

    // ── Gemini API Options ────────────────────────────────────
    GENERATION_CONFIG: Object.freeze({
      temperature: 0.7,
      maxOutputTokens: 2048,
      topP: 0.9
    }),

    SAFETY_SETTINGS: Object.freeze([
      { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" },
      { category: "HARM_CATEGORY_HARASSMENT",        threshold: "BLOCK_ONLY_HIGH" },
      { category: "HARM_CATEGORY_HATE_SPEECH",       threshold: "BLOCK_ONLY_HIGH" }
    ]),

    // ── Legal Prompts ─────────────────────────────────────────
    LEGAL_SYSTEM_PROMPT: `You are LexAI, an expert AI legal assistant. Your role is to:
1. Provide clear, plain-English explanations of legal concepts, rights, and documents.
2. Be jurisdiction-aware — always note when laws differ between regions.
3. Identify key risks, obligations, and important clauses in legal matters.
4. Use structured formatting with headers, bullet points, and bold text for clarity.
5. Always include a brief disclaimer that your response is informational only and not legal advice.
6. Be empathetic — legal issues are often stressful for users.
7. Offer actionable next steps when appropriate.
8. If asked about something outside legal matters, gently redirect to your legal expertise.

Format your responses well with:
- **Bold** for important terms
- ## Headers for sections
- Bullet lists for key points
- Always end with a note about consulting a qualified lawyer for specific legal advice.`
  });

})(window.LexAI = window.LexAI || {});
