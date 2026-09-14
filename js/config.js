/**
 * @fileoverview LexAI — Application Configuration
 * @description  Centralised, frozen constants for the entire application.
 * @module       LexAI.Config
 */

const Config = Object.freeze({
  // ── AI Model ──────────────────────────────────────────────
  GEMINI_MODEL: "gemini-flash-latest",

  // ── Input Guards ──────────────────────────────────────────
  MAX_DOC_CHARS: 30000,
  MAX_CHAT_CHARS: 4000,
  MAX_FIELD_CHARS: 500,

  // ── Conversation ──────────────────────────────────────────
  MAX_CHAT_HISTORY: 20,

  // ── Rate Limiting ─────────────────────────────────────────
  RATE_LIMIT_MAX: 10,

  // ── Response Cache ────────────────────────────────────────
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

export default Config;
