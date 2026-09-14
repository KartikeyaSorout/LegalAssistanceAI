/**
 * @fileoverview LexAI — Utility Functions Module
 * @description  Helper functions for text parsing, markdown conversion, etc.
 * @module       LexAI.Utils
 */
(function (LexAI) {
  "use strict";

  /**
   * Convert simple markdown to HTML. Handles bold, italic,
   * headers (##, ###), bullets, numbered lists, and inline code.
   */
  function markdownToHtml(text) {
    if (!text) return "";

    // Escape HTML first using the security module
    let html = LexAI.Security.escapeHtml(text);

    // Unescape &amp; etc just for the markdown parser (since we escaped it all above)
    // Actually, it's safer to leave it escaped and just parse the markdown syntax around it.
    // Wait, markdown formatting relies on some characters, but they aren't < or > mostly.

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

  function downloadText(text, filename) {
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  }

  // Export module functions
  LexAI.Utils = {
    markdownToHtml,
    downloadText
  };

})(window.LexAI = window.LexAI || {});
