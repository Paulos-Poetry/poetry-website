// Language preference, saved locally in the browser.
// Default is English; poems without an English version fall back to
// Greek (and vice versa) with a small "no translation" note.

export type Language = "english" | "greek";

const STORAGE_KEY = "preferredLanguage";

export function getPreferredLanguage(): Language {
  try {
    return localStorage.getItem(STORAGE_KEY) === "greek" ? "greek" : "english";
  } catch {
    return "english";
  }
}

export function setPreferredLanguage(lang: Language): void {
  try {
    localStorage.setItem(STORAGE_KEY, lang);
  } catch {
    // localStorage unavailable (private mode etc.) — preference just won't persist
  }
}

// True when the content is real text, not empty and not a placeholder
export function hasValidContent(content: string | null | undefined): boolean {
  if (!content) return false;
  const stripped = content.replace(/<[^>]*>/g, "").trim();
  if (stripped.length === 0) return false;
  if (
    stripped === "This work has no translation yet..." ||
    stripped === "No translation available"
  ) {
    return false;
  }
  // Manual placeholders like "(Only In Greek)" typed into the other field
  if (/^\(?\s*only in (greek|english)\s*\)?\.?$/i.test(stripped)) return false;
  return true;
}

export function languageLabel(lang: Language): string {
  return lang === "english" ? "English" : "Greek";
}
