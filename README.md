# ⚖️ LexAI — AI-Powered Legal Assistance Platform

> **Challenge Vertical:** AI for Legal Assistance & Access  
> **Built with:** Gemini 2.0 Flash · Firebase · Vanilla HTML/CSS/JS

[![Live Demo](https://img.shields.io/badge/Live%20Demo-Firebase-orange?logo=firebase)](https://legalassistanceai.web.app)
[![GitHub](https://img.shields.io/badge/Repo-Public-blue?logo=github)](https://github.com/KartikeyaSorout/LegalAssistanceAI)

---

## 🎯 Chosen Vertical

**AI for Legal Assistance & Access** — Legal information is complex and inaccessible to most people. LexAI makes legal knowledge understandable, comparing and navigating legal documents through a GenAI-powered interface.

---

## ✨ Features

| Feature | Description |
|---|---|
| **💬 Legal Chat Assistant** | Multi-turn conversational AI for any legal question, with jurisdiction-aware responses |
| **📄 Document Analyzer** | Paste any contract/NDA/agreement → AI returns risk assessment, key clauses, red flags |
| **🔄 Document Comparator** | Compare two document versions side-by-side, AI highlights critical changes |
| **🛡️ Know Your Rights** | 8 legal scenarios (Tenant, Employee, Consumer, Privacy, Property, Family, Business, Criminal) |
| **📋 Legal Templates** | AI-generated templates for NDA, Freelance Contract, Lease, Cease & Desist, MOU, Employment |

---

## 🧠 Approach & Logic

### AI Decision Making
The system uses **Google Gemini 2.0 Flash** through structured system prompts that:

1. **Context-aware responses** — Every query includes the user's selected jurisdiction, so legal information is tailored to Indian law, US law, UK law, etc.
2. **Role-specific personas** — Each feature has its own system prompt optimizing the AI for that task (document analyst vs. rights explainer vs. document drafter)
3. **Multi-turn memory** — The chat feature maintains conversation history (last 10 turns) allowing contextual follow-up questions
4. **Structured output** — Prompts instruct Gemini to return well-formatted markdown with headers, bullet lists, and bold emphasis for readability

### Architecture
```
User Request
    │
    ▼
Jurisdiction Context + System Prompt
    │
    ▼
Gemini 2.0 Flash API (generativelanguage.googleapis.com)
    │
    ▼
Markdown → HTML Rendering
    │
    ▼
Firebase Firestore (chat persistence)
    │
    ▼
Firebase Hosting (static delivery)
```

---

## 🚀 How to Run Locally

Simply open `index.html` in any modern browser — no build step required.

```bash
git clone https://github.com/KartikeyaSorout/LegalAssistanceAI.git
cd LegalAssistanceAI
# Open index.html in your browser
```

Or use a local server:
```bash
npx serve .
# Visit http://localhost:3000
```

---

## 🔥 Firebase Deployment

```bash
# Install Firebase CLI
npm install -g firebase-tools

# Login
firebase login

# Deploy
firebase deploy --only hosting
```

**Live URL:** https://legalassistanceai.web.app

---

## 📁 File Structure

```
LegalAssistanceAI/
├── index.html        # App shell & all HTML sections
├── styles.css        # Premium dark glassmorphism UI design
├── app.js            # Core application logic & Gemini API integration
├── firebase.js       # Firebase init, Firestore chat persistence
├── firebase.json     # Firebase Hosting configuration
├── .firebaserc       # Firebase project alias
└── README.md         # This file
```

---

## 🏗️ Technical Implementation

### Smart Legal Chat (Multi-turn)
- Maintains `chatHistory[]` array of `{role, parts}` objects
- Passes full history to Gemini for context-aware follow-ups
- System prompt enforces legal disclaimer, plain-English style, and jurisdiction context
- Responses saved to Firestore with session ID for persistence

### Document Analyzer
- User selects document type (auto-detect / NDA / Lease / etc.) and analysis focus
- Structured prompt asks for: Summary, Risk Level, Key Clauses, Red Flags, Obligations, Dates, and Recommendations
- Risk badges rendered based on AI assessment text

### Document Comparator
- Two documents fed to a single Gemini call
- AI identifies favorable/unfavorable changes and flags significant legal risks
- Quotes exact changed text for precision

### Know Your Rights
- 8 hardcoded scenario categories → dynamic AI prompt per scenario
- Jurisdiction selector changes the entire legal context
- Covers key laws and acts specific to the selected region

### Template Generator
- Form fields pre-fill the template prompt with user-specific details
- AI drafts a complete, ready-to-review legal document
- Copy to clipboard & download .txt functionality

---

## ⚠️ Assumptions Made

1. **Not a substitute for legal advice** — LexAI is designed as an informational tool. All AI responses include a disclaimer recommending professional legal consultation.
2. **API Key** — The Gemini API key is embedded for demo/evaluation purposes. In production, this should be moved to a backend function (Firebase Cloud Functions).
3. **Firestore rules** — For demo purposes, Firestore is open. Production would require Auth-gated security rules.
4. **Jurisdiction accuracy** — AI-generated legal information is based on Gemini's training data. Laws change; users should verify with official sources.
5. **No file upload** — Document input is text-paste only (no PDF parsing) to keep the solution lightweight and dependency-free.

---

## 🎨 Design Decisions

- **Dark glassmorphism theme** — Professional, premium feel appropriate for a legal platform
- **No build tools** — Pure HTML/CSS/JS keeps the repo tiny (<1 MB) and instantly deployable
- **Firebase ESM CDN imports** — No npm/node_modules needed; Firebase SDK loaded via CDN
- **Responsive design** — Works on mobile, tablet, and desktop
- **Accessibility** — ARIA labels, keyboard navigation, focus indicators, live regions for chat

---

## 📊 Evaluation Alignment

| Area | Implementation |
|---|---|
| **Code Quality** | Clean, modular JS with clear comments; consistent naming; separated concerns (firebase.js / app.js / styles.css) |
| **Security** | Input displayed via `markdownToHtml()` not `innerHTML` of raw input; API key scoped to demo; safety settings configured |
| **Efficiency** | Static hosting (no server), CDN-loaded SDK, chat history capped at 20 messages, lazy AI calls |
| **Testing** | Sample documents pre-loaded for Analyze & Compare; Quick prompts for Chat; each feature independently testable |
| **Accessibility** | Semantic HTML, ARIA labels, keyboard navigation, color contrast, responsive layout |

---

*Built for the PromptWars Challenge · Vertical: AI for Legal Assistance & Access*
