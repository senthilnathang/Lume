/**
 * SFC Transformer - Vue Single File Component text transformation engine
 *
 * Applies view inheritance operations to SFC text BEFORE vue3-sfc-loader
 * compilation. All operations are pure string manipulation.
 *
 * Used by ModuleView.vue to apply view extensions declared in module
 * manifests via the view_inherits field.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface TemplateOp {
  target: string;
  position:
    | 'before'
    | 'after'
    | 'replace'
    | 'inside'
    | 'inside_first'
    | 'attributes';
  content?: string;
  attributes?: Record<string, string>;
}

export interface ViewExtensionSpec {
  template_ops?: TemplateOp[];
  setup_code?: string;
  imports?: string[];
  css?: string;
}

interface ParsedSFC {
  template: string;
  script: string;
  style: string;
  templateAttrs: string;
  scriptAttrs: string;
  styleAttrs: string;
  hasTemplate: boolean;
  hasScript: boolean;
  hasStyle: boolean;
}

interface ElementMatch {
  outerStart: number;
  outerEnd: number;
  outerHtml: string;
  innerStart: number;
  innerEnd: number;
  openingTag: string;
}

interface ParsedSelector {
  tag: string;
  attributes: Array<{ name: string; value: string }>;
  nthIndex?: number;
  id?: string;
}

// ---------------------------------------------------------------------------
// SFC Parsing
// ---------------------------------------------------------------------------

/**
 * Parse an SFC text string into its template, script, and style sections.
 */
export function parseSFC(sfcText: string): ParsedSFC {
  const result: ParsedSFC = {
    template: '',
    script: '',
    style: '',
    templateAttrs: '',
    scriptAttrs: '',
    styleAttrs: '',
    hasTemplate: false,
    hasScript: false,
    hasStyle: false,
  };

  const templateMatch = sfcText.match(
    /<template([^>]*)>([\s\S]*)<\/template>/i,
  );
  if (templateMatch) {
    result.templateAttrs = templateMatch[1]?.trim() || '';
    result.template = templateMatch[2] || '';
    result.hasTemplate = true;
  }

  const scriptMatch = sfcText.match(/<script([^>]*)>([\s\S]*?)<\/script>/i);
  if (scriptMatch) {
    result.scriptAttrs = scriptMatch[1]?.trim() || '';
    result.script = scriptMatch[2] || '';
    result.hasScript = true;
  }

  const styleMatch = sfcText.match(/<style([^>]*)>([\s\S]*?)<\/style>/i);
  if (styleMatch) {
    result.styleAttrs = styleMatch[1]?.trim() || '';
    result.style = styleMatch[2] || '';
    result.hasStyle = true;
  }

  return result;
}

/**
 * Reassemble an SFC from its parsed sections.
 */
export function assembleSFC(parsed: ParsedSFC): string {
  const parts: string[] = [];

  if (parsed.hasScript || parsed.script) {
    const attrs = parsed.scriptAttrs ? ` ${parsed.scriptAttrs}` : '';
    parts.push(`<script${attrs}>${parsed.script}</script>`);
  }

  if (parsed.hasTemplate || parsed.template) {
    const attrs = parsed.templateAttrs ? ` ${parsed.templateAttrs}` : '';
    parts.push(`<template${attrs}>${parsed.template}</template>`);
  }

  if (parsed.hasStyle || parsed.style) {
    const attrs = parsed.styleAttrs ? ` ${parsed.styleAttrs}` : '';
    parts.push(`<style${attrs}>${parsed.style}</style>`);
  }

  return parts.join('\n\n');
}

// ---------------------------------------------------------------------------
// Selector Parsing
// ---------------------------------------------------------------------------

/**
 * Parse a CSS-like selector into its components.
 *
 * Supported:
 *   TagName, Tag[attr="value"], Tag:nth(n), #id
 */
export function parseSelector(selector: string): ParsedSelector {
  const result: ParsedSelector = {
    tag: '',
    attributes: [],
  };

  let s = selector.trim();

  if (s.startsWith('#')) {
    const id = s.slice(1);
    result.tag = '*';
    result.id = id;
    result.attributes.push({ name: 'id', value: id });
    return result;
  }

  const nthMatch = s.match(/:nth\((\d+)\)$/);
  if (nthMatch) {
    result.nthIndex = parseInt(nthMatch[1]!, 10);
    s = s.replace(/:nth\(\d+\)$/, '');
  }

  const attrRegex = /\[([^\]=]+)=["']([^"']*)["']\]/g;
  let attrMatch;
  while ((attrMatch = attrRegex.exec(s)) !== null) {
    result.attributes.push({
      name: attrMatch[1]!.trim(),
      value: attrMatch[2]!,
    });
  }

  const tagMatch = s.match(/^([a-zA-Z][a-zA-Z0-9-]*)/);
  if (tagMatch) {
    result.tag = tagMatch[1]!;
  }

  return result;
}

// ---------------------------------------------------------------------------
// Element Finding
// ---------------------------------------------------------------------------

/**
 * Find an element in HTML text matching the given CSS-like selector.
 */
export function findElement(
  html: string,
  selector: string,
): ElementMatch | null {
  const parsed = parseSelector(selector);
  if (!parsed.tag) {
    console.warn(`[sfc-transformer] Invalid selector: "${selector}"`);
    return null;
  }

  const tagPattern =
    parsed.tag === '*'
      ? /<([a-zA-Z][a-zA-Z0-9-]*)\b([^>]*?)(\/)?\s*>/g
      : new RegExp(
          `<(${escapeRegex(parsed.tag)})\\b([^>]*?)(\\/)?>`,
          'g',
        );

  const matches: ElementMatch[] = [];
  let match;

  while ((match = tagPattern.exec(html)) !== null) {
    const matchedTag = match[1]!;
    const attrsStr = match[2] || '';
    const isSelfClosing = match[3] === '/';
    const openingTagFull = match[0]!;
    const openingStart = match.index;

    if (!attributesMatch(attrsStr, parsed.attributes)) {
      continue;
    }

    if (isSelfClosing) {
      const outerEnd = openingStart + openingTagFull.length;
      matches.push({
        outerStart: openingStart,
        outerEnd,
        outerHtml: openingTagFull,
        innerStart: outerEnd,
        innerEnd: outerEnd,
        openingTag: openingTagFull,
      });
    } else {
      const closingResult = findClosingTag(
        html,
        matchedTag,
        openingStart + openingTagFull.length,
      );
      if (closingResult) {
        const outerEnd = closingResult.end;
        matches.push({
          outerStart: openingStart,
          outerEnd,
          outerHtml: html.slice(openingStart, outerEnd),
          innerStart: openingStart + openingTagFull.length,
          innerEnd: closingResult.start,
          openingTag: openingTagFull,
        });
      }
    }
  }

  if (matches.length === 0) {
    return null;
  }

  if (parsed.nthIndex !== undefined) {
    const idx = parsed.nthIndex - 1;
    if (idx >= 0 && idx < matches.length) {
      return matches[idx]!;
    }
    return null;
  }

  return matches[0]!;
}

function attributesMatch(
  attrsStr: string,
  required: Array<{ name: string; value: string }>,
): boolean {
  if (required.length === 0) return true;

  for (const req of required) {
    const patterns = [
      new RegExp(
        `(?:^|\\s)${escapeRegex(req.name)}\\s*=\\s*["']${escapeRegex(req.value)}["']`,
      ),
      new RegExp(
        `(?:^|\\s):${escapeRegex(req.name)}\\s*=\\s*["']${escapeRegex(req.value)}["']`,
      ),
    ];

    const found = patterns.some((p) => p.test(attrsStr));
    if (!found) return false;
  }

  return true;
}

function findClosingTag(
  html: string,
  tagName: string,
  searchStart: number,
): { start: number; end: number } | null {
  const escapedTag = escapeRegex(tagName);
  const pattern = new RegExp(
    `<(/?)(${escapedTag})\\b([^>]*?)(\\/)?>`,
    'g',
  );
  pattern.lastIndex = searchStart;

  let depth = 1;
  let tagMatch;

  while ((tagMatch = pattern.exec(html)) !== null) {
    const isClosing = tagMatch[1] === '/';
    const isSelfClosing = tagMatch[4] === '/';

    if (isClosing) {
      depth--;
      if (depth === 0) {
        return {
          start: tagMatch.index,
          end: tagMatch.index + tagMatch[0].length,
        };
      }
    } else if (!isSelfClosing) {
      depth++;
    }
  }

  return null;
}

// ---------------------------------------------------------------------------
// Template Operations
// ---------------------------------------------------------------------------

/**
 * Apply a single template operation to template HTML.
 */
export function applyTemplateOp(templateHtml: string, op: TemplateOp): string {
  const match = findElement(templateHtml, op.target);

  if (!match) {
    console.warn(
      `[sfc-transformer] Selector "${op.target}" did not match any element. ` +
        `Operation skipped (position: ${op.position}).`,
    );
    return templateHtml;
  }

  switch (op.position) {
    case 'before':
      return (
        templateHtml.slice(0, match.outerStart) +
        (op.content || '') +
        templateHtml.slice(match.outerStart)
      );

    case 'after':
      return (
        templateHtml.slice(0, match.outerEnd) +
        (op.content || '') +
        templateHtml.slice(match.outerEnd)
      );

    case 'replace':
      return (
        templateHtml.slice(0, match.outerStart) +
        (op.content || '') +
        templateHtml.slice(match.outerEnd)
      );

    case 'inside':
      return (
        templateHtml.slice(0, match.innerEnd) +
        (op.content || '') +
        templateHtml.slice(match.innerEnd)
      );

    case 'inside_first':
      return (
        templateHtml.slice(0, match.innerStart) +
        (op.content || '') +
        templateHtml.slice(match.innerStart)
      );

    case 'attributes':
      if (op.attributes) {
        const newOpeningTag = mergeAttributes(match.openingTag, op.attributes);
        return (
          templateHtml.slice(0, match.outerStart) +
          newOpeningTag +
          templateHtml.slice(match.outerStart + match.openingTag.length)
        );
      }
      return templateHtml;

    default:
      console.warn(
        `[sfc-transformer] Unknown position: "${op.position}". Skipped.`,
      );
      return templateHtml;
  }
}

function mergeAttributes(
  openingTag: string,
  newAttrs: Record<string, string>,
): string {
  let tag = openingTag;

  for (const [name, value] of Object.entries(newAttrs)) {
    const existingPattern = new RegExp(
      `(\\s)${escapeRegex(name)}\\s*=\\s*["'][^"']*["']`,
    );
    const existingMatch = tag.match(existingPattern);

    if (existingMatch) {
      tag = tag.replace(existingMatch[0], `${existingMatch[1]}${name}="${value}"`);
    } else {
      const closeIdx = tag.lastIndexOf('>');
      const beforeClose = tag[closeIdx - 1] === '/' ? closeIdx - 1 : closeIdx;
      tag =
        tag.slice(0, beforeClose) +
        ` ${name}="${value}"` +
        tag.slice(beforeClose);
    }
  }

  return tag;
}

// ---------------------------------------------------------------------------
// Script Merging
// ---------------------------------------------------------------------------

/**
 * Merge extension script code into the parent script section.
 * imports[] are inserted after the last import statement.
 * setup_code is inserted after all imports.
 */
export function mergeScript(
  parentScript: string,
  ext: ViewExtensionSpec,
): string {
  let script = parentScript;

  // Match both single-line and multi-line imports:
  //   import { foo } from 'bar';            (single-line)
  //   import {\n  foo,\n  bar,\n} from 'bar';  (multi-line)
  //   import 'bar';                         (side-effect)
  const importRegex = /^import\s[\s\S]*?from\s+['"][^'"]+['"];?|^import\s+['"][^'"]+['"];?/gm;
  let lastImportEnd = 0;
  let importMatch;

  while ((importMatch = importRegex.exec(script)) !== null) {
    const end = importMatch.index + importMatch[0].length;
    if (end > lastImportEnd) {
      lastImportEnd = end;
    }
  }

  if (lastImportEnd === 0) {
    const defineMatch = script.match(/defineOptions\([^)]*\);?\s*\n/);
    if (defineMatch) {
      lastImportEnd = defineMatch.index! + defineMatch[0].length;
    }
  }

  // Inject imports right after the last import statement
  if (ext.imports && ext.imports.length > 0) {
    const importText =
      '\n\n// --- View Extension Imports ---\n' + ext.imports.join('\n') + '\n';
    script =
      script.slice(0, lastImportEnd) +
      importText +
      script.slice(lastImportEnd);
  }

  // Inject setup_code at the END of the script section so it can
  // reference variables declared by the parent (e.g. isEdit, employeeId)
  if (ext.setup_code) {
    const codeText =
      '\n\n// --- View Extension Code ---\n' + ext.setup_code + '\n';
    script = script + codeText;
  }

  return script;
}

// ---------------------------------------------------------------------------
// Style Merging
// ---------------------------------------------------------------------------

export function mergeStyle(parentStyle: string, css: string): string {
  if (!css || !css.trim()) return parentStyle;
  return parentStyle + '\n\n/* --- View Extension Styles --- */\n' + css;
}

// ---------------------------------------------------------------------------
// Main Entry Point
// ---------------------------------------------------------------------------

/**
 * Apply all view extensions to an SFC text string.
 *
 * This is the main entry point called by ModuleView.vue.
 * All operations are pure string transformations.
 *
 * @param sfcText - The original SFC text
 * @param extensions - Array of extension specs (from JSON files)
 * @returns Transformed SFC text ready for vue3-sfc-loader compilation
 */
export function applyViewExtensions(
  sfcText: string,
  extensions: ViewExtensionSpec[],
): string {
  const parsed = parseSFC(sfcText);

  for (const ext of extensions) {
    if (ext.template_ops && ext.template_ops.length > 0) {
      for (const op of ext.template_ops) {
        parsed.template = applyTemplateOp(parsed.template, op);
      }
    }

    if (ext.setup_code || (ext.imports && ext.imports.length > 0)) {
      parsed.script = mergeScript(parsed.script, ext);
    }

    if (ext.css && ext.css.trim()) {
      parsed.style = mergeStyle(parsed.style, ext.css);
      parsed.hasStyle = true;
    }
  }

  return assembleSFC(parsed);
}

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
