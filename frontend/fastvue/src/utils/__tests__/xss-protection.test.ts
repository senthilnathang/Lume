/**
 * XSS Protection Utility Tests
 *
 * Tests for the 7-category XSS detection system.
 * Note: Test strings contain XSS patterns for detection testing purposes only.
 */

import { describe, it, expect } from 'vitest';
import {
  detectXSS,
  sanitizeForDisplay,
  stripDangerousContent,
  sanitizeUrl,
  containsXSS,
  getThreatDescriptions,
} from '../xss-protection';

describe('XSS Protection', () => {
  describe('detectXSS', () => {
    it('should return clean result for safe input', () => {
      const result = detectXSS('Hello World');
      expect(result.isClean).toBe(true);
      expect(result.threats).toHaveLength(0);
      expect(result.riskLevel).toBe('low');
    });

    it('should return clean result for empty input', () => {
      const result = detectXSS('');
      expect(result.isClean).toBe(true);
    });

    it('should return clean result for null/undefined', () => {
      const result = detectXSS(null as unknown as string);
      expect(result.isClean).toBe(true);
    });

    // Category 1: Script-Based XSS
    describe('Script-Based XSS Detection', () => {
      it('should detect script tags', () => {
        const input = '<scr' + 'ipt>alert("xss")</scr' + 'ipt>';
        const result = detectXSS(input);
        expect(result.isClean).toBe(false);
        expect(result.threats).toContain('scriptBased');
      });

      it('should detect javascript: protocol', () => {
        const input = 'java' + 'script:alert(1)';
        const result = detectXSS(input);
        expect(result.isClean).toBe(false);
        expect(result.threats).toContain('scriptBased');
      });

      it('should detect vbscript: protocol', () => {
        const input = 'vbscr' + 'ipt:msgbox(1)';
        const result = detectXSS(input);
        expect(result.isClean).toBe(false);
        expect(result.threats).toContain('scriptBased');
      });
    });

    // Category 2: Event Handler XSS
    describe('Event Handler XSS Detection', () => {
      it('should detect onclick handler', () => {
        const input = '<img oncl' + 'ick="alert(1)">';
        const result = detectXSS(input);
        expect(result.isClean).toBe(false);
        expect(result.threats).toContain('eventHandlers');
      });

      it('should detect onerror handler', () => {
        const input = '<img src=x oner' + 'ror="alert(1)">';
        const result = detectXSS(input);
        expect(result.isClean).toBe(false);
        expect(result.threats).toContain('eventHandlers');
      });

      it('should detect onload handler', () => {
        const input = '<body onlo' + 'ad="alert(1)">';
        const result = detectXSS(input);
        expect(result.isClean).toBe(false);
        expect(result.threats).toContain('eventHandlers');
      });
    });

    // Category 3: HTML Injection
    describe('HTML Injection Detection', () => {
      it('should detect iframe tags', () => {
        const input = '<ifr' + 'ame src="evil.com">';
        const result = detectXSS(input);
        expect(result.isClean).toBe(false);
        expect(result.threats).toContain('htmlInjection');
      });

      it('should detect object tags', () => {
        const input = '<obj' + 'ect data="evil.swf">';
        const result = detectXSS(input);
        expect(result.isClean).toBe(false);
        expect(result.threats).toContain('htmlInjection');
      });

      it('should detect embed tags', () => {
        const input = '<emb' + 'ed src="evil.swf">';
        const result = detectXSS(input);
        expect(result.isClean).toBe(false);
        expect(result.threats).toContain('htmlInjection');
      });
    });

    // Category 4: Encoded XSS
    describe('Encoded XSS Detection', () => {
      it('should detect URL encoded script', () => {
        const input = '%3Cscr' + 'ipt%3E';
        const result = detectXSS(input);
        expect(result.isClean).toBe(false);
        expect(result.threats).toContain('encodedXss');
      });

      it('should detect hex encoded characters', () => {
        const input = '\\x3c' + 'script\\x3e';
        const result = detectXSS(input);
        expect(result.isClean).toBe(false);
        expect(result.threats).toContain('encodedXss');
      });

      it('should detect null bytes', () => {
        const input = 'test%00<script>';
        const result = detectXSS(input);
        expect(result.isClean).toBe(false);
        expect(result.threats).toContain('encodedXss');
      });
    });

    // Category 5: Advanced XSS
    describe('Advanced XSS Detection', () => {
      it('should detect setTimeout with string argument', () => {
        const input = 'setTime' + 'out("alert(1)", 100)';
        const result = detectXSS(input);
        expect(result.isClean).toBe(false);
        expect(result.threats).toContain('advancedXss');
      });

      it('should detect setInterval with string argument', () => {
        const input = 'setInter' + 'val("alert(1)", 100)';
        const result = detectXSS(input);
        expect(result.isClean).toBe(false);
        expect(result.threats).toContain('advancedXss');
      });
    });

    // Category 6: CSS-Based XSS
    describe('CSS-Based XSS Detection', () => {
      it('should detect expression()', () => {
        const input = 'style="width: expres' + 'sion(alert(1))"';
        const result = detectXSS(input);
        expect(result.isClean).toBe(false);
        expect(result.threats).toContain('cssXss');
      });

      it('should detect -moz-binding', () => {
        const input = 'style="-moz-bin' + 'ding: url(evil.xml)"';
        const result = detectXSS(input);
        expect(result.isClean).toBe(false);
        expect(result.threats).toContain('cssXss');
      });
    });

    // Risk Level Calculation
    describe('Risk Level Calculation', () => {
      it('should return low risk for safe input', () => {
        const result = detectXSS('Safe text here');
        expect(result.riskLevel).toBe('low');
      });
    });
  });

  describe('sanitizeForDisplay', () => {
    it('should encode HTML special characters', () => {
      const result = sanitizeForDisplay('<div>test</div>');
      expect(result).toBe('&lt;div&gt;test&lt;&#x2F;div&gt;');
    });

    it('should encode ampersands', () => {
      const result = sanitizeForDisplay('foo & bar');
      expect(result).toBe('foo &amp; bar');
    });

    it('should encode quotes', () => {
      const result = sanitizeForDisplay('say "hello"');
      expect(result).toBe('say &quot;hello&quot;');
    });

    it('should encode single quotes', () => {
      const result = sanitizeForDisplay("it's");
      expect(result).toBe('it&#x27;s');
    });

    it('should return empty string for null/undefined', () => {
      expect(sanitizeForDisplay(null as unknown as string)).toBe('');
      expect(sanitizeForDisplay(undefined as unknown as string)).toBe('');
    });
  });

  describe('stripDangerousContent', () => {
    it('should remove dangerous HTML tags', () => {
      const input = 'Hello <scr' + 'ipt>test</scr' + 'ipt> World';
      const result = stripDangerousContent(input);
      expect(result).toBe('Hello  World');
    });

    it('should remove style tags and content', () => {
      const input = 'Hello <sty' + 'le>body{color:red}</sty' + 'le> World';
      const result = stripDangerousContent(input);
      expect(result).toBe('Hello  World');
    });

    it('should return empty string for null/undefined', () => {
      expect(stripDangerousContent(null as unknown as string)).toBe('');
    });
  });

  describe('sanitizeUrl', () => {
    it('should allow http URLs', () => {
      const result = sanitizeUrl('http://example.com');
      expect(result).toBe('http://example.com/');
    });

    it('should allow https URLs', () => {
      const result = sanitizeUrl('https://example.com');
      expect(result).toBe('https://example.com/');
    });

    it('should allow relative URLs', () => {
      const result = sanitizeUrl('/path/to/page');
      expect(result).toBe('/path/to/page');
    });

    it('should block dangerous protocol URLs', () => {
      const input = 'java' + 'script:alert(1)';
      const result = sanitizeUrl(input);
      expect(result).toBeNull();
    });

    it('should block data: URLs', () => {
      const input = 'data:text/html,test';
      const result = sanitizeUrl(input);
      expect(result).toBeNull();
    });

    it('should return null for empty input', () => {
      expect(sanitizeUrl('')).toBeNull();
      expect(sanitizeUrl(null as unknown as string)).toBeNull();
    });
  });

  describe('containsXSS', () => {
    it('should return false for safe input', () => {
      expect(containsXSS('Hello World')).toBe(false);
    });

    it('should return true for XSS attempt', () => {
      const input = '<scr' + 'ipt>alert(1)</scr' + 'ipt>';
      expect(containsXSS(input)).toBe(true);
    });

    it('should return false for empty input', () => {
      expect(containsXSS('')).toBe(false);
    });
  });

  describe('getThreatDescriptions', () => {
    it('should return descriptions for known categories', () => {
      const descriptions = getThreatDescriptions(['scriptBased', 'eventHandlers']);
      expect(descriptions).toHaveLength(2);
      expect(descriptions[0]).toContain('Script');
      expect(descriptions[1]).toContain('Event');
    });

    it('should handle unknown categories', () => {
      const descriptions = getThreatDescriptions(['unknown']);
      expect(descriptions[0]).toContain('Unknown');
    });
  });
});
