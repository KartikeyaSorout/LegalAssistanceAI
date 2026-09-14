/**
 * @fileoverview LexAI — Document Comparator Feature
 * @module       LexAI.Features.Compare
 */
(function (LexAI) {
  "use strict";

  const { $ } = LexAI.UI;
  
  const docA = $("doc-a");
  const docB = $("doc-b");
  const compareBtn = $("compare-btn");
  const comparePlaceholder = $("compare-placeholder");
  const compareOutput = $("compare-output");
  const jurisdictionSel = $("jurisdiction-select");

  let isLoading = false;

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

  function setup() {
    $("load-sample-a")?.addEventListener("click", () => { docA.value = SAMPLE_A; });
    $("load-sample-b")?.addEventListener("click", () => { docB.value = SAMPLE_B; });
    compareBtn?.addEventListener("click", compareDocuments);
  }

  function showComparePlaceholder() {
    comparePlaceholder.classList.remove("hidden");
    compareOutput.classList.add("hidden");
  }

  async function compareDocuments() {
    const a = docA.value.trim();
    const b = docB.value.trim();
    if (!a || !b) { LexAI.UI.showToast("Please provide both documents to compare.", "error"); return; }
    
    if (!LexAI.Security.validateDocInput(a) || !LexAI.Security.validateDocInput(b)) { 
      LexAI.UI.showToast(`Each document must be under ${LexAI.Config.MAX_DOC_CHARS.toLocaleString()} characters.`, "error"); 
      return; 
    }
    
    if (isLoading) return;

    // Rate limiting
    const rl = LexAI.Security.checkRateLimit("compare");
    if (!rl.allowed) { LexAI.UI.showToast("Too many comparison requests. Please wait a moment.", "error"); return; }

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
      const aiText = await LexAI.API.callGemini(
        `You are LexAI, an expert legal document comparator. Analyze both documents carefully for differences that matter legally. Jurisdiction: ${jurisdiction}.`,
        prompt
      );
      compareOutput.innerHTML = `<div style="font-size:14px;line-height:1.8;">${LexAI.Utils.markdownToHtml(aiText)}</div>
        <div style="margin-top:20px;padding-top:16px;border-top:1px solid var(--color-border);font-size:11px;color:var(--color-text-muted);">
          ⚠️ Informational only. Not legal advice. Consult a qualified lawyer before accepting any legal document.
        </div>`;
    } catch (err) {
      const safeMsg = LexAI.Security.escapeHtml(err.message || "Unknown error");
      compareOutput.innerHTML = `<div class="output-placeholder"><div class="placeholder-icon">⚠️</div><p>Comparison failed: ${safeMsg}</p></div>`;
      LexAI.UI.showToast("Comparison failed: " + err.message, "error");
    } finally {
      isLoading = false;
      compareBtn.disabled = false;
      compareBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="3" width="9" height="18" rx="1"/><rect x="13" y="3" width="9" height="18" rx="1"/></svg> Compare Documents`;
    }
  }

  // Export module functions
  LexAI.Features = LexAI.Features || {};
  LexAI.Features.Compare = {
    setup
  };

})(window.LexAI = window.LexAI || {});
