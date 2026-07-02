// Poem classification for Facebook posts.
// Pure functions, no dependencies — see classify.test.cjs for the test suite.

/** Normalize raw post text: unify newlines, trim, drop zero-width chars. */
function normalizeText(raw) {
  return String(raw || "")
    .replace(/\r\n?/g, "\n")
    .replace(/[​‌‍﻿]/g, "")
    .trim();
}

/**
 * Decide whether a piece of text looks like a poem.
 * Returns { isPoem: boolean, reason: string } so a human reviewing the
 * dry-run output can see exactly why each post was accepted or skipped.
 *
 * The heuristics lean on the strongest structural signal poems have on
 * Facebook: many consecutive SHORT lines. Prose posts are long sentences
 * wrapped into few line breaks; link shares contain URLs; greetings and
 * captions are too short.
 */
function classifyPoem(raw) {
  const text = normalizeText(raw);
  if (!text) return { isPoem: false, reason: "empty" };

  if (/https?:\/\/|www\./i.test(text)) {
    return { isPoem: false, reason: "contains a link (likely a share)" };
  }

  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);

  if (lines.length < 4) {
    return { isPoem: false, reason: `only ${lines.length} line(s) — too short for a poem` };
  }
  if (text.length < 60) {
    return { isPoem: false, reason: "too little text" };
  }
  if (text.length > 8000) {
    return { isPoem: false, reason: "too long — looks like an article" };
  }

  // Poems are made of short verse lines
  const shortLines = lines.filter((l) => l.length <= 65).length;
  const shortRatio = shortLines / lines.length;
  if (shortRatio < 0.7) {
    return { isPoem: false, reason: `lines too long (${Math.round(shortRatio * 100)}% short) — reads like prose` };
  }
  const avgLen = lines.reduce((a, l) => a + l.length, 0) / lines.length;
  if (avgLen > 55) {
    return { isPoem: false, reason: `average line length ${Math.round(avgLen)} — reads like prose` };
  }

  // Mostly letters, not emoji/punctuation walls
  const letters = (text.match(/[A-Za-zͰ-Ͽἀ-῿]/g) || []).length;
  if (letters / text.length < 0.5) {
    return { isPoem: false, reason: "mostly symbols/emoji" };
  }

  return { isPoem: true, reason: `${lines.length} short lines, avg ${Math.round(avgLen)} chars` };
}

/** 'greek' | 'english' by dominant script (covers polytonic Greek too). */
function detectLanguage(raw) {
  const text = normalizeText(raw);
  const greek = (text.match(/[Ͱ-Ͽἀ-῿]/g) || []).length;
  const latin = (text.match(/[A-Za-z]/g) || []).length;
  return greek >= latin ? "greek" : "english";
}

/**
 * Split a post into { title, body }.
 * The first line counts as a standalone title ONLY when it's short AND
 * followed by a blank line (the classic "Title ⏎ ⏎ verse..." shape).
 * A poem that dives straight into verse keeps all its lines, and gets a
 * title derived from its opening words instead.
 */
function extractTitle(raw) {
  const text = normalizeText(raw);
  const lines = text.split("\n");
  const firstIdx = lines.findIndex((l) => l.trim().length > 0);
  const first = (lines[firstIdx] || "").trim().replace(/^[«"“'\s]+|[»"”'\s.…]+$/g, "");
  const nextLineBlank = (lines[firstIdx + 1] || "").trim() === "";

  if (first.length > 0 && first.length <= 60 && nextLineBlank) {
    let rest = lines.slice(firstIdx + 1);
    while (rest.length && rest[0].trim() === "") rest = rest.slice(1);
    const body = rest.join("\n").trim();
    // Only treat the first line as a standalone title when there IS a body
    if (body.length > 0) return { title: first, body };
  }

  // No explicit title: derive one from the first ~7 words, keep full text
  const words = text.replace(/\n/g, " ").split(/\s+/).filter(Boolean);
  const title = words.slice(0, 7).join(" ") + (words.length > 7 ? "…" : "");
  return { title, body: text };
}

/** Convert plain text to the same HTML shape the site's editor produces. */
function textToHtml(raw) {
  const text = normalizeText(raw);
  const esc = (s) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return text
    .split("\n")
    .map((line) => (line.trim() === "" ? "<p><br></p>" : `<p>${esc(line)}</p>`))
    .join("");
}

/** Strip HTML back to comparable plain text (for dedupe against the site). */
function htmlToComparable(html) {
  return String(html || "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<[^>]*>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

/** Comparable form of plain text (same normalization as htmlToComparable). */
function textToComparable(text) {
  return normalizeText(text).replace(/\s+/g, " ").trim().toLowerCase();
}

module.exports = {
  normalizeText,
  classifyPoem,
  detectLanguage,
  extractTitle,
  textToHtml,
  htmlToComparable,
  textToComparable,
};
