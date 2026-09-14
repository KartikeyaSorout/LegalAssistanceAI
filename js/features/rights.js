/**
 * @fileoverview LexAI — Know Your Rights Feature
 * @module       LexAI.Features.Rights
 */

import { $, showToast } from '../ui.js';
import { checkRateLimit, escapeHtml } from '../security.js';
import { callGemini, cacheKey, getCached, setCache } from '../api.js';
import { markdownToHtml } from '../utils.js';

const jurisdictionSel = $("jurisdiction-select");
const rightsOutput = $("rights-output");

let isLoading = false;

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

export function setup() {
  document.querySelectorAll(".rights-card").forEach(card => {
    card.addEventListener("click", () => loadRights(card.dataset.scenario, card));
  });
}

async function loadRights(scenario, cardEl) {
  if (isLoading) return;
  const info = rightsData[scenario];
  const jurisdiction = jurisdictionSel.value;

  // Check cache first (same scenario + jurisdiction = identical response)
  const ck = cacheKey("rights", scenario, jurisdiction);
  const cached = getCached(ck);

  // Highlight active card
  document.querySelectorAll(".rights-card").forEach(c => c.classList.remove("active"));
  cardEl.classList.add("active");

  rightsOutput.classList.remove("hidden");
  rightsOutput.scrollIntoView({ behavior: "smooth", block: "nearest" });

  if (cached) {
    rightsOutput.innerHTML = cached;
    return;
  }

  // Rate limiting
  const rl = checkRateLimit("rights");
  if (!rl.allowed) { showToast("Too many requests. Please wait a moment.", "error"); return; }

  rightsOutput.innerHTML = `<div class="loading-state"><div class="loading-spinner"></div><p>Loading your ${info.title} information...</p></div>`;

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
    const html = `
      <div style="margin-bottom:20px;display:flex;align-items:center;gap:12px;">
        <span style="font-size:36px;" aria-hidden="true">${info.icon}</span>
        <div>
          <h2 style="font-family:var(--font-serif);font-size:24px;color:var(--color-primary-light);">${info.title}</h2>
          <p style="font-size:13px;color:var(--color-text-secondary);">Jurisdiction: ${jurisdiction}</p>
        </div>
      </div>
      <div style="font-size:14px;line-height:1.8;">${markdownToHtml(aiText)}</div>
      <div style="margin-top:20px;padding-top:16px;border-top:1px solid var(--color-border);font-size:11px;color:var(--color-text-muted);">
        ⚠️ This information is general in nature and may not apply to your specific situation. Laws vary by region and change over time. Consult a qualified lawyer for advice specific to your case.
      </div>`;
    rightsOutput.innerHTML = html;
    // Cache the rendered HTML to avoid repeat API calls for same scenario+jurisdiction
    setCache(ck, html);
  } catch (err) {
    if (err.message === "API_KEY_MISSING" || err.message === "API_KEY_INVALID") {
      showToast("API Key is missing or invalid. Refresh to enter key.", "error");
    } else {
      const safeMsg = escapeHtml(err.message || "Unknown error");
      rightsOutput.innerHTML = `<div class="output-placeholder"><div class="placeholder-icon">⚠️</div><p>Failed to load: ${safeMsg}</p></div>`;
      showToast("Failed: " + err.message, "error");
    }
  } finally {
    isLoading = false;
  }
}
