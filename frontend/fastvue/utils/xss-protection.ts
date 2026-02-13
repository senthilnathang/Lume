/**
 * Comprehensive XSS Detection and Protection Module
 *
 * Provides 7-category XSS pattern detection matching enterprise security standards.
 * Used by the Security Provider and input validation throughout the application.
 *
 * Categories:
 * 1. Script-based XSS - script tags, javascript: URLs
 * 2. Event handler XSS - onclick, onerror, etc.
 * 3. HTML injection - iframe, object, embed, form
 * 4. Encoded XSS - URL encoded, HTML entities, Unicode
 * 5. Advanced XSS - dangerous function calls
 * 6. CSS-based XSS - expression(), javascript in CSS
 * 7. Protocol-based XSS - javascript:, vbscript:, data: URLs
 *
 * @module utils/xss-protection
 */

/**
 * Result of XSS detection analysis
 */
export interface XSSDetectionResult {
  /** Whether the input is clean (no threats detected) */
  isClean: boolean;
  /** List of threat categories detected */
  threats: string[];
  /** Overall risk level based on number and type of threats */
  riskLevel: 'low' | 'medium' | 'high';
  /** Detailed information about detected patterns */
  details: Array<{ category: string; pattern: string; match?: string }>;
}

/**
 * XSS detection patterns organized by category
 *
 * Each category contains patterns that detect specific types of XSS attacks
 */
const XSS_PATTERNS: Record<string, RegExp[]> = {
  // Category 1: Script-based XSS
  scriptBased: [
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    /<script\b[^>]*>/gi,
    /javascript\s*:/gi,
    /vbscript\s*:/gi,
    /data\s*:\s*text\/html/gi,
    /data\s*:\s*[^,]*;base64/gi,
  ],

  // Category 2: Event handler XSS
  eventHandlers: [
    /\bon\w+\s*=\s*["']?[^"'>]*/gi,
    /\bon(abort|blur|change|click|dblclick|error|focus|keydown|keypress|keyup|load|mousedown|mousemove|mouseout|mouseover|mouseup|reset|resize|select|submit|unload)\s*=/gi,
    /\bon(afterprint|beforeprint|beforeunload|hashchange|message|offline|online|pagehide|pageshow|popstate|storage)\s*=/gi,
    /\bon(animationstart|animationend|animationiteration|transitionend)\s*=/gi,
    /\bon(drag|dragend|dragenter|dragleave|dragover|dragstart|drop)\s*=/gi,
    /\bon(copy|cut|paste)\s*=/gi,
    /\bon(contextmenu|input|invalid|search|toggle)\s*=/gi,
  ],

  // Category 3: HTML injection
  htmlInjection: [
    /<iframe\b[^>]*>/gi,
    /<object\b[^>]*>/gi,
    /<embed\b[^>]*>/gi,
    /<form\b[^>]*action\s*=/gi,
    /<meta\b[^>]*http-equiv/gi,
    /<link\b[^>]*href\s*=\s*["']?javascript:/gi,
    /<base\b[^>]*href/gi,
    /<svg\b[^>]*onload/gi,
    /<math\b[^>]*>/gi,
    /<video\b[^>]*>/gi,
    /<audio\b[^>]*>/gi,
    /<source\b[^>]*onerror/gi,
    /<img\b[^>]*onerror/gi,
    /<body\b[^>]*onload/gi,
    /<input\b[^>]*onfocus/gi,
    /<marquee\b[^>]*onstart/gi,
    /<details\b[^>]*ontoggle/gi,
  ],

  // Category 4: Encoded XSS
  encodedXss: [
    /%3C\s*script/gi, // URL encoded <script
    /%3C\s*img/gi, // URL encoded <img
    /&#x0*3[Cc];/g, // HTML entity <
    /&#0*60;/g, // Decimal HTML entity <
    /&#x0*3[Ee];/g, // HTML entity >
    /&#0*62;/g, // Decimal HTML entity >
    /\\x3c/gi, // Hex escape <
    /\\x3e/gi, // Hex escape >
    /\\u003[cC]/g, // Unicode escape <
    /\\u003[eE]/g, // Unicode escape >
    /\\074/g, // Octal <
    /\\076/g, // Octal >
    /%00/g, // Null byte
    /\x00/g, // Literal null byte
  ],

  // Category 5: Advanced XSS (dangerous function patterns)
  advancedXss: [
    // Note: These patterns detect attempts to call dangerous JavaScript functions
    // They are detection patterns, not actual code execution
    /\beval\s*\(/gi,
    /setTimeout\s*\(\s*["'`]/gi,
    /setInterval\s*\(\s*["'`]/gi,
    /\bFunction\s*\(/gi,
    /new\s+Function\s*\(/gi,
    /document\s*\.\s*write\s*\(/gi,
    /document\s*\.\s*writeln\s*\(/gi,
    /window\s*\[\s*["'`]eval["'`]\s*\]/gi,
    /constructor\s*\(\s*["'`]/gi,
    /\.constructor\s*\.\s*constructor\s*\(/gi,
    /\bimport\s*\(/gi, // Dynamic import
  ],

  // Category 6: CSS-based XSS
  cssXss: [
    /expression\s*\(/gi,
    /url\s*\(\s*["']?\s*javascript:/gi,
    /-moz-binding\s*:/gi,
    /behavior\s*:\s*url/gi,
    /@import\s+["']?javascript:/gi,
    /style\s*=\s*["'][^"']*expression\s*\(/gi,
  ],

  // Category 7: Protocol-based XSS
  protocolXss: [
    /^javascript\s*:/i,
    /^vbscript\s*:/i,
    /^data\s*:\s*text\/html/i,
    /^data\s*:[^,]*;base64/i,
    /^livescript\s*:/i,
    /^mocha\s*:/i,
    /^ecmascript\s*:/i,
  ],
};

/**
 * Risk weights for different XSS categories
 * Higher weight = more dangerous
 */
const CATEGORY_WEIGHTS: Record<string, number> = {
  scriptBased: 10,
  eventHandlers: 8,
  htmlInjection: 7,
  advancedXss: 9,
  encodedXss: 6,
  cssXss: 5,
  protocolXss: 8,
};

/**
 * Detect XSS patterns in input string
 *
 * @param input - String to analyze for XSS patterns
 * @returns Detection result with threat categories, risk level, and details
 *
 * @example
 * ```ts
 * const result = detectXSS('<script>alert(1)</script>');
 * if (!result.isClean) {
 *   console.warn('XSS detected:', result.threats);
 * }
 * ```
 */
export function detectXSS(input: string): XSSDetectionResult {
  if (!input || typeof input !== 'string') {
    return {
      isClean: true,
      threats: [],
      riskLevel: 'low',
      details: [],
    };
  }

  const threats: string[] = [];
  const details: Array<{ category: string; pattern: string; match?: string }> =
    [];
  let totalWeight = 0;

  for (const [category, patterns] of Object.entries(XSS_PATTERNS)) {
    for (const pattern of patterns) {
      // Reset lastIndex for global patterns
      pattern.lastIndex = 0;
      const match = pattern.exec(input);

      if (match) {
        if (!threats.includes(category)) {
          threats.push(category);
          totalWeight += CATEGORY_WEIGHTS[category] || 5;
        }
        details.push({
          category,
          pattern: pattern.source,
          match: match[0].substring(0, 50), // Truncate long matches
        });
        break; // One match per category is enough
      }
    }
  }

  // Determine risk level based on total weight
  let riskLevel: 'low' | 'medium' | 'high' = 'low';
  if (totalWeight >= 15) {
    riskLevel = 'high';
  } else if (totalWeight >= 8) {
    riskLevel = 'medium';
  }

  return {
    isClean: threats.length === 0,
    threats,
    riskLevel,
    details,
  };
}

/**
 * Sanitize input for safe display (HTML entity encoding)
 *
 * This function encodes HTML special characters to prevent XSS
 * when displaying user input in the DOM.
 *
 * @param input - String to sanitize
 * @returns HTML-encoded string safe for display
 *
 * @example
 * ```ts
 * const safe = sanitizeForDisplay('<script>alert(1)</script>');
 * // Returns: '&lt;script&gt;alert(1)&lt;/script&gt;'
 * ```
 */
export function sanitizeForDisplay(input: string): string {
  if (!input || typeof input !== 'string') {
    return '';
  }

  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;')
    .replace(/`/g, '&#x60;');
}

/**
 * Remove potentially dangerous content from input
 *
 * Unlike sanitizeForDisplay which encodes, this function removes
 * dangerous patterns entirely. Use for inputs that shouldn't contain
 * any markup or code.
 *
 * @param input - String to clean
 * @returns Cleaned string with dangerous patterns removed
 *
 * @example
 * ```ts
 * const clean = stripDangerousContent('Hello <script>alert(1)</script> World');
 * // Returns: 'Hello  World'
 * ```
 */
export function stripDangerousContent(input: string): string {
  if (!input || typeof input !== 'string') {
    return '';
  }

  return (
    input
      // Remove script tags and content
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      // Remove style tags and content
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
      // Remove HTML comments
      .replace(/<!--[\s\S]*?-->/g, '')
      // Remove event handlers
      .replace(/\s*on\w+\s*=\s*["'][^"']*["']/gi, '')
      .replace(/\s*on\w+\s*=\s*[^\s>]+/gi, '')
      // Remove javascript: URLs
      .replace(/javascript\s*:/gi, '')
      // Remove dangerous tags
      .replace(
        /<(iframe|object|embed|form|input|button|textarea|select|meta|link|base)\b[^>]*>/gi,
        '',
      )
      // Remove closing tags for removed elements
      .replace(
        /<\/(iframe|object|embed|form|input|button|textarea|select|meta|link|base)>/gi,
        '',
      )
  );
}

/**
 * Validate and sanitize a URL
 *
 * Checks for dangerous protocols and ensures URL is safe to use.
 *
 * @param url - URL to validate
 * @param allowedProtocols - List of allowed protocols (default: http, https, mailto)
 * @returns Sanitized URL or null if unsafe
 *
 * @example
 * ```ts
 * const safeUrl = sanitizeUrl('javascript:alert(1)');
 * // Returns: null
 *
 * const goodUrl = sanitizeUrl('https://example.com');
 * // Returns: 'https://example.com'
 * ```
 */
export function sanitizeUrl(
  url: string,
  allowedProtocols: string[] = ['http', 'https', 'mailto'],
): string | null {
  if (!url || typeof url !== 'string') {
    return null;
  }

  // Trim and decode
  const cleanUrl = url.trim();

  // Check for dangerous protocols
  const dangerousProtocols = [
    /^javascript\s*:/i,
    /^vbscript\s*:/i,
    /^data\s*:/i,
    /^file\s*:/i,
    /^blob\s*:/i,
  ];

  for (const pattern of dangerousProtocols) {
    if (pattern.test(cleanUrl)) {
      return null;
    }
  }

  // Try to parse the URL
  try {
    const parsed = new URL(cleanUrl, window.location.origin);
    const protocol = parsed.protocol.replace(':', '').toLowerCase();

    // Check if protocol is allowed
    if (!allowedProtocols.includes(protocol)) {
      // Allow relative URLs
      if (cleanUrl.startsWith('/') || cleanUrl.startsWith('./')) {
        return cleanUrl;
      }
      return null;
    }

    return parsed.href;
  } catch {
    // If URL parsing fails, check if it's a relative URL
    if (cleanUrl.startsWith('/') || cleanUrl.startsWith('./')) {
      return cleanUrl;
    }
    return null;
  }
}

/**
 * Check if input contains any XSS threats (quick check)
 *
 * Faster than full detectXSS when you just need a boolean result.
 *
 * @param input - String to check
 * @returns true if input contains XSS patterns
 */
export function containsXSS(input: string): boolean {
  if (!input || typeof input !== 'string') {
    return false;
  }

  for (const patterns of Object.values(XSS_PATTERNS)) {
    for (const pattern of patterns) {
      pattern.lastIndex = 0;
      if (pattern.test(input)) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Get human-readable description of threat categories
 *
 * @param categories - Array of category names from detection result
 * @returns Human-readable descriptions
 */
export function getThreatDescriptions(categories: string[]): string[] {
  const descriptions: Record<string, string> = {
    scriptBased: 'Script injection detected (script tags, javascript: URLs)',
    eventHandlers: 'Event handler injection detected (onclick, onerror, etc.)',
    htmlInjection: 'HTML injection detected (iframe, object, embed, form)',
    encodedXss: 'Encoded XSS detected (URL encoding, HTML entities)',
    advancedXss: 'Advanced XSS detected (dangerous function calls)',
    cssXss: 'CSS-based XSS detected (expression, javascript in CSS)',
    protocolXss: 'Protocol-based XSS detected (javascript:, vbscript:, data:)',
  };

  return categories.map((cat) => descriptions[cat] || `Unknown threat: ${cat}`);
}
