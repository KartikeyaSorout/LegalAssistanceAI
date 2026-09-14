/**
 * @fileoverview LexAI — UI Module
 * @description  Handles generic DOM manipulations, toasts, and loading states.
 * @module       LexAI.UI
 */
(function (LexAI) {
  "use strict";

  const toast = document.getElementById("toast");

  function $(id) {
    return document.getElementById(id);
  }

  function showToast(message, type = "info") {
    toast.textContent = message;
    toast.className = `toast ${type} show`;
    setTimeout(() => toast.classList.remove("show"), 3500);
  }

  function autoResizeTextarea(el) {
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 200) + "px";
  }

  function toggleSidebar() {
    const sidebar = $("sidebar");
    const overlay = $("sidebar-overlay");
    sidebar.classList.toggle("open");
    overlay.classList.toggle("active");
  }

  // Export module functions
  LexAI.UI = {
    $,
    showToast,
    autoResizeTextarea,
    toggleSidebar
  };

})(window.LexAI = window.LexAI || {});
