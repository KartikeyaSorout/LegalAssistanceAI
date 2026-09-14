/**
 * @fileoverview LexAI — UI Module
 * @description  Handles generic DOM manipulations, toasts, loading states, and API Key modal.
 * @module       LexAI.UI
 */

export function $(id) {
  return document.getElementById(id);
}

export function showToast(message, type = "info") {
  const toast = $("toast");
  if (!toast) return;
  toast.textContent = message;
  toast.className = `toast ${type} show`;
  setTimeout(() => toast.classList.remove("show"), 3500);
}

export function autoResizeTextarea(el) {
  el.style.height = "auto";
  el.style.height = Math.min(el.scrollHeight, 200) + "px";
}

export function toggleSidebar() {
  const sidebar = $("sidebar");
  const overlay = $("sidebar-overlay");
  if (!sidebar || !overlay) return;
  sidebar.classList.toggle("open");
  overlay.classList.toggle("active");
}

export function initApiKeyModal() {
  const existingKey = localStorage.getItem('gemini_api_key');
  if (existingKey) return;

  const modalHtml = `
    <div id="api-key-modal" style="position:fixed;inset:0;background:rgba(0,0,0,0.8);backdrop-filter:blur(10px);z-index:9999;display:flex;align-items:center;justify-content:center;font-family:var(--font-sans)">
      <div style="background:var(--color-surface);border:1px solid var(--color-border);border-radius:var(--radius-lg);padding:32px;max-width:450px;width:90%;box-shadow:0 10px 40px rgba(0,0,0,0.5)">
        <h2 style="font-family:var(--font-serif);margin-bottom:12px;font-size:24px;color:var(--color-primary-light)">Welcome to LexAI</h2>
        <p style="color:var(--color-text-secondary);font-size:14px;line-height:1.6;margin-bottom:20px">
          To provide highly secure and dynamic responses, this app connects directly to the Google Gemini API from your browser. 
          Please enter your Gemini API key to continue. It will be saved securely in your browser's local storage.
        </p>
        <input type="password" id="api-key-input" placeholder="AIzaSy..." style="width:100%;padding:12px;background:rgba(0,0,0,0.2);border:1px solid var(--color-border);border-radius:var(--radius-md);color:white;margin-bottom:20px;font-family:monospace;font-size:14px">
        <button id="save-api-key-btn" class="btn btn-primary" style="width:100%;justify-content:center;padding:12px">Save API Key</button>
      </div>
    </div>
  `;
  
  document.body.insertAdjacentHTML('beforeend', modalHtml);
  
  const saveBtn = $("save-api-key-btn");
  saveBtn.addEventListener('click', () => {
    const input = $("api-key-input").value.trim();
    if (input) {
      localStorage.setItem('gemini_api_key', input);
      const modal = $("api-key-modal");
      modal.parentNode.removeChild(modal);
      showToast("API Key saved securely!", "success");
    } else {
      showToast("Please enter a valid API key.", "error");
    }
  });
}
