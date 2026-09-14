/**
 * @fileoverview LexAI — Main Entry Point
 * @module       LexAI.App
 */

import { $, toggleSidebar, autoResizeTextarea, initApiKeyModal } from './ui.js';
import { setup as setupChat } from './features/chat.js';
import { setup as setupAnalyze } from './features/analyze.js';
import { setup as setupCompare } from './features/compare.js';
import { setup as setupRights } from './features/rights.js';
import { setup as setupTemplates } from './features/templates.js';

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
      if (window.innerWidth < 768) toggleSidebar();
    });
  });
}

function setupSidebar() {
  $("sidebar-toggle")?.addEventListener("click", () => toggleSidebar());
  $("mobile-menu-btn")?.addEventListener("click", () => toggleSidebar());
  $("sidebar-overlay")?.addEventListener("click", () => toggleSidebar());
}

async function init() {
  // Wait for Firebase to load (from firebase.js)
  await waitForFirebase();

  // Hide loader
  setTimeout(() => $("loading-screen").classList.add("hidden"), 1800);

  // Ask for API Key if not set
  initApiKeyModal();

  // Setup global UI
  setupNavigation();
  setupSidebar();

  // Initialize feature modules
  setupChat();
  setupAnalyze();
  setupCompare();
  setupRights();
  setupTemplates();

  const chatInput = $("chat-input");
  if (chatInput) autoResizeTextarea(chatInput);
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
