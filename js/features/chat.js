/**
 * @fileoverview LexAI — Chat Feature
 * @module       LexAI.Features.Chat
 */
(function (LexAI) {
  "use strict";

  const { $ } = LexAI.UI;
  
  const chatMessages = $("chat-messages");
  const chatInput = $("chat-input");
  const sendBtn = $("send-btn");
  const clearBtn = $("clear-btn");
  const jurisdictionSel = $("jurisdiction-select");

  let chatHistory = [];
  let isLoading = false;

  function setup() {
    sendBtn?.addEventListener("click", sendMessage);
    chatInput?.addEventListener("keydown", e => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    });
    chatInput?.addEventListener("input", () => LexAI.UI.autoResizeTextarea(chatInput));

    // Quick prompts
    document.querySelectorAll(".quick-prompt-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        chatInput.value = btn.dataset.prompt;
        LexAI.UI.autoResizeTextarea(chatInput);
        sendMessage();
      });
    });

    clearBtn?.addEventListener("click", () => {
      // Only clear if we are on chat section, but this is scoped to chat feature.
      // Usually better handled by a central router or checking visibility,
      // but keeping it simple based on existing logic.
      if ($("section-chat").classList.contains("active")) {
        clearChat();
      }
    });
  }

  async function sendMessage() {
    const text = chatInput.value.trim();
    if (!text || isLoading) return;
    if (text.length > LexAI.Config.MAX_CHAT_CHARS) {
      LexAI.UI.showToast(`Message too long (max ${LexAI.Config.MAX_CHAT_CHARS.toLocaleString()} characters). Please shorten your question.`, "error");
      return;
    }

    // Rate limiting: max 10 chat messages per minute
    const rl = LexAI.Security.checkRateLimit("chat");
    if (!rl.allowed) {
      LexAI.UI.showToast("Too many requests. Please wait a moment before sending another message.", "error");
      return;
    }

    const jurisdiction = jurisdictionSel.value;
    const fullPrompt = `[Jurisdiction: ${jurisdiction}]\n\n${text}`;

    // Clear welcome screen if present
    const welcome = chatMessages.querySelector(".chat-welcome");
    if (welcome) welcome.remove();

    appendMessage("user", text);
    chatInput.value = "";
    LexAI.UI.autoResizeTextarea(chatInput);
    isLoading = true;
    sendBtn.disabled = true;

    const typingEl = appendTypingIndicator();

    try {
      const systemPrompt = LexAI.Config.LEGAL_SYSTEM_PROMPT + `\n\nThe user's jurisdiction is: ${jurisdiction}. Tailor your legal information accordingly.`;
      
      const aiText = await LexAI.API.callGemini(systemPrompt, fullPrompt, chatHistory, true);

      // Update history for multi-turn
      chatHistory.push({ role: "user",  parts: [{ text: fullPrompt }] });
      chatHistory.push({ role: "model", parts: [{ text: aiText }] });
      if (chatHistory.length > LexAI.Config.MAX_CHAT_HISTORY) {
        chatHistory = chatHistory.slice(-LexAI.Config.MAX_CHAT_HISTORY); 
      }

      typingEl.remove();
      appendMessage("assistant", aiText);

      // Save to Firestore (non-blocking)
      window.LexFirebase?.saveChatToFirestore(text, aiText, jurisdiction);

    } catch (err) {
      typingEl.remove();
      appendMessage("assistant", `⚠️ **Error:** ${err.message}\n\nPlease check your connection and try again.`);
      LexAI.UI.showToast("AI request failed: " + err.message, "error");
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
    content.innerHTML = LexAI.Utils.markdownToHtml(text);

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
        LexAI.UI.autoResizeTextarea(chatInput);
        sendMessage();
      });
    });
    LexAI.UI.showToast("Chat cleared", "success");
  }

  // Export module functions
  LexAI.Features = LexAI.Features || {};
  LexAI.Features.Chat = {
    setup,
    clearChat
  };

})(window.LexAI = window.LexAI || {});
