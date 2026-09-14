// ============================================================
// app.js — LexAI Core Application Logic
// Gemini API powered Legal Assistance Platform
// ============================================================

"use strict";

// ── Configuration ─────────────────────────────────────────────
const GEMINI_API_KEY = "AIzaSyDw43ikjdi-5KmcDLKWXYcoPcWXW_CfUTQ";
const GEMINI_MODEL   = "gemini-2.0-flash";
const GEMINI_URL     = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

// ── DOM References ────────────────────────────────────────────
const $ = id => document.getElementById(id);
const loadingScreen     = $("loading-screen");
const sidebar           = $("sidebar");
const sidebarToggle     = $("sidebar-toggle");
const mobileMenBtn      = $("mobile-menu-btn");
const sidebarOverlay    = $("sidebar-overlay");
const mainContent       = $("main-content");
const sectionTitle      = $("section-title");
const chatMessages      = $("chat-messages");
const chatInput         = $("chat-input");
const sendBtn           = $("send-btn");
const clearBtn          = $("clear-btn");
const jurisdictionSel   = $("jurisdiction-select");
const apiStatus         = $("api-status");
const apiStatusText     = apiStatus.querySelector(".status-text");
const toast             = $("toast");

// Analyze
const docInput          = $("doc-input");
const docType           = $("doc-type");
const analyzeFocus      = $("analyze-focus");
const analyzeBtn        = $("analyze-btn");
const analyzePlaceholder= $("analyze-placeholder");
const analyzeOutput     = $("analyze-output");
const loadSampleDoc     = $("load-sample-doc");
const clearDoc          = $("clear-doc");

// Compare
const docA              = $("doc-a");
const docB              = $("doc-b");
const compareBtn        = $("compare-btn");
const comparePlaceholder= $("compare-placeholder");
const compareOutput     = $("compare-output");

// Rights
const rightsOutput      = $("rights-output");

// Templates
const templateFormContainer = $("template-form-container");
const templateFormTitle     = $("template-form-title");
const templateFormFields    = $("template-form-fields");
const generateTemplateBtn   = $("generate-template-btn");
const templateOutput        = $("template-output");
const backToTemplates       = $("back-to-templates");

// ── State ─────────────────────────────────────────────────────
let chatHistory = [];           // [{role, parts}] for multi-turn
let isLoading   = false;
let currentSection = "chat";
let activeRightsCard = null;
let activeTemplateType = null;

// ── Initialization ────────────────────────────────────────────

/** Wait for Firebase ESM module to populate window.LexFirebase */
function waitForFirebase(timeout = 5000) {
  return new Promise(resolve => {
    if (window.LexFirebase?.saveChatToFirestore) return resolve();
    const start = Date.now();
    const check = setInterval(() => {
      if (window.LexFirebase?.saveChatToFirestore || Date.now() - start > timeout) {
        clearInterval(check);
        resolve();
      }
    }, 50);
  });
}

window.addEventListener("DOMContentLoaded", async () => {
  await waitForFirebase();
  init();
});

async function init() {
  // Hide loader after brief delay
  setTimeout(() => loadingScreen.classList.add("hidden"), 1800);
  setupNavigation();
  setupChat();
  setupAnalyzer();
  setupCompare();
  setupRights();
  setupTemplates();
  setupSidebar();
  autoResizeTextarea(chatInput);
}

// ── Navigation ────────────────────────────────────────────────
const sectionTitles = {
  chat:      "Legal Chat Assistant",
  analyze:   "Document Analyzer",
  compare:   "Document Comparator",
  rights:    "Know Your Rights",
  templates: "Legal Templates"
};

function setupNavigation() {
  document.querySelectorAll(".nav-item").forEach(item => {
    item.addEventListener("click", () => {
      const sec = item.dataset.section;
      switchSection(sec);
      // Close mobile sidebar
      if (window.innerWidth < 768) closeMobileSidebar();
    });
  });

  clearBtn.addEventListener("click", () => {
    if (currentSection === "chat") clearChat();
    else if (currentSection === "analyze") { docInput.value = ""; showAnalyzePlaceholder(); }
    else if (currentSection === "compare") { docA.value = ""; docB.value = ""; showComparePlaceholder(); }
  });
}

function switchSection(sec) {
  currentSection = sec;
  document.querySelectorAll(".section").forEach(s => s.classList.remove("active"));
  document.querySelectorAll(".nav-item").forEach(n => n.classList.remove("active"));
  $(`section-${sec}`).classList.add("active");
  $(`nav-${sec}`).classList.add("active");
  sectionTitle.textContent = sectionTitles[sec] || sec;
}

// ── Sidebar ───────────────────────────────────────────────────
function setupSidebar() {
  sidebarToggle?.addEventListener("click", () => {
    if (window.innerWidth < 768) closeMobileSidebar();
    else toggleDesktopSidebar();
  });
  mobileMenBtn?.addEventListener("click", openMobileSidebar);
  sidebarOverlay?.addEventListener("click", closeMobileSidebar);
}

function toggleDesktopSidebar() {
  const isCollapsed = sidebar.classList.toggle("collapsed");
  mainContent.classList.toggle("expanded");
  sidebarToggle.setAttribute("aria-expanded", String(!isCollapsed));
}
function openMobileSidebar() {
  sidebar.classList.add("mobile-open");
  sidebarOverlay.classList.add("active");
  document.body.style.overflow = "hidden";
}
function closeMobileSidebar() {
  sidebar.classList.remove("mobile-open");
  sidebarOverlay.classList.remove("active");
  document.body.style.overflow = "";
}

// ── Gemini API ────────────────────────────────────────────────
async function callGemini(systemPrompt, userMessage, useHistory = false) {
  setApiStatus("loading", "Thinking...");
  const contents = [];

  if (useHistory && chatHistory.length > 0) {
    contents.push(...chatHistory);
  }
  contents.push({ role: "user", parts: [{ text: userMessage }] });

  const body = {
    contents,
    systemInstruction: { parts: [{ text: systemPrompt }] },
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 2048,
      topP: 0.9
    },
    safetySettings: [
      { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" },
      { category: "HARM_CATEGORY_HARASSMENT",        threshold: "BLOCK_ONLY_HIGH" },
      { category: "HARM_CATEGORY_HATE_SPEECH",       threshold: "BLOCK_ONLY_HIGH" }
    ]
  };

  try {
    const response = await fetch(GEMINI_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error?.message || `HTTP ${response.status}`);
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new Error("Empty response from AI.");

    setApiStatus("ready", "Ready");
    return text;
  } catch (err) {
    setApiStatus("error", "Error");
    throw err;
  }
}

function setApiStatus(state, text) {
  apiStatus.className = "api-status " + state;
  apiStatusText.textContent = text;
}

// ── Chat ──────────────────────────────────────────────────────
const LEGAL_SYSTEM_PROMPT = `You are LexAI, an expert AI legal assistant. Your role is to:
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
- Always end with a note about consulting a qualified lawyer for specific legal advice.`;

function setupChat() {
  sendBtn.addEventListener("click", sendMessage);
  chatInput.addEventListener("keydown", e => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });
  chatInput.addEventListener("input", () => autoResizeTextarea(chatInput));

  // Quick prompts
  document.querySelectorAll(".quick-prompt-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const prompt = btn.dataset.prompt;
      chatInput.value = prompt;
      autoResizeTextarea(chatInput);
      sendMessage();
    });
  });
}

async function sendMessage() {
  const text = chatInput.value.trim();
  if (!text || isLoading) return;
  if (text.length > 4000) {
    showToast("Message too long (max 4,000 characters). Please shorten your question.", "error");
    return;
  }

  const jurisdiction = jurisdictionSel.value;
  const fullPrompt = `[Jurisdiction: ${jurisdiction}]\n\n${text}`;

  // Clear welcome screen if present
  const welcome = chatMessages.querySelector(".chat-welcome");
  if (welcome) welcome.remove();

  appendMessage("user", text);
  chatInput.value = "";
  autoResizeTextarea(chatInput);
  isLoading = true;
  sendBtn.disabled = true;

  const typingEl = appendTypingIndicator();

  try {
    const systemPrompt = LEGAL_SYSTEM_PROMPT + `\n\nThe user's jurisdiction is: ${jurisdiction}. Tailor your legal information accordingly.`;
    const aiText = await callGemini(systemPrompt, fullPrompt, true);

    // Update history for multi-turn
    chatHistory.push({ role: "user",  parts: [{ text: fullPrompt }] });
    chatHistory.push({ role: "model", parts: [{ text: aiText }] });
    if (chatHistory.length > 20) chatHistory = chatHistory.slice(-20); // keep last 10 turns (20 messages = 10 user + 10 model)

    typingEl.remove();
    appendMessage("assistant", aiText);

    // Save to Firestore (non-blocking)
    window.LexFirebase?.saveChatToFirestore(text, aiText, jurisdiction);

  } catch (err) {
    typingEl.remove();
    appendMessage("assistant", `⚠️ **Error:** ${err.message}\n\nPlease check your connection and try again.`);
    showToast("AI request failed: " + err.message, "error");
  } finally {
    isLoading = false;
    sendBtn.disabled = false;
  }
}

function appendMessage(role, text) {
  const div = document.createElement("div");
  div.className = `message ${role}`;

  const avatar = document.createElement("div");
  avatar.className = "message-avatar";
  avatar.textContent = role === "user" ? "👤" : "⚖️";

  const content = document.createElement("div");
  content.className = "message-content";
  content.innerHTML = markdownToHtml(text);

  if (role === "assistant") {
    const disclaimer = document.createElement("div");
    disclaimer.className = "message-disclaimer";
    disclaimer.innerHTML = `⚠️ Informational only — not legal advice. Consult a qualified lawyer for your specific situation.`;
    content.appendChild(disclaimer);
  }

  div.appendChild(avatar);
  div.appendChild(content);
  chatMessages.appendChild(div);
  chatMessages.scrollTop = chatMessages.scrollHeight;
  return div;
}

function appendTypingIndicator() {
  const div = document.createElement("div");
  div.className = "typing-indicator";
  div.setAttribute("aria-label", "AI is thinking");
  div.setAttribute("role", "status");
  div.innerHTML = `
    <div class="message-avatar" style="background:rgba(99,102,241,0.15);border:1px solid rgba(255,255,255,0.08);width:36px;height:36px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:16px;" aria-hidden="true">⚖️</div>
    <div class="typing-dots" aria-hidden="true">
      <div class="typing-dot"></div>
      <div class="typing-dot"></div>
      <div class="typing-dot"></div>
    </div>`;
  chatMessages.appendChild(div);
  chatMessages.scrollTop = chatMessages.scrollHeight;
  return div;
}

function clearChat() {
  chatHistory = [];
  chatMessages.innerHTML = `
    <div class="chat-welcome">
      <div class="welcome-icon">⚖️</div>
      <h2 class="welcome-title">Welcome to LexAI</h2>
      <p class="welcome-subtitle">Your AI-powered legal assistant. Ask me anything about legal matters, and I'll provide clear, accessible explanations.</p>
      <div class="quick-prompts">
        <button class="quick-prompt-btn" data-prompt="What are my rights as a tenant if my landlord refuses to return my security deposit?">🏠 Tenant rights & security deposit</button>
        <button class="quick-prompt-btn" data-prompt="Explain what an NDA (Non-Disclosure Agreement) is and what I should look out for before signing one.">📝 NDA explained simply</button>
        <button class="quick-prompt-btn" data-prompt="What are my rights if I am wrongfully terminated from my job?">💼 Wrongful termination rights</button>
        <button class="quick-prompt-btn" data-prompt="What is the difference between a civil case and a criminal case?">⚖️ Civil vs Criminal law</button>
        <button class="quick-prompt-btn" data-prompt="Explain copyright law and how it protects my creative work.">©️ Copyright protection basics</button>
        <button class="quick-prompt-btn" data-prompt="What steps should I take if I receive a legal notice or summons?">📨 Received a legal notice?</button>
      </div>
    </div>`;

  // Re-attach quick prompt listeners
  chatMessages.querySelectorAll(".quick-prompt-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      chatInput.value = btn.dataset.prompt;
      autoResizeTextarea(chatInput);
      sendMessage();
    });
  });
  showToast("Chat cleared", "success");
}

// ── Document Analyzer ─────────────────────────────────────────
const SAMPLE_DOC = `NON-DISCLOSURE AGREEMENT

This Non-Disclosure Agreement ("Agreement") is entered into as of January 1, 2025, between XYZ Corp ("Disclosing Party") and ABC Ltd ("Receiving Party").

1. CONFIDENTIAL INFORMATION: The Receiving Party agrees to hold in strict confidence and not disclose to any third party any Confidential Information received from the Disclosing Party. "Confidential Information" means any non-public information that relates to the actual or anticipated business or research and development of the Disclosing Party.

2. NON-COMPETE: The Receiving Party agrees not to engage in any business activity that competes with Disclosing Party's business for a period of 3 years within a 100-mile radius.

3. TERM: This Agreement shall remain in force for 5 years from the date of signing.

4. PENALTIES: Breach of this Agreement shall result in liquidated damages of $500,000 USD, plus attorney's fees and court costs.

5. GOVERNING LAW: This Agreement is governed by the laws of Delaware, United States.

6. SURVIVAL: Obligations under this Agreement shall survive termination for 10 years.`;

function setupAnalyzer() {
  loadSampleDoc.addEventListener("click", () => { docInput.value = SAMPLE_DOC; });
  clearDoc.addEventListener("click", () => { docInput.value = ""; showAnalyzePlaceholder(); });
  analyzeBtn.addEventListener("click", analyzeDocument);
}

function showAnalyzePlaceholder() {
  analyzePlaceholder.classList.remove("hidden");
  analyzeOutput.classList.add("hidden");
}

// Max ~30,000 chars ≈ ~7,500 tokens — safe for Gemini 2.0 Flash 1M context
const MAX_DOC_CHARS = 30000;

async function analyzeDocument() {
  const text = docInput.value.trim();
  if (!text) { showToast("Please paste a document to analyze.", "error"); return; }
  if (text.length > MAX_DOC_CHARS) { showToast(`Document too large (max ${MAX_DOC_CHARS.toLocaleString()} characters). Please paste a shorter excerpt.`, "error"); return; }
  if (isLoading) return;

  isLoading = true;
  analyzeBtn.disabled = true;
  analyzeBtn.innerHTML = `<div class="loading-spinner" style="width:16px;height:16px;border-width:2px;"></div> Analyzing...`;
  analyzePlaceholder.classList.add("hidden");
  analyzeOutput.classList.remove("hidden");
  analyzeOutput.innerHTML = `<div class="loading-state"><div class="loading-spinner"></div><p>AI is reviewing your document...</p></div>`;

  const jurisdiction = jurisdictionSel.value;
  const focus = analyzeFocus.value;
  const type  = docType.value;

  const prompt = `Analyze the following legal document. Jurisdiction: ${jurisdiction}. Document type: ${type}. Analysis focus: ${focus}.

Document:
"""
${text}
"""

Provide a structured analysis with these sections:
1. **Document Summary** - What is this document about? (2-3 sentences)
2. **Risk Assessment** - Overall risk level (High/Medium/Low) with explanation
3. **Key Clauses** - List the most important clauses found
4. **Potential Red Flags** - Concerning or unusual provisions the user should question
5. **Obligations** - What does each party need to do?
6. **Important Dates & Deadlines** - Any time-sensitive elements
7. **Recommended Actions** - What should the user do before signing?

Format each section clearly. Use bold for emphasis. Be specific and reference actual text from the document.`;

  try {
    const aiText = await callGemini(
      `You are LexAI, an expert legal document analyst. Analyze documents thoroughly, identify risks, and explain everything in plain English. Jurisdiction: ${jurisdiction}.`,
      prompt
    );
    renderAnalysisOutput(aiText, text);
  } catch (err) {
    const safeMsg = escapeHtml(err.message || "Unknown error");
    analyzeOutput.innerHTML = `<div class="output-placeholder"><div class="placeholder-icon">⚠️</div><p>Analysis failed: ${safeMsg}</p></div>`;
    showToast("Analysis failed: " + err.message, "error");
  } finally {
    isLoading = false;
    analyzeBtn.disabled = false;
    analyzeBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg> Analyze Document`;
  }
}

function renderAnalysisOutput(aiMarkdown) {
  const text = aiMarkdown;
  analyzeOutput.innerHTML = `
    <div class="analysis-content" style="font-size:14px;line-height:1.8;color:var(--color-text-primary);">
      ${markdownToHtml(text)}
    </div>
    <div style="margin-top:20px;padding-top:16px;border-top:1px solid var(--color-border);font-size:11px;color:var(--color-text-muted);">
      ⚠️ This analysis is for informational purposes only and does not constitute legal advice. Always consult a qualified legal professional before making decisions based on this analysis.
    </div>`;
}

// ── Document Comparator ───────────────────────────────────────
const SAMPLE_A = `EMPLOYMENT AGREEMENT - Version 1
Salary: $80,000 per year.
Working Hours: 40 hours per week, Monday to Friday.
Notice Period: 2 weeks written notice required by either party.
Non-Compete: 6 months after termination within 50-mile radius.
Benefits: Health insurance, 10 days paid vacation.`;

const SAMPLE_B = `EMPLOYMENT AGREEMENT - Version 2
Salary: $75,000 per year.
Working Hours: 45 hours per week, including weekends if required.
Notice Period: 4 weeks written notice required by employee only. Employer may terminate immediately.
Non-Compete: 2 years after termination, worldwide.
Benefits: Health insurance, 5 days paid vacation. No remote work.`;

function setupCompare() {
  $("load-sample-a").addEventListener("click", () => { docA.value = SAMPLE_A; });
  $("load-sample-b").addEventListener("click", () => { docB.value = SAMPLE_B; });
  compareBtn.addEventListener("click", compareDocuments);
}

function showComparePlaceholder() {
  comparePlaceholder.classList.remove("hidden");
  compareOutput.classList.add("hidden");
}

async function compareDocuments() {
  const a = docA.value.trim();
  const b = docB.value.trim();
  if (!a || !b) { showToast("Please provide both documents to compare.", "error"); return; }
  if (a.length > MAX_DOC_CHARS || b.length > MAX_DOC_CHARS) { showToast(`Each document must be under ${MAX_DOC_CHARS.toLocaleString()} characters.`, "error"); return; }
  if (isLoading) return;

  isLoading = true;
  compareBtn.disabled = true;
  compareBtn.innerHTML = `<div class="loading-spinner" style="width:16px;height:16px;border-width:2px;"></div> Comparing...`;
  comparePlaceholder.classList.add("hidden");
  compareOutput.classList.remove("hidden");
  compareOutput.innerHTML = `<div class="loading-state"><div class="loading-spinner"></div><p>AI is comparing both documents...</p></div>`;

  const jurisdiction = jurisdictionSel.value;

  const prompt = `Compare these two legal documents and identify ALL differences, additions, deletions, and modifications:

Document A (Original):
"""
${a}
"""

Document B (Revised):
"""
${b}
"""

Provide:
1. **Executive Summary** of the comparison
2. **Changes Favorable to Party A** - what's better in B for party A
3. **Changes Unfavorable to Party A** - what's worse in B (RED FLAGS)
4. **Neutral/Structural Changes** - formatting or minor edits
5. **Overall Risk Assessment** - Is Document B significantly riskier? Why?
6. **Recommendation** - Should the user accept Document B? What should be negotiated?

Be specific. Quote exact changed text where relevant.`;

  try {
    const aiText = await callGemini(
      `You are LexAI, an expert legal document comparator. Analyze both documents carefully for differences that matter legally. Jurisdiction: ${jurisdiction}.`,
      prompt
    );
    compareOutput.innerHTML = `<div style="font-size:14px;line-height:1.8;">${markdownToHtml(aiText)}</div>
      <div style="margin-top:20px;padding-top:16px;border-top:1px solid var(--color-border);font-size:11px;color:var(--color-text-muted);">
        ⚠️ Informational only. Not legal advice. Consult a qualified lawyer before accepting any legal document.
      </div>`;
  } catch (err) {
    const safeMsg = escapeHtml(err.message || "Unknown error");
    compareOutput.innerHTML = `<div class="output-placeholder"><div class="placeholder-icon">⚠️</div><p>Comparison failed: ${safeMsg}</p></div>`;
    showToast("Comparison failed: " + err.message, "error");
  } finally {
    isLoading = false;
    compareBtn.disabled = false;
    compareBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="3" width="9" height="18" rx="1"/><rect x="13" y="3" width="9" height="18" rx="1"/></svg> Compare Documents`;
  }
}

// ── Know Your Rights ──────────────────────────────────────────
const rightsData = {
  tenant:   { title: "🏠 Tenant Rights",         icon: "🏠" },
  employee: { title: "💼 Employee Rights",        icon: "💼" },
  consumer: { title: "🛒 Consumer Rights",        icon: "🛒" },
  privacy:  { title: "🔒 Privacy Rights",         icon: "🔒" },
  property: { title: "🏗️ Property Rights",       icon: "🏗️" },
  family:   { title: "👨‍👩‍👧 Family Law",          icon: "👨‍👩‍👧" },
  business: { title: "🏢 Business Rights",        icon: "🏢" },
  criminal: { title: "🚔 Criminal Law Rights",    icon: "🚔" }
};

function setupRights() {
  document.querySelectorAll(".rights-card").forEach(card => {
    card.addEventListener("click", () => loadRights(card.dataset.scenario, card));
  });
}

async function loadRights(scenario, cardEl) {
  if (isLoading) return;
  const info = rightsData[scenario];
  const jurisdiction = jurisdictionSel.value;

  // Highlight active card
  document.querySelectorAll(".rights-card").forEach(c => c.classList.remove("active"));
  cardEl.classList.add("active");

  rightsOutput.classList.remove("hidden");
  rightsOutput.innerHTML = `<div class="loading-state"><div class="loading-spinner"></div><p>Loading your ${info.title} information...</p></div>`;
  rightsOutput.scrollIntoView({ behavior: "smooth", block: "nearest" });

  isLoading = true;

  const prompt = `Explain in detail the ${info.title} in ${jurisdiction}. Include:

1. **Overview** - What rights do you have in this area?
2. **Key Rights** - List the most important rights with brief explanations
3. **When These Rights Apply** - Scenarios where these rights are most relevant
4. **Common Violations** - What are typical ways these rights are violated?
5. **How to Enforce Your Rights** - Step-by-step process
6. **Important Laws/Acts** - Key legislation protecting these rights in ${jurisdiction}
7. **When to Seek Legal Help** - Warning signs that you need a lawyer
8. **Quick Reference** - 3-5 most important things to remember

Make it practical, clear, and accessible to someone with no legal background.`;

  try {
    const aiText = await callGemini(
      `You are LexAI, an expert in ${info.title} law. Provide comprehensive, jurisdiction-specific information in plain English. Current jurisdiction: ${jurisdiction}.`,
      prompt
    );
    rightsOutput.innerHTML = `
      <div style="margin-bottom:20px;display:flex;align-items:center;gap:12px;">
        <span style="font-size:36px;">${info.icon}</span>
        <div>
          <h2 style="font-family:var(--font-serif);font-size:24px;color:var(--color-primary-light);">${info.title}</h2>
          <p style="font-size:13px;color:var(--color-text-secondary);">Jurisdiction: ${jurisdiction}</p>
        </div>
      </div>
      <div style="font-size:14px;line-height:1.8;">${markdownToHtml(aiText)}</div>
      <div style="margin-top:20px;padding-top:16px;border-top:1px solid var(--color-border);font-size:11px;color:var(--color-text-muted);">
        ⚠️ This information is general in nature and may not apply to your specific situation. Laws vary by region and change over time. Consult a qualified lawyer for advice specific to your case.
      </div>`;
  } catch (err) {
    const safeMsg = escapeHtml(err.message || "Unknown error");
    rightsOutput.innerHTML = `<div class="output-placeholder"><div class="placeholder-icon">⚠️</div><p>Failed to load: ${safeMsg}</p></div>`;
    showToast("Failed: " + err.message, "error");
  } finally {
    isLoading = false;
  }
}

// ── Legal Templates ───────────────────────────────────────────
const templateDefs = {
  nda: {
    title: "Non-Disclosure Agreement (NDA)",
    fields: [
      { id: "party1", label: "Disclosing Party (Name / Company)", placeholder: "e.g., Acme Corp" },
      { id: "party2", label: "Receiving Party (Name / Company)", placeholder: "e.g., John Smith / XYZ Ltd" },
      { id: "purpose", label: "Purpose of Disclosure", placeholder: "e.g., Evaluating a potential business partnership" },
      { id: "duration", label: "Confidentiality Duration", placeholder: "e.g., 2 years" },
      { id: "jurisdiction", label: "Governing Law / Jurisdiction", placeholder: "e.g., Maharashtra, India" },
      { id: "date", label: "Agreement Date", placeholder: "e.g., September 14, 2025" }
    ]
  },
  freelance: {
    title: "Freelance Service Agreement",
    fields: [
      { id: "client", label: "Client Name / Company", placeholder: "e.g., ABC Corp" },
      { id: "freelancer", label: "Freelancer Name", placeholder: "e.g., Jane Doe" },
      { id: "services", label: "Services to be Provided", placeholder: "e.g., Website design and development" },
      { id: "payment", label: "Payment Terms", placeholder: "e.g., $3,000 total, 50% upfront, 50% on delivery" },
      { id: "timeline", label: "Project Timeline", placeholder: "e.g., 6 weeks from project start" },
      { id: "jurisdiction", label: "Governing Law", placeholder: "e.g., California, USA" }
    ]
  },
  lease: {
    title: "Residential Lease Agreement",
    fields: [
      { id: "landlord", label: "Landlord Name", placeholder: "e.g., Ramesh Kumar" },
      { id: "tenant", label: "Tenant Name(s)", placeholder: "e.g., Priya Sharma" },
      { id: "property", label: "Property Address", placeholder: "e.g., 42 MG Road, Flat 3B, Mumbai 400001" },
      { id: "rent", label: "Monthly Rent", placeholder: "e.g., ₹25,000 per month" },
      { id: "deposit", label: "Security Deposit", placeholder: "e.g., ₹75,000" },
      { id: "duration", label: "Lease Duration", placeholder: "e.g., 11 months, starting October 1, 2025" }
    ]
  },
  cease: {
    title: "Cease & Desist Letter",
    fields: [
      { id: "sender", label: "Your Name / Company", placeholder: "e.g., Creative Studio Ltd" },
      { id: "recipient", label: "Recipient Name / Company", placeholder: "e.g., John Doe / Copycat Inc" },
      { id: "issue", label: "Describe the Issue", placeholder: "e.g., Unauthorized use of our logo and brand name on their website" },
      { id: "demand", label: "What Action Do You Demand?", placeholder: "e.g., Immediately remove all infringing content and cease all use of our trademark" },
      { id: "deadline", label: "Deadline to Comply", placeholder: "e.g., 14 days from receipt of this letter" },
      { id: "jurisdiction", label: "Jurisdiction", placeholder: "e.g., Delhi, India" }
    ]
  },
  mou: {
    title: "Memorandum of Understanding (MOU)",
    fields: [
      { id: "party1", label: "Party 1 Name / Organization", placeholder: "e.g., Tech Innovators Pvt. Ltd." },
      { id: "party2", label: "Party 2 Name / Organization", placeholder: "e.g., Green Energy Solutions Ltd." },
      { id: "purpose", label: "Purpose of MOU", placeholder: "e.g., Joint development of a solar energy mobile app" },
      { id: "responsibilities", label: "Key Responsibilities (each party)", placeholder: "e.g., Party 1 provides technology; Party 2 provides funding and market access", type: "textarea" },
      { id: "duration", label: "Duration", placeholder: "e.g., 12 months, renewable by mutual consent" },
      { id: "jurisdiction", label: "Jurisdiction", placeholder: "e.g., Karnataka, India" }
    ]
  },
  employment: {
    title: "Employment Contract",
    fields: [
      { id: "employer", label: "Employer / Company Name", placeholder: "e.g., Nexus Technologies Pvt. Ltd." },
      { id: "employee", label: "Employee Full Name", placeholder: "e.g., Rahul Verma" },
      { id: "position", label: "Job Title / Position", placeholder: "e.g., Senior Software Engineer" },
      { id: "salary", label: "Salary / Compensation", placeholder: "e.g., ₹12,00,000 per annum (CTC)" },
      { id: "startdate", label: "Start Date", placeholder: "e.g., October 1, 2025" },
      { id: "noticePeriod", label: "Notice Period", placeholder: "e.g., 30 days" }
    ]
  }
};

function setupTemplates() {
  document.querySelectorAll(".template-card").forEach(card => {
    card.addEventListener("click", () => openTemplateForm(card.dataset.template));
  });

  backToTemplates.addEventListener("click", () => {
    templateFormContainer.classList.add("hidden");
    document.querySelector(".templates-grid").classList.remove("hidden");
    templateOutput.classList.add("hidden");
    templateOutput.innerHTML = "";
  });

  generateTemplateBtn.addEventListener("click", generateTemplate);
}

function openTemplateForm(type) {
  const def = templateDefs[type];
  if (!def) return;
  activeTemplateType = type;

  document.querySelector(".templates-grid").classList.add("hidden");
  templateFormContainer.classList.remove("hidden");
  templateFormTitle.textContent = `Customize: ${def.title}`;
  templateOutput.classList.add("hidden");
  templateOutput.innerHTML = "";

  templateFormFields.innerHTML = def.fields.map(f => {
    if (f.type === "textarea") {
      return `<div class="form-group full">
        <label for="tmpl-field-${f.id}">${f.label}</label>
        <textarea id="tmpl-field-${f.id}" placeholder="${f.placeholder}" rows="3"></textarea>
      </div>`;
    }
    return `<div class="form-group">
      <label for="tmpl-field-${f.id}">${f.label}</label>
      <input type="text" id="tmpl-field-${f.id}" placeholder="${f.placeholder}" />
    </div>`;
  }).join("");
}

async function generateTemplate() {
  if (!activeTemplateType || isLoading) return;
  const def = templateDefs[activeTemplateType];

  const values = {};
  def.fields.forEach(f => {
    const el = $(`tmpl-field-${f.id}`);
    values[f.id] = el?.value?.trim() || `[${f.label}]`;
  });

  const jurisdiction = jurisdictionSel.value;
  const fieldSummary = def.fields.map(f => `${f.label}: ${values[f.id]}`).join("\n");

  isLoading = true;
  generateTemplateBtn.disabled = true;
  generateTemplateBtn.innerHTML = `<div class="loading-spinner" style="width:16px;height:16px;border-width:2px;"></div> Generating...`;

  const prompt = `Generate a professional, legally structured ${def.title} for ${jurisdiction}.

Details:
${fieldSummary}

Requirements:
- Use formal legal language
- Include all standard clauses for this document type
- Include signature blocks for all parties
- Include date lines
- Clearly mark any sections that may need customization with [CUSTOMIZE: ...]
- Add standard legal boilerplate for ${jurisdiction}
- Make it ready to use as a starting template

Format as a clean, professional document. Use proper legal formatting.`;

  try {
    const aiText = await callGemini(
      `You are an expert legal document drafter specializing in ${jurisdiction} law. Generate professional, comprehensive legal document templates.`,
      prompt
    );

    templateOutput.classList.remove("hidden");
    templateOutput.innerHTML = escapeHtml(aiText);

    // Remove any previously generated action buttons to prevent duplicates
    document.querySelectorAll(".template-output-actions").forEach(el => el.remove());

    // Add copy and download buttons
    const actionsDiv = document.createElement("div");
    actionsDiv.className = "template-output-actions";
    actionsDiv.innerHTML = `
      <button class="btn btn-ghost btn-sm" id="copy-template-btn" aria-label="Copy template to clipboard">📋 Copy to Clipboard</button>
      <button class="btn btn-ghost btn-sm" id="download-template-btn" aria-label="Download template as text file">⬇️ Download .txt</button>`;
    templateOutput.parentNode.insertBefore(actionsDiv, templateOutput.nextSibling);

    $("copy-template-btn")?.addEventListener("click", () => {
      navigator.clipboard.writeText(aiText).then(() => showToast("Template copied!", "success"));
    });
    $("download-template-btn")?.addEventListener("click", () => {
      downloadText(aiText, `${activeTemplateType}-template.txt`);
    });

    templateOutput.scrollIntoView({ behavior: "smooth", block: "nearest" });
    showToast("Template generated!", "success");
  } catch (err) {
    showToast("Generation failed: " + err.message, "error");
  } finally {
    isLoading = false;
    generateTemplateBtn.disabled = false;
    generateTemplateBtn.innerHTML = "✨ Generate Document";
  }
}

// ── Utilities ─────────────────────────────────────────────────

/**
 * Convert simple markdown to HTML. Handles bold, italic,
 * headers (##, ###), bullets, numbered lists, and inline code.
 */
function markdownToHtml(text) {
  if (!text) return "";

  // Escape HTML first
  let html = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  // Code blocks (``` ```)
  html = html.replace(/```[\w]*\n?([\s\S]*?)```/g,
    (_, code) => `<pre><code>${code.trim()}</code></pre>`);

  // Headers
  html = html.replace(/^#### (.+)$/gm, "<h4>$1</h4>");
  html = html.replace(/^### (.+)$/gm, "<h3>$1</h3>");
  html = html.replace(/^## (.+)$/gm, "<h2>$1</h2>");
  html = html.replace(/^# (.+)$/gm, "<h1>$1</h1>");

  // Bold + Italic
  html = html.replace(/\*\*\*(.+?)\*\*\*/g, "<strong><em>$1</em></strong>");
  html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/\*(.+?)\*/g, "<em>$1</em>");

  // Inline code
  html = html.replace(/`([^`]+)`/g, "<code>$1</code>");

  // Horizontal rule
  html = html.replace(/^---$/gm, "<hr/>");

  // Unordered lists
  html = html.replace(/^[\-\*] (.+)$/gm, "<li>$1</li>");
  html = html.replace(/(<li>[\s\S]*?<\/li>)+/g, m => `<ul>${m}</ul>`);

  // Ordered lists
  html = html.replace(/^\d+\. (.+)$/gm, "<li>$1</li>");

  // Paragraphs
  html = html.replace(/\n\n+/g, "\n\n");
  const lines = html.split("\n");
  const result = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) { result.push(""); continue; }
    if (/^<(h[1-6]|ul|ol|li|pre|hr)/.test(trimmed)) { result.push(trimmed); continue; }
    result.push(`<p>${trimmed}</p>`);
  }

  return result.join("\n");
}

function escapeHtml(text) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function autoResizeTextarea(el) {
  el.style.height = "auto";
  el.style.height = Math.min(el.scrollHeight, 200) + "px";
}

function showToast(message, type = "info") {
  toast.textContent = message;
  toast.className = `toast ${type} show`;
  setTimeout(() => toast.classList.remove("show"), 3500);
}

function downloadText(text, filename) {
  const blob = new Blob([text], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}
