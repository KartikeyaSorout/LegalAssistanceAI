# Security Policy — LexAI Legal Assistance Platform

## Overview

LexAI is a client-side GenAI application deployed on Firebase Hosting. This document outlines the security measures implemented and responsible disclosure guidelines.

---

## Security Measures Implemented

### 1. Input Sanitization & Validation

| Layer | Function | Protection |
|---|---|---|
| HTML Escaping | `escapeHtml()` | XSS prevention — all user text and AI output is escaped before DOM injection |
| Template Fields | `sanitizeTemplateInput()` | Strips `<>`, control chars (U+0000–U+001F), limits to 500 chars per field |
| Prompt Injection | `sanitizePromptInput()` | Neutralizes `ignore instructions`, `you are now`, `[INST]`, `[SYS]` injection patterns |
| Chat Input | `MAX_CHAT_CHARS = 4000` | Hard limit prevents context overflow attacks |
| Document Input | `MAX_DOC_CHARS = 30000` | Hard limit prevents token flooding attacks |

### 2. HTTP Security Headers (Firebase Hosting)

All responses include the following headers:

| Header | Value | Purpose |
|---|---|---|
| `Content-Security-Policy` | See `firebase.json` | Prevents XSS, data injection, and clickjacking |
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains; preload` | Forces HTTPS for 1 year |
| `X-Frame-Options` | `DENY` | Prevents clickjacking via iframes |
| `X-Content-Type-Options` | `nosniff` | Prevents MIME type sniffing |
| `X-XSS-Protection` | `1; mode=block` | Enables legacy browser XSS filter |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Limits referrer information leakage |
| `Permissions-Policy` | `geolocation=(), microphone=(), camera=(), payment=()` | Disables sensitive browser APIs |

### 3. Client-Side Rate Limiting

- **Implementation**: `checkRateLimit(feature)` using per-minute `sessionStorage` buckets
- **Limit**: 10 requests per feature per minute
- **Features protected**: `chat`, `analyze`, `compare`, `rights`, `template`
- **Purpose**: Controls AI API costs and prevents abuse

### 4. Response Caching

- **Know Your Rights**: Identical scenario + jurisdiction responses are cached in-memory
- **LRU Eviction**: Cache auto-evicts at 51 entries to prevent memory exhaustion
- **Purpose**: Reduces unnecessary AI API calls

### 5. AI API Safety Settings

The Gemini API is called with explicit safety thresholds:
- `HARM_CATEGORY_DANGEROUS_CONTENT`: `BLOCK_NONE` (legal content needs flexibility)
- `HARM_CATEGORY_HARASSMENT`: `BLOCK_ONLY_HIGH`
- `HARM_CATEGORY_HATE_SPEECH`: `BLOCK_ONLY_HIGH`

### 6. Error Handling

- All error messages are passed through `escapeHtml()` before DOM injection
- Firebase/Firestore errors are caught and silently degraded (non-blocking)
- API errors surface user-friendly messages without leaking stack traces

### 7. Firebase Firestore

- Chat history is saved per session with a randomly generated `sessionId`
- No Personally Identifiable Information (PII) is stored
- Firestore writes are non-blocking; failures are silently logged to console

---

## Known Limitations (Client-Side Architecture)

> [!WARNING]
> This is a demonstration/evaluation project. The following limitations apply:

1. **API Key Exposure**: The Gemini API key is embedded in client-side JavaScript. In production, API calls should be proxied through Firebase Cloud Functions to keep the key server-side.
2. **Client-Side Rate Limiting**: The rate limiter uses `sessionStorage` and can be bypassed by clearing browser storage. Server-side rate limiting (e.g., Firebase App Check + Cloud Functions) would be needed for production.
3. **CSP `unsafe-inline`**: The inline `<script>` block in `index.html` for Firebase initialization requires `unsafe-inline`. A production build should use a nonce-based CSP.

---

## Supported Versions

| Version | Supported |
|---|---|
| 2.0.0 (current) | ✅ |
| 1.0.0 | ❌ |

---

## Reporting a Vulnerability

If you discover a security vulnerability, please report it responsibly:

1. **Do not** open a public GitHub issue for security vulnerabilities
2. Email the details to the repository owner via GitHub's private security advisory feature
3. Include: description, steps to reproduce, and potential impact
4. We aim to respond within 48 hours

---

## Content Security Policy (Full)

```
default-src 'self';
script-src 'self' 'unsafe-inline' https://www.gstatic.com;
style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
font-src https://fonts.gstatic.com;
img-src 'self' data: https:;
connect-src 'self'
  https://generativelanguage.googleapis.com
  https://*.googleapis.com
  https://*.firebaseio.com
  wss://*.firebaseio.com;
frame-ancestors 'none';
base-uri 'self';
form-action 'self';
```
