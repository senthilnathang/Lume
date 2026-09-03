const MAX_EXPRESSION_LENGTH = 2000;
const MAX_EVAL_DEPTH = 50;

const FUNCTIONS = {
  CONCAT: (...args) => args.map((a) => (a === null || a === undefined ? '' : String(a))).join(''),
  UPPER: (s) => String(s ?? '').toUpperCase(),
  LOWER: (s) => String(s ?? '').toLowerCase(),
  TRIM: (s) => String(s ?? '').trim(),
  LEN: (s) => String(s ?? '').length,
  ROUND: (n, d = 0) => {
    const num = Number(n);
    if (!Number.isFinite(num)) return null;
    const factor = 10 ** Math.max(0, Math.min(10, Math.trunc(Number(d) || 0)));
    return Math.round(num * factor) / factor;
  },
  FLOOR: (n) => (Number.isFinite(Number(n)) ? Math.floor(Number(n)) : null),
  CEIL: (n) => (Number.isFinite(Number(n)) ? Math.ceil(Number(n)) : null),
  ABS: (n) => (Number.isFinite(Number(n)) ? Math.abs(Number(n)) : null),
  IF: (cond, a, b) => (isTruthy(cond) ? a : b),
};

function isTruthy(v) {
  return !(v === null || v === undefined || v === false || v === 0 || v === '' || Number.isNaN(v));
}

function tokenize(expr) {
  const tokens = [];
  let i = 0;
  while (i < expr.length) {
    const ch = expr[i];
    if (/\s/.test(ch)) { i += 1; continue; }
    if (ch === '{') {
      const end = expr.indexOf('}', i + 1);
      if (end === -1) throw new Error('Unclosed field reference');
      const name = expr.slice(i + 1, end).trim();
      if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(name)) throw new Error(`Invalid field reference: ${name}`);
      tokens.push({ type: 'ref', name });
      i = end + 1;
      continue;
    }
    if (ch === '"' || ch === "'") {
      let j = i + 1;
      let out = '';
      while (j < expr.length && expr[j] !== ch) {
        if (expr[j] === '\\' && j + 1 < expr.length) { out += expr[j + 1]; j += 2; } else { out += expr[j]; j += 1; }
      }
      if (j >= expr.length) throw new Error('Unterminated string literal');
      tokens.push({ type: 'string', value: out });
      i = j + 1;
      continue;
    }
    if (/[0-9.]/.test(ch)) {
      const m = expr.slice(i).match(/^[0-9]+(\.[0-9]+)?/);
      if (!m) throw new Error(`Invalid number at position ${i}`);
      tokens.push({ type: 'number', value: Number(m[0]) });
      i += m[0].length;
      continue;
    }
    if (/[A-Za-z_]/.test(ch)) {
      const m = expr.slice(i).match(/^[A-Za-z_][A-Za-z0-9_]*/);
      tokens.push({ type: 'ident', value: m[0].toUpperCase() });
      i += m[0].length;
      continue;
    }
    const two = expr.slice(i, i + 2);
    if (['>=', '<=', '==', '!='].includes(two)) { tokens.push({ type: 'op', value: two }); i += 2; continue; }
    if ('+-*/%(),><'.includes(ch)) { tokens.push({ type: ch === '(' || ch === ')' || ch === ',' ? ch : 'op', value: ch }); i += 1; continue; }
    throw new Error(`Unexpected character: ${ch}`);
  }
  return tokens;
}

function parse(tokens) {
  let pos = 0;
  const peek = () => tokens[pos];
  const consume = () => tokens[pos++];

  function parseExpr() { return parseComparison(); }
  function parseComparison() {
    let left = parseAdd();
    const t = peek();
    if (t && t.type === 'op' && ['>', '<', '>=', '<=', '==', '!='].includes(t.value)) {
      consume();
      const right = parseAdd();
      return { kind: 'binop', op: t.value, left, right };
    }
    return left;
  }
  function parseAdd() {
    let node = parseMul();
    for (;;) {
      const t = peek();
      if (t && t.type === 'op' && (t.value === '+' || t.value === '-')) {
        consume();
        node = { kind: 'binop', op: t.value, left: node, right: parseMul() };
      } else return node;
    }
  }
  function parseMul() {
    let node = parseUnary();
    for (;;) {
      const t = peek();
      if (t && t.type === 'op' && (t.value === '*' || t.value === '/' || t.value === '%')) {
        consume();
        node = { kind: 'binop', op: t.value, left: node, right: parseUnary() };
      } else return node;
    }
  }
  function parseUnary() {
    const t = peek();
    if (t && t.type === 'op' && t.value === '-') { consume(); return { kind: 'neg', expr: parseUnary() }; }
    return parsePrimary();
  }
  function parsePrimary() {
    const t = consume();
    if (!t) throw new Error('Unexpected end of expression');
    if (t.type === 'number' || t.type === 'string') return { kind: 'lit', value: t.value };
    if (t.type === 'ref') return { kind: 'ref', name: t.name };
    if (t.type === '(') {
      const e = parseExpr();
      const c = consume();
      if (!c || c.type !== ')') throw new Error('Expected closing parenthesis');
      return e;
    }
    if (t.type === 'ident') {
      const fn = FUNCTIONS[t.value];
      if (!fn) throw new Error(`Unknown function: ${t.value}`);
      const open = consume();
      if (!open || open.type !== '(') throw new Error(`Expected ( after ${t.value}`);
      const args = [];
      if (peek() && peek().type !== ')') {
        for (;;) {
          args.push(parseExpr());
          const n = peek();
          if (n && n.type === ',') { consume(); } else break;
        }
      }
      const close = consume();
      if (!close || close.type !== ')') throw new Error(`Expected ) to close ${t.value}`);
      return { kind: 'call', name: t.value, args };
    }
    throw new Error(`Unexpected token: ${t.value}`);
  }

  const ast = parseExpr();
  if (pos < tokens.length) throw new Error(`Unexpected trailing input: ${tokens[pos].value}`);
  return ast;
}

function evaluate(node, record, depth = 0) {
  if (depth > MAX_EVAL_DEPTH) throw new Error('Formula too deeply nested');
  switch (node.kind) {
    case 'lit': return node.value;
    case 'ref': {
      const v = record?.[node.name];
      return v === undefined ? null : v;
    }
    case 'neg': {
      const v = evaluate(node.expr, record, depth + 1);
      if (v === null) return null;
      const n = Number(v);
      return Number.isFinite(n) ? -n : null;
    }
    case 'call': {
      const args = node.args.map((a) => evaluate(a, record, depth + 1));
      return FUNCTIONS[node.name](...args);
    }
    case 'binop': {
      const l = evaluate(node.left, record, depth + 1);
      const r = evaluate(node.right, record, depth + 1);
      switch (node.op) {
        case '+':
          if (typeof l === 'string' || typeof r === 'string') {
            if (l === null || r === null) return null;
            return String(l) + String(r);
          }
          if (l === null || r === null) return null;
          return Number(l) + Number(r);
        case '-': case '*': case '/': case '%': {
          if (l === null || r === null) return null;
          const a = Number(l);
          const b = Number(r);
          if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
          if (node.op === '-') return a - b;
          if (node.op === '*') return a * b;
          if (node.op === '/' || node.op === '%') {
            if (b === 0) return null;
            return node.op === '/' ? a / b : a % b;
          }
          return null;
        }
        case '>': return l !== null && r !== null && Number(l) > Number(r);
        case '<': return l !== null && r !== null && Number(l) < Number(r);
        case '>=': return l !== null && r !== null && Number(l) >= Number(r);
        case '<=': return l !== null && r !== null && Number(l) <= Number(r);
        case '==': return l === r || String(l) === String(r);
        case '!=': return !(l === r || String(l) === String(r));
        default: return null;
      }
    }
    default: return null;
  }
}

export function evaluateFormula(expression, record = {}) {
  if (typeof expression !== 'string' || !expression.trim()) {
    throw new Error('Formula expression must be a non-empty string');
  }
  if (expression.length > MAX_EXPRESSION_LENGTH) {
    throw new Error(`Formula exceeds ${MAX_EXPRESSION_LENGTH} characters`);
  }
  const ast = parse(tokenize(expression));
  return evaluate(ast, record);
}

export function computeFormulaFields(fields, data) {
  const result = { ...data };
  for (const field of fields || []) {
    if (field && field.formulaExpression) {
      try {
        result[field.name] = evaluateFormula(field.formulaExpression, result);
      } catch {
        result[field.name] = null;
      }
    }
  }
  return result;
}

export function isFormulaField(field) {
  return !!(field && field.formulaExpression);
}

export default { evaluateFormula, computeFormulaFields, isFormulaField };
