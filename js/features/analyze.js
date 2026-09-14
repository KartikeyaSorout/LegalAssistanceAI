/**
 * @fileoverview LexAI — Document Analyzer Feature
 * @module       LexAI.Features.Analyze
 */
(function (LexAI) {
  "use strict";

  const { $ } = LexAI.UI;
  
  const docInput = $("doc-input");
  const docType = $("doc-type");
  const analyzeFocus = $("analyze-focus");
  const analyzeBtn = $("analyze-btn");
  const analyzePlaceholder = $("analyze-placeholder");
  const analyzeOutput = $("analyze-output");
  const loadSampleDoc = $("load-sample-doc");
  const clearDoc = $("clear-doc");
  const jurisdictionSel = $("jurisdiction-select");

  let isLoading = false;

  const SAMPLE_DOC = `NON-DISCLOSURE AGREEMENT

This Non-Disclosure Agreement ("Agreement") is entered into as of January 1, 2025, between XYZ Corp ("Disclosing Party") and ABC Ltd ("Receiving Party").

1. CONFIDENTIAL INFORMATION: The Receiving Party agrees to hold in strict confidence and not disclose to any third party any Confidential Information received from the Disclosing Party. "Confidential Information" means any non-public information that relates to the actual or anticipated business or research and development of the Disclosing Party.

2. NON-COMPETE: The Receiving Party agrees not to engage in any business activity that competes with Disclosing Party's business for a period of 3 years within a 100-mile radius.

3. TERM: This Agreement shall remain in force for 5 years from the date of signing.

4. PENALTIES: Breach of this Agreement shall result in liquidated damages of $500,000 USD, plus attorney's fees and court costs.

5. GOVERNING LAW: This Agreement is governed by the laws of Delaware, United States.

6. SURVIVAL: Obligations under this Agreement shall survive termination for 10 years.`;

  function setup() {
    loadSampleDoc?.addEventListener("click", () => { docInput.value = SAMPLE_DOC; });
    clearDoc?.addEventListener("click", () => { docInput.value = ""; showAnalyzePlaceholder(); });
    analyzeBtn?.addEventListener("click", analyzeDocument);
  }

  function showAnalyzePlaceholder() {
    analyzePlaceholder.classList.remove("hidden");
    analyzeOutput.classList.add("hidden");
  }

  async function analyzeDocument() {
    const text = docInput.value.trim();
    if (!text) { LexAI.UI.showToast("Please paste a document to analyze.", "error"); return; }
    
    if (!LexAI.Security.validateDocInput(text)) { 
      LexAI.UI.showToast(`Document too large (max ${LexAI.Config.MAX_DOC_CHARS.toLocaleString()} characters). Please paste a shorter excerpt.`, "error"); 
      return; 
    }
    
    if (isLoading) return;

    // Rate limiting
    const rl = LexAI.Security.checkRateLimit("analyze");
    if (!rl.allowed) { LexAI.UI.showToast("Too many analysis requests. Please wait a moment.", "error"); return; }

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
      const aiText = await LexAI.API.callGemini(
        `You are LexAI, an expert legal document analyst. Analyze documents thoroughly, identify risks, and explain everything in plain English. Jurisdiction: ${jurisdiction}.`,
        prompt
      );
      renderAnalysisOutput(aiText);
    } catch (err) {
      const safeMsg = LexAI.Security.escapeHtml(err.message || "Unknown error");
      analyzeOutput.innerHTML = `<div class="output-placeholder"><div class="placeholder-icon">⚠️</div><p>Analysis failed: ${safeMsg}</p></div>`;
      LexAI.UI.showToast("Analysis failed: " + err.message, "error");
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
        ${LexAI.Utils.markdownToHtml(text)}
      </div>
      <div style="margin-top:20px;padding-top:16px;border-top:1px solid var(--color-border);font-size:11px;color:var(--color-text-muted);">
        ⚠️ This analysis is for informational purposes only and does not constitute legal advice. Always consult a qualified legal professional before making decisions based on this analysis.
      </div>`;
  }

  // Export module functions
  LexAI.Features = LexAI.Features || {};
  LexAI.Features.Analyze = {
    setup
  };

})(window.LexAI = window.LexAI || {});
