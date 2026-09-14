/**
 * @fileoverview LexAI — Main Entry Point
 * @module       LexAI.App
 */
(function (LexAI) {
  "use strict";

  const { $ } = LexAI.UI;
  let currentSection = "chat";

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

  const sectionTitles = {
    chat:      "Legal Chat Assistant",
    analyze:   "Document Analyzer",
    compare:   "Document Comparator",
    rights:    "Know Your Rights",
    templates: "Legal Templates"
  };

  function switchSection(sec) {
    currentSection = sec;
    document.querySelectorAll(".section").forEach(s => s.classList.remove("active"));
    document.querySelectorAll(".nav-item").forEach(n => n.classList.remove("active"));
    $(`section-${sec}`).classList.add("active");
    $(`nav-${sec}`).classList.add("active");
    $("section-title").textContent = sectionTitles[sec] || sec;
  }

  function setupNavigation() {
    document.querySelectorAll(".nav-item").forEach(item => {
      item.addEventListener("click", () => {
        switchSection(item.dataset.section);
        if (window.innerWidth < 768) LexAI.UI.toggleSidebar();
      });
    });
  }

  function setupSidebar() {
    $("sidebar-toggle")?.addEventListener("click", () => LexAI.UI.toggleSidebar());
    $("mobile-menu-btn")?.addEventListener("click", () => LexAI.UI.toggleSidebar());
    $("sidebar-overlay")?.addEventListener("click", () => LexAI.UI.toggleSidebar());
  }

  async function init() {
    // Wait for Firebase to load (from firebase.js)
    await waitForFirebase();

    // Hide loader
    setTimeout(() => $("loading-screen").classList.add("hidden"), 1800);

    // Setup global UI
    setupNavigation();
    setupSidebar();

    // Initialize feature modules
    if (LexAI.Features.Chat) LexAI.Features.Chat.setup();
    if (LexAI.Features.Analyze) LexAI.Features.Analyze.setup();
    if (LexAI.Features.Compare) LexAI.Features.Compare.setup();
    if (LexAI.Features.Rights) LexAI.Features.Rights.setup();
    if (LexAI.Features.Templates) LexAI.Features.Templates.setup();

    LexAI.UI.autoResizeTextarea($("chat-input"));
  }

  // Register Service Worker
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js')
        .then(reg => console.log('Service Worker registered:', reg.scope))
        .catch(err => console.log('Service Worker registration failed:', err));
    });
  }

  // Start app
  window.addEventListener("DOMContentLoaded", init);

})(window.LexAI = window.LexAI || {});
