/**
 * @fileoverview LexAI — Security & Validation Module
 * @description  Handles rate limiting, XSS prevention, and prompt injection defense.
 * @module       LexAI.Security
 */

import Config from './config.js';

/**
 * Client-side rate limiter using sessionStorage.
 * Prevents abuse and controls API costs.
 * @param {string} feature - Feature identifier (e.g. 'chat', 'analyze')
 * @returns {{allowed: boolean, remaining: number}}
 */
export function checkRateLimit(feature) {
  const key   = `lexai_ratelimit_${feature}_${new Date().toISOString().slice(0, 16)}`; // per-minute bucket
  const count = parseInt(sessionStorage.getItem(key) || "0", 10);
  if (count >= Config.RATE_LIMIT_MAX) return { allowed: false, remaining: 0 };
  sessionStorage.setItem(key, String(count + 1));
  return { allowed: true, remaining: Config.RATE_LIMIT_MAX - count - 1 };
}

/**
 * Escape HTML special characters to prevent XSS.
 * Safely coerces any type to string before processing.
 * @param {*} text - Any value to escape
 * @returns {string} HTML-safe string
 */
export function escapeHtml(text) {
  return String(text == null ? "" : text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * Sanitize a user-provided template form field value.
 * Strips angle brackets, limits length, collapses excessive whitespace.
 * @param {string} value - Raw field value from input/textarea
 * @returns {string} Sanitized value safe for AI prompt injection
 */
export function sanitizeTemplateInput(value) {
  if (typeof value !== "string") return "";
  return value
    .trim()
    .slice(0, Config.MAX_FIELD_CHARS)
    .replace(/[<>]/g, "")            // strip angle brackets
    .replace(/[\u0000-\u001F]/g, " ") // strip control characters
    .replace(/\s{3,}/g, "  ");        // collapse excessive whitespace
}

/**
 * Defend against prompt injection in user-supplied text.
 * Wraps known injection patterns so they cannot override system instructions.
 * @param {string} text - Raw user text
 * @returns {string} Sanitized text safe to embed in AI prompt
 */
export function sanitizePromptInput(text) {
  if (typeof text !== "string") return "";
  return text
    .replace(/ignore (all |previous |prior |above )?instructions?/gi, "[flagged-text]")
    .replace(/you are now/gi, "[flagged-text]")
    .replace(/system prompt/gi, "[system]")
    .replace(/\[INST\]/g, "[INST_SAFE]")
    .replace(/\[SYS\]/g, "[SYS_SAFE]");
}

/**
 * Validates if the input exceeds the document character limit.
 */
export function validateDocInput(text) {
  return text && text.trim().length > 0 && text.length <= Config.MAX_DOC_CHARS;
}
