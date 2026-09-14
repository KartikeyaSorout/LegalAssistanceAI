// ============================================================
// firebase.js — Firebase initialization stub for LexAI
// NOTE: Firebase SDK is loaded via ESM in index.html
// This file provides a global fallback object used by app.js
// when Firebase is not yet initialized.
// ============================================================

// If Firebase didn't load (e.g. adblocker, offline), expose a no-op
if (typeof window.LexFirebase === "undefined") {
  window.LexFirebase = {
    saveChatToFirestore: async () => {},
    loadChatHistory:     async () => [],
    db: null
  };
}
