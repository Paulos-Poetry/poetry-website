// Convert the different ways PDFs were stored into a Blob the browser can use.
// This accepts base64 text, raw PDF text that starts with %PDF, ArrayBuffer, Uint8Array, and Node Buffers.
export function toPdfBlobFromPayload(pdfPayload: unknown, contentType = 'application/pdf'): Blob | null {
  if (!pdfPayload) return null;

  // If it's already an ArrayBuffer, wrap it in a Uint8Array and return a Blob
  if (pdfPayload instanceof ArrayBuffer) {
    return new Blob([new Uint8Array(pdfPayload)], { type: contentType });
  }

  // If it's a typed array, copy it and return a Blob
  if (typeof Uint8Array !== 'undefined' && pdfPayload instanceof Uint8Array) {
    const view = pdfPayload.slice ? pdfPayload.slice(0) : new Uint8Array(pdfPayload);
    return new Blob([view], { type: contentType });
  }

  // If it's a Node Buffer, convert to a Uint8Array and return a Blob
  if (typeof Buffer !== 'undefined' && Buffer.isBuffer(pdfPayload)) {
    const view = new Uint8Array(Buffer.from(pdfPayload));
    return new Blob([view], { type: contentType });
  }

  // If it's a string, try a few common encodings we ran into during migration.
  if (typeof pdfPayload === 'string') {
    const s = pdfPayload.trim();

    // If the string contains C-style hex escapes like \x4a\x56, decode those to bytes.
    if (/\\x/i.test(s)) {
      try {
        const cleaned = s.replace(/\\x/gi, '').replace(/[^0-9A-Fa-f]/g, '');
        if (cleaned.length >= 4 && cleaned.length % 2 === 0) {
          const len = cleaned.length / 2;
          const bytes = new Uint8Array(len);
          for (let i = 0; i < len; i++) {
            bytes[i] = parseInt(cleaned.substr(i * 2, 2), 16);
          }

          // Sometimes those bytes are actually ASCII base64, so decode that first
          const ascii = Array.from(bytes).map(b => String.fromCharCode(b)).join('');
          const normalizedAscii = ascii.replace(/\s+/g, '').replace(/-/g, '+').replace(/_/g, '/');
          const looksLikeBase64 = /^[A-Za-z0-9+/=]+$/.test(normalizedAscii) && (normalizedAscii.length % 4 === 0 || normalizedAscii.endsWith('='));

          if (looksLikeBase64) {
            try {
              const binaryString = atob(normalizedAscii);
              const out = new Uint8Array(binaryString.length);
              for (let i = 0; i < binaryString.length; i++) out[i] = binaryString.charCodeAt(i);
              return new Blob([out], { type: contentType });
            } catch {
              // If base64 decode fails, fall through to returning raw bytes
            }
          }

          if (ascii.startsWith('%PDF')) return new Blob([bytes], { type: contentType });
          return new Blob([bytes], { type: contentType });
        }
      } catch {
        // ignore and try other options
      }
    }

    // If it looks like plain hex, decode to bytes and try to detect base64 inside
    if (/^[0-9A-Fa-f]+$/.test(s) && s.length >= 8 && s.length % 2 === 0) {
      try {
        const len = s.length / 2;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) bytes[i] = parseInt(s.substr(i * 2, 2), 16);

        const ascii = Array.from(bytes).map(b => String.fromCharCode(b)).join('');
        const normalizedAscii = ascii.replace(/\s+/g, '').replace(/-/g, '+').replace(/_/g, '/');
        const looksLikeBase64 = /^[A-Za-z0-9+/=]+$/.test(normalizedAscii) && (normalizedAscii.length % 4 === 0 || normalizedAscii.endsWith('='));

        if (looksLikeBase64) {
          try {
            const binaryString = atob(normalizedAscii);
            const out = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) out[i] = binaryString.charCodeAt(i);
            return new Blob([out], { type: contentType });
          } catch {
            // fall through
          }
        }

        if (ascii.startsWith('%PDF')) return new Blob([bytes], { type: contentType });
        return new Blob([bytes], { type: contentType });
      } catch {
        // ignore and try other options
      }
    }

    // If the string starts with '%PDF' treat it as raw PDF text
    if (s.startsWith('%PDF')) {
      const len = s.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) bytes[i] = s.charCodeAt(i);
      return new Blob([bytes], { type: contentType });
    }

    // If it looks like base64, decode it
    const normalized = s.replace(/\s+/g, '').replace(/-/g, '+').replace(/_/g, '/');
    const maybeBase64 = /^[A-Za-z0-9+/=]+$/.test(normalized) && (normalized.length % 4 === 0 || normalized.endsWith('='));
    if (maybeBase64) {
      try {
        const binaryString = atob(normalized);
        const len = binaryString.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) bytes[i] = binaryString.charCodeAt(i);
        return new Blob([bytes], { type: contentType });
      } catch {
        // fall through
      }
    }

    // Final fallback: treat the string as raw bytes
    try {
      const len = s.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) bytes[i] = s.charCodeAt(i);
      return new Blob([bytes], { type: contentType });
    } catch {
      return null;
    }
  }

  // Unknown type
  return null;
}
