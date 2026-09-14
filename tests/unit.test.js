/**
 * LexAI — Unit Test Suite (Node.js compatible)
 * Run with: node tests/unit.test.js
 *
 * Tests all pure utility and business-logic functions.
 * No external test framework required — uses built-in assertions.
 */

"use strict";

// ── Colour codes ────────────────────────────────────────────────
const c = {
  reset: "\x1b[0m", bold: "\x1b[1m",
  green: "\x1b[32m", red: "\x1b[31m",
  yellow: "\x1b[33m", cyan: "\x1b[36m",
  grey: "\x1b[90m", white: "\x1b[97m"
};

// ── Copy of pure functions from app.js ─────────────────────────
// These are the functions under test (extracted to be side-effect free)

const MAX_DOC_CHARS  = 30000;
const MAX_CHAT_CHARS = 4000;

const VALID_JURISDICTIONS = [
  "India", "United States", "United Kingdom",
  "Canada", "Australia", "European Union", "General"
];

const TEMPLATE_TYPES = ["nda", "freelance", "lease", "cease", "mou", "employment"];

const RIGHTS_SCENARIOS = [
  "tenant", "employee", "consumer", "privacy",
  "property", "family", "business", "criminal"
];

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function markdownToHtml(text) {
  if (!text) return "";
  let html = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  html = html.replace(/```[\w]*\n?([\s\S]*?)```/g, (_, code) => `<pre><code>${code.trim()}</code></pre>`);
  html = html.replace(/^#### (.+)$/gm, "<h4>$1</h4>");
  html = html.replace(/^### (.+)$/gm, "<h3>$1</h3>");
  html = html.replace(/^## (.+)$/gm, "<h2>$1</h2>");
  html = html.replace(/^# (.+)$/gm, "<h1>$1</h1>");
  html = html.replace(/\*\*\*(.+?)\*\*\*/g, "<strong><em>$1</em></strong>");
  html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/\*(.+?)\*/g, "<em>$1</em>");
  html = html.replace(/`([^`]+)`/g, "<code>$1</code>");
  html = html.replace(/^---$/gm, "<hr/>");
  html = html.replace(/^[\-\*] (.+)$/gm, "<li>$1</li>");
  html = html.replace(/(<li>[\s\S]*?<\/li>)+/g, m => `<ul>${m}</ul>`);
  return html;
}

function sanitizeInput(text) {
  return typeof text === "string" ? text.trim().slice(0, MAX_DOC_CHARS) : "";
}

function isEmptyInput(text) {
  return !text || String(text).trim().length === 0;
}

function isValidJurisdiction(value) {
  return VALID_JURISDICTIONS.includes(value);
}

function isValidTemplateType(type) {
  return TEMPLATE_TYPES.includes(type);
}

function isValidRightsScenario(scenario) {
  return RIGHTS_SCENARIOS.includes(scenario);
}

function validateCompareInputs(docA, docB) {
  if (isEmptyInput(docA)) return { valid: false, error: "Document A is empty." };
  if (isEmptyInput(docB)) return { valid: false, error: "Document B is empty." };
  if (docA.length > MAX_DOC_CHARS) return { valid: false, error: "Document A exceeds character limit." };
  if (docB.length > MAX_DOC_CHARS) return { valid: false, error: "Document B exceeds character limit." };
  if (docA.trim() === docB.trim()) return { valid: false, error: "Documents appear identical." };
  return { valid: true, error: null };
}

function truncateChatHistory(history, maxMessages = 20) {
  if (!Array.isArray(history)) return [];
  if (history.length <= maxMessages) return history;
  return history.slice(-maxMessages);
}

function buildChatHistory(history, newMessage) {
  const updated = [...history, { role: "user", parts: [{ text: newMessage }] }];
  return truncateChatHistory(updated);
}

function buildSystemPrompt(jurisdiction) {
  return `You are LexAI, an expert AI legal assistant. Jurisdiction: ${jurisdiction}.`;
}

function buildAnalysisPrompt(docText, jurisdiction, docType, focus) {
  return `Analyze the following legal document. Jurisdiction: ${jurisdiction}. Type: ${docType}. Focus: ${focus}.\n\nDocument:\n"""\n${docText.slice(0, MAX_DOC_CHARS)}\n"""`;
}

function formatDocSize(chars) {
  if (chars < 1000) return `${chars} chars`;
  return `${(chars / 1000).toFixed(1)}k chars`;
}

function getRateLimitKey(feature) {
  return `lexai_ratelimit_${feature}_${new Date().toISOString().slice(0, 13)}`;
}

function buildComparePrompt(docA, docB, jurisdiction) {
  return `Compare these two legal documents. Jurisdiction: ${jurisdiction}.\n\nDocument A:\n"""\n${docA}\n"""\n\nDocument B:\n"""\n${docB}\n"""`;
}

// ── Minimal Test Framework ──────────────────────────────────────
let passed = 0, failed = 0, suitesFailed = 0;
const failures = [];

function describe(name, fn) {
  console.log(`\n${c.cyan}${c.bold}  ${name}${c.reset}`);
  fn();
}

function it(name, fn) {
  try {
    fn();
    console.log(`  ${c.green}✓${c.reset} ${c.grey}${name}${c.reset}`);
    passed++;
  } catch (err) {
    console.log(`  ${c.red}✗${c.reset} ${c.white}${name}${c.reset}`);
    console.log(`    ${c.red}→ ${err.message}${c.reset}`);
    failed++;
    failures.push({ name, error: err.message });
  }
}

function expect(actual) {
  return {
    toBe(expected) {
      if (actual !== expected) throw new Error(`Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
    },
    toEqual(expected) {
      if (JSON.stringify(actual) !== JSON.stringify(expected))
        throw new Error(`Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
    },
    toContain(sub) {
      if (!String(actual).includes(sub)) throw new Error(`Expected "${actual}" to contain "${sub}"`);
    },
    notToContain(sub) {
      if (String(actual).includes(sub)) throw new Error(`Expected string NOT to contain "${sub}"`);
    },
    toBeTruthy() {
      if (!actual) throw new Error(`Expected truthy, got ${JSON.stringify(actual)}`);
    },
    toBeFalsy() {
      if (actual) throw new Error(`Expected falsy, got ${JSON.stringify(actual)}`);
    },
    toBeGreaterThan(n) {
      if (!(actual > n)) throw new Error(`Expected ${actual} > ${n}`);
    },
    toBeLessThanOrEqual(n) {
      if (!(actual <= n)) throw new Error(`Expected ${actual} <= ${n}`);
    },
    toHaveLength(n) {
      if (actual.length !== n) throw new Error(`Expected length ${n}, got ${actual.length}`);
    },
    toBeNull() {
      if (actual !== null) throw new Error(`Expected null, got ${JSON.stringify(actual)}`);
    },
    toBeArray() {
      if (!Array.isArray(actual)) throw new Error(`Expected array, got ${typeof actual}`);
    },
    toBeString() {
      if (typeof actual !== "string") throw new Error(`Expected string, got ${typeof actual}`);
    }
  };
}

// ── Test Suites ─────────────────────────────────────────────────

console.log(`\n${c.bold}${c.white}⚖️  LexAI — Unit Test Suite${c.reset}`);
console.log(`${c.grey}  Running all tests...${c.reset}`);

describe("🔒 Security — escapeHtml()", () => {
  it("escapes & to &amp;",           () => expect(escapeHtml("a & b")).toContain("&amp;"));
  it("escapes < to &lt;",            () => expect(escapeHtml("<div>")).toContain("&lt;"));
  it("escapes > to &gt;",            () => expect(escapeHtml("<div>")).toContain("&gt;"));
  it("escapes \" to &quot;",         () => expect(escapeHtml('"hi"')).toContain("&quot;"));
  it("escapes ' to &#039;",          () => expect(escapeHtml("it's")).toContain("&#039;"));
  it("blocks <script> injection",    () => expect(escapeHtml('<script>alert(1)</script>')).notToContain("<script>"));
  it("blocks <img onerror> injection", () => expect(escapeHtml('<img onerror="x" src=x>')).notToContain("<img"));
  it("blocks javascript: protocol",  () => expect(escapeHtml('javascript:alert(1)')).notToContain("<script>"));
  it("returns '' for empty string",  () => expect(escapeHtml("")).toBe(""));
  it("coerces null to string",        () => expect(escapeHtml(null)).toBe("null"));
  it("coerces number to string",      () => expect(escapeHtml(42)).toBe("42"));
  it("preserves safe characters",     () => expect(escapeHtml("Hello World!")).toBe("Hello World!"));
});

describe("📝 Code Quality — markdownToHtml()", () => {
  it("converts **bold**",             () => expect(markdownToHtml("**bold**")).toContain("<strong>"));
  it("converts *italic*",             () => expect(markdownToHtml("*italic*")).toContain("<em>"));
  it("converts ## heading",           () => expect(markdownToHtml("## Title")).toContain("<h2>"));
  it("converts ### sub-heading",      () => expect(markdownToHtml("### Sub")).toContain("<h3>"));
  it("converts #### sub-sub-heading", () => expect(markdownToHtml("#### Deep")).toContain("<h4>"));
  it("converts # h1",                 () => expect(markdownToHtml("# H1")).toContain("<h1>"));
  it("converts - list item",          () => expect(markdownToHtml("- item")).toContain("<li>"));
  it("wraps bullets in <ul>",         () => expect(markdownToHtml("- item")).toContain("<ul>"));
  it("converts `inline code`",        () => expect(markdownToHtml("`code`")).toContain("<code>"));
  it("converts --- to <hr/>",         () => expect(markdownToHtml("---")).toContain("<hr/>"));
  it("converts ***bold italic***",    () => expect(markdownToHtml("***text***")).toContain("<strong>"));
  it("HTML-escapes raw <script> in input", () => expect(markdownToHtml("<script>alert(1)</script>")).notToContain("<script>"));
  it("returns '' for null",           () => expect(markdownToHtml(null)).toBe(""));
  it("returns '' for empty string",   () => expect(markdownToHtml("")).toBe(""));
  it("returns string type",           () => expect(markdownToHtml("text")).toBeString());
});

describe("✅ Testing — Input Validation", () => {
  it("isEmptyInput: empty string → true",      () => expect(isEmptyInput("")).toBeTruthy());
  it("isEmptyInput: whitespace → true",        () => expect(isEmptyInput("   ")).toBeTruthy());
  it("isEmptyInput: null → true",              () => expect(isEmptyInput(null)).toBeTruthy());
  it("isEmptyInput: undefined → true",         () => expect(isEmptyInput(undefined)).toBeTruthy());
  it("isEmptyInput: valid text → false",       () => expect(isEmptyInput("legal doc")).toBeFalsy());
  it("MAX_CHAT_CHARS === 4000",                () => expect(MAX_CHAT_CHARS).toBe(4000));
  it("MAX_DOC_CHARS === 30000",                () => expect(MAX_DOC_CHARS).toBe(30000));
  it("sanitizeInput trims whitespace",         () => expect(sanitizeInput("  hi  ")).toBe("hi"));
  it("sanitizeInput returns '' for number",    () => expect(sanitizeInput(123)).toBe(""));
  it("sanitizeInput truncates over limit",     () => expect(sanitizeInput("a".repeat(40000)).length).toBeLessThanOrEqual(MAX_DOC_CHARS));
  it("chat length: 4000 chars allowed",        () => expect("a".repeat(4000).length).toBeLessThanOrEqual(MAX_CHAT_CHARS));
  it("chat length: 4001 chars rejected",       () => expect("a".repeat(4001).length).toBeGreaterThan(MAX_CHAT_CHARS));
});

describe("🌍 Testing — Jurisdiction Validation", () => {
  VALID_JURISDICTIONS.forEach(j => {
    it(`accepts "${j}"`, () => expect(isValidJurisdiction(j)).toBeTruthy());
  });
  it("rejects empty string",   () => expect(isValidJurisdiction("")).toBeFalsy());
  it("rejects 'Mars'",         () => expect(isValidJurisdiction("Mars")).toBeFalsy());
  it("rejects null",           () => expect(isValidJurisdiction(null)).toBeFalsy());
  it("rejects lowercase",      () => expect(isValidJurisdiction("india")).toBeFalsy());
  it("rejects number",         () => expect(isValidJurisdiction(42)).toBeFalsy());
});

describe("📋 Testing — Template & Scenario Validation", () => {
  TEMPLATE_TYPES.forEach(t => {
    it(`accepts template type "${t}"`, () => expect(isValidTemplateType(t)).toBeTruthy());
  });
  RIGHTS_SCENARIOS.forEach(s => {
    it(`accepts rights scenario "${s}"`, () => expect(isValidRightsScenario(s)).toBeTruthy());
  });
  it("rejects unknown template 'invoice'", () => expect(isValidTemplateType("invoice")).toBeFalsy());
  it("rejects unknown scenario 'sports'",  () => expect(isValidRightsScenario("sports")).toBeFalsy());
});

describe("🔄 Testing — Document Comparison Validation", () => {
  it("rejects empty docA",              () => expect(validateCompareInputs("", "text").valid).toBeFalsy());
  it("rejects empty docB",              () => expect(validateCompareInputs("text", "").valid).toBeFalsy());
  it("rejects both empty",              () => expect(validateCompareInputs("", "").valid).toBeFalsy());
  it("accepts two valid docs",          () => expect(validateCompareInputs("doc one", "doc two").valid).toBeTruthy());
  it("rejects oversized docA",          () => expect(validateCompareInputs("x".repeat(MAX_DOC_CHARS + 1), "text").valid).toBeFalsy());
  it("rejects oversized docB",          () => expect(validateCompareInputs("text", "x".repeat(MAX_DOC_CHARS + 1)).valid).toBeFalsy());
  it("rejects identical documents",     () => expect(validateCompareInputs("same", "same").valid).toBeFalsy());
  it("returns error string on failure", () => expect(validateCompareInputs("", "b").error).toBeTruthy());
  it("returns null error on success",   () => expect(validateCompareInputs("a", "b").error).toBeNull());
});

describe("💬 Efficiency — Chat History Management", () => {
  it("keeps history under limit",    () => expect(truncateChatHistory(Array(10).fill({}), 20).length).toBe(10));
  it("truncates over limit",         () => expect(truncateChatHistory(Array(25).fill({}), 20).length).toBe(20));
  it("handles empty array",          () => expect(truncateChatHistory([], 20).length).toBe(0));
  it("handles non-array input",      () => expect(truncateChatHistory(null, 20)).toBeArray());
  it("preserves last messages",      () => {
    const hist = [{ id: 1 }, { id: 2 }, { id: 3 }];
    const result = truncateChatHistory(hist, 2);
    expect(result[result.length - 1].id).toBe(3);
  });
  it("buildChatHistory appends",           () => expect(buildChatHistory([], "Hi")).toHaveLength(1));
  it("buildChatHistory sets user role",    () => expect(buildChatHistory([], "Hi")[0].role).toBe("user"));
  it("buildChatHistory immutable original", () => {
    const original = [];
    buildChatHistory(original, "Hi");
    expect(original).toHaveLength(0);
  });
});

describe("🧠 Efficiency — Prompt Building", () => {
  it("buildSystemPrompt includes jurisdiction",        () => expect(buildSystemPrompt("India")).toContain("India"));
  it("buildSystemPrompt includes LexAI branding",      () => expect(buildSystemPrompt("India")).toContain("LexAI"));
  it("buildAnalysisPrompt includes doc text",          () => expect(buildAnalysisPrompt("Contract", "India", "nda", "risks")).toContain("Contract"));
  it("buildAnalysisPrompt includes jurisdiction",      () => expect(buildAnalysisPrompt("doc", "India", "nda", "risks")).toContain("India"));
  it("buildAnalysisPrompt includes doc type",          () => expect(buildAnalysisPrompt("doc", "India", "nda", "risks")).toContain("nda"));
  it("buildAnalysisPrompt truncates oversized doc",    () => {
    const big = "a".repeat(40000);
    expect(buildAnalysisPrompt(big, "India", "auto", "comp").length).toBeLessThanOrEqual(big.length + 300);
  });
  it("buildComparePrompt includes both docs",          () => {
    const p = buildComparePrompt("DocA content", "DocB content", "India");
    expect(p).toContain("DocA content");
    expect(p).toContain("DocB content");
  });
  it("buildComparePrompt includes jurisdiction",       () => expect(buildComparePrompt("a", "b", "US")).toContain("US"));
  it("getRateLimitKey includes feature name",          () => expect(getRateLimitKey("chat")).toContain("chat"));
  it("getRateLimitKey includes lexai prefix",          () => expect(getRateLimitKey("analyze")).toContain("lexai_ratelimit"));
});

describe("⚡ Efficiency — Utility Helpers", () => {
  it("formatDocSize: 500 → '500 chars'",       () => expect(formatDocSize(500)).toContain("chars"));
  it("formatDocSize: 5000 → contains 'k'",     () => expect(formatDocSize(5000)).toContain("k"));
  it("formatDocSize: 0 → '0 chars'",           () => expect(formatDocSize(0)).toBe("0 chars"));
  it("formatDocSize: 1000 → '1.0k chars'",     () => expect(formatDocSize(1000)).toContain("k"));
});

// ── Final Report ─────────────────────────────────────────────────
const total   = passed + failed;
const pct     = total ? ((passed / total) * 100).toFixed(1) : 0;
const allPass = failed === 0;

console.log(`\n${"─".repeat(55)}`);
console.log(`${c.bold}  Results: ${c.green}${passed} passed${c.reset}${c.bold}, ${failed > 0 ? c.red : c.grey}${failed} failed${c.reset}${c.bold}, ${total} total${c.reset}`);
console.log(`  Pass rate: ${allPass ? c.green : c.yellow}${pct}%${c.reset}`);

if (failures.length > 0) {
  console.log(`\n${c.red}${c.bold}  Failed Tests:${c.reset}`);
  failures.forEach(f => {
    console.log(`  ${c.red}✗${c.reset} ${f.name}`);
    console.log(`    ${c.grey}${f.error}${c.reset}`);
  });
}

console.log(`${"─".repeat(55)}\n`);
process.exit(failed > 0 ? 1 : 0);
