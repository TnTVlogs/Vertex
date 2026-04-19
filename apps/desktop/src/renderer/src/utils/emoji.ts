import { EMOJI_SHORTCODES, SHORTCODE_TO_UNICODE } from './shortcodes'

// Catalonia flag SVG fallback
// Catalonia flag SVG fallback (36x36 geometry matching Twemoji spec)
const CATALONIA_FLAG_SVG = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAzNiAzNiI+PGRlZnM+PGNsaXBQYXRoIGlkPSJhIj48cGF0aCBkPSJNMzIgNUg0QzEuNzkxIDUgMCA2Ljc5MSAwIDl2MThjMCAyLjIwOSAxLjc5MSA0IDQgNGgyOGMyLjIwOSAwIDQtMS43OTEgNC00VjljMC0yLjIwOS0xLjc5MS00LTQtNHoiLz48L2NsaXBQYXRoPjwvZGVmcz48ZyBjbGlwLXBhdGg9InVybCgjYSkiPjxyZWN0IHdpZHRoPSIzNiIgaGVpZ2h0PSIzNiIgZmlsbD0iI0ZGQ0MwMCIvPjxwYXRoIGZpbGw9IiNDRTExMjYiIGQ9Ik0wIDcuODg5aDM2djIuODg5SDB6bTAgNS43NzhoMzZ2Mi44ODlIMHptMCA1Ljc3OGgzNnYyLjg4OUgwem0wIDUuNzc4aDM2djIuODg5SDB6Ii8+PC9nPjwvc3ZnPg=='

/**
 * Returns the hex code points for a given emoji string.
 * This is used to build the Twemoji URL.
 */
function getEmojiHex(emoji: string): string {
  // Handle complex emojis (like flags with regional indicators or ZWJ sequences)
  const codePoints: string[] = [];
  for (const char of emoji) {
    const cp = char.codePointAt(0);
    if (cp) codePoints.push(cp.toString(16));
  }
  
  // Logic Fix: Basic symbols (like heart, peace, etc.) in Twemoji CDN do NOT use fe0f 
  // in the filename. However, complex ZWJ sequences (like flags with ZWJ) DO expect fe0f.
  // Rule: Strip fe0f if no 200d (ZWJ) is present in the sequence.
  if (!codePoints.includes('200d')) {
    return codePoints.filter(cp => cp !== 'fe0f').join('-');
  }
  
  return codePoints.join('-');
}

/**
 * Gets the SVG URL for a single emoji character.
 */
export function getEmojiUrl(emoji: string): string {
  if (!emoji) return '';
  
  // 1. Resolve shortcodes if passed as :shortcode:
  let unicode = emoji;
  if (emoji.startsWith(':') && emoji.endsWith(':')) {
    unicode = SHORTCODE_TO_UNICODE[emoji];
    
    // Fallback: If not in map but looks like a 2-letter flag (e.g., :ar: or :es:)
    if (!unicode) {
      const code = emoji.slice(1, -1).toUpperCase();
      if (code.length === 2 && /^[A-Z]{2}$/.test(code)) {
        // Convert country code back to regional indicators
        unicode = String.fromCodePoint(
          code.charCodeAt(0) - 65 + 0x1f1e6,
          code.charCodeAt(1) - 65 + 0x1f1e6
        );
      }
    }
    
    if (!unicode) return ''; 
  }

  // 2. Special case: Catalonia Flag
  if (unicode === '🏴󠁡󠁲󠁣󠁴󠁿' || emoji === ':cat_flag:') {
    return CATALONIA_FLAG_SVG;
  }

  // 3. Fallback to direct hex conversion if it's a unicode emoji
  const hex = getEmojiHex(unicode);
  if (!hex || hex === unicode) return ''; // Not a multi-byte emoji or failed

  // Use cdnjs as it's typically very stable
  return `https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/svg/${hex}.svg`;
}

/**
 * Returns a shortcode for an emoji, generating one for flags if missing.
 */
export function getShortcode(emoji: string): string {
  if (EMOJI_SHORTCODES[emoji]) return EMOJI_SHORTCODES[emoji];

  // Try to detect if it's a flag (regional indicator sequence)
  const hex = getEmojiHex(emoji);
  const parts = hex.split('-');
  
  // Regional Indicator Symbols are between 1F1E6 (A) and 1F1FF (Z)
  if (parts.length === 2 && parts.every(p => {
    const cp = parseInt(p, 16);
    return cp >= 0x1f1e6 && cp <= 0x1f1ff;
  })) {
    const countryCode = parts.map(p => String.fromCharCode(parseInt(p, 16) - 0x1f1e6 + 65)).join('').toLowerCase();
    return `:${countryCode}:`;
  }

  return emoji; // Fallback
}

/**
 * Parses a string and replaces both unicode emojis and :shortcodes: with Twemoji images.
 */
export function parseEmojis(text: string): string {
  if (!text) return '';

  // 1. Replace shortcodes first
  let processedText = text.replace(/:[a-z0-9_]+:/g, (match) => {
    const url = getEmojiUrl(match);
    if (url) {
      return `<img src="${url}" class="twemoji" alt="${match}" />`;
    }
    return match;
  });

  // 2a. Handle subdivision flags (🏴 + tag sequence) BEFORE general regex
  // Tag chars (U+E0020–U+E007F) encode as surrogate pairs: \uDB40 + \uDC20–\uDC7F
  const subdivisionFlagRegex = /\uD83C\uDFF4(?:\uDB40[\uDC20-\uDC7F])+/g;
  processedText = processedText.replace(subdivisionFlagRegex, (match) => {
    const url = getEmojiUrl(match);
    if (url) {
      // Use shortcode as alt (never raw emoji) to prevent emojiRegex matching inside the alt attribute
      const shortcode = EMOJI_SHORTCODES[match] || getShortcode(match);
      return `<img src="${url}" class="twemoji" alt="${shortcode}" />`;
    }
    return match;
  });

  // 2b. Map remaining unicode emojis to images — process TEXT segments only, never inside HTML tags
  // Splitting on (<tag>) keeps tags at odd indices; text is at even indices.
  const emojiRegex = /(\uD83C[\uDF00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|\uD83E[\uDD00-\uDFFF]|[\u2000-\u3300])/g;
  const segments = processedText.split(/(<[^>]*>)/);
  return segments.map((segment, i) => {
    // Odd indices are HTML tags — leave untouched
    if (i % 2 === 1) return segment;
    return segment.replace(emojiRegex, (match) => {
      const url = getEmojiUrl(match);
      if (url) {
        const shortcode = EMOJI_SHORTCODES[match] || match;
        return `<img src="${url}" class="twemoji" alt="${shortcode}" />`;
      }
      return match;
    });
  }).join('');
}
