/**
 * @fileoverview ExpressionEvaluator - Safe AST-based expression evaluator for ABAC rules
 * Parses condition strings into AST and evaluates safely (no dynamic code execution)
 */

import logger from '../services/logger.js';

class ExpressionEvaluator {
  /**
   * Evaluate an expression string against a context
   * @param {string} expression - Expression (e.g., "user.role == 'manager' AND data.status == 'open'")
   * @param {Object} context - Context object { user, data, now }
   * @returns {Promise<boolean>}
   */
  async evaluate(expression, context) {
    try {
      // Tokenize and parse
      const ast = this.parse(expression);

      // Evaluate AST
      return this.evaluateAst(ast, context);
    } catch (error) {
      logger.error('[ExpressionEvaluator] Error:', error.message);
      throw error;
    }
  }

  /**
   * Parse expression into AST
   * @private
   * @param {string} expr - Expression string
   * @returns {Object} AST node
   */
  parse(expr) {
    const tokens = this.tokenize(expr);
    return this.parseTokens(tokens);
  }

  /**
   * Tokenize expression string
   * @private
   * @param {string} expr - Expression string
   * @returns {Object[]} Tokens
   */
  tokenize(expr) {
    const tokens = [];
    let i = 0;

    while (i < expr.length) {
      const char = expr[i];

      // Skip whitespace
      if (/\s/.test(char)) {
        i++;
        continue;
      }

      // Operators
      if (expr.substr(i, 2) === '==') {
        tokens.push({ type: 'OPERATOR', value: '==' });
        i += 2;
      } else if (expr.substr(i, 2) === '!=') {
        tokens.push({ type: 'OPERATOR', value: '!=' });
        i += 2;
      } else if (expr.substr(i, 2) === '<=') {
        tokens.push({ type: 'OPERATOR', value: '<=' });
        i += 2;
      } else if (expr.substr(i, 2) === '>=') {
        tokens.push({ type: 'OPERATOR', value: '>=' });
        i += 2;
      } else if (char === '<') {
        tokens.push({ type: 'OPERATOR', value: '<' });
        i++;
      } else if (char === '>') {
        tokens.push({ type: 'OPERATOR', value: '>' });
        i++;
      } else if (expr.substr(i, 3) === 'AND') {
        tokens.push({ type: 'LOGICAL', value: 'AND' });
        i += 3;
      } else if (expr.substr(i, 2) === 'OR') {
        tokens.push({ type: 'LOGICAL', value: 'OR' });
        i += 2;
      } else if (expr.substr(i, 3) === 'NOT') {
        tokens.push({ type: 'LOGICAL', value: 'NOT' });
        i += 3;
      } else if (char === '(') {
        tokens.push({ type: 'LPAREN', value: '(' });
        i++;
      } else if (char === ')') {
        tokens.push({ type: 'RPAREN', value: ')' });
        i++;
      } else if (char === '"' || char === "'") {
        // String literal
        const quote = char;
        let j = i + 1;
        while (j < expr.length && expr[j] !== quote) {
          if (expr[j] === '\\') j++; // Skip escaped chars
          j++;
        }
        tokens.push({
          type: 'STRING',
          value: expr.substring(i + 1, j),
        });
        i = j + 1;
      } else if (/\d/.test(char)) {
        // Number
        let j = i;
        while (j < expr.length && /[\d.]/.test(expr[j])) {
          j++;
        }
        tokens.push({
          type: 'NUMBER',
          value: parseFloat(expr.substring(i, j)),
        });
        i = j;
      } else if (/[a-zA-Z_]/.test(char)) {
        // Identifier (e.g., user.role)
        let j = i;
        while (j < expr.length && /[a-zA-Z0-9_.!]/.test(expr[j])) {
          j++;
        }
        const ident = expr.substring(i, j);
        tokens.push({ type: 'IDENTIFIER', value: ident });
        i = j;
      } else {
        throw new Error(`Unknown character: ${char}`);
      }
    }

    return tokens;
  }

  /**
   * Parse tokens into AST
   * @private
   * @param {Object[]} tokens - Tokens
   * @returns {Object} AST node
   */
  parseTokens(tokens) {
    let pos = 0;

    const parseExpression = () => {
      let left = parseLogicalOr();
      return left;
    };

    const parseLogicalOr = () => {
      let left = parseLogicalAnd();

      while (pos < tokens.length && tokens[pos].type === 'LOGICAL' && tokens[pos].value === 'OR') {
        pos++; // consume OR
        const right = parseLogicalAnd();
        left = {
          type: 'LOGICAL_OR',
          left,
          right,
        };
      }

      return left;
    };

    const parseLogicalAnd = () => {
      let left = parseComparison();

      while (pos < tokens.length && tokens[pos].type === 'LOGICAL' && tokens[pos].value === 'AND') {
        pos++; // consume AND
        const right = parseComparison();
        left = {
          type: 'LOGICAL_AND',
          left,
          right,
        };
      }

      return left;
    };

    const parseComparison = () => {
      let left = parsePrimary();

      if (pos < tokens.length && tokens[pos].type === 'OPERATOR') {
        const op = tokens[pos].value;
        pos++; // consume operator
        const right = parsePrimary();
        return {
          type: 'COMPARISON',
          operator: op,
          left,
          right,
        };
      }

      return left;
    };

    const parsePrimary = () => {
      const token = tokens[pos];

      if (!token) throw new Error('Unexpected end of expression');

      if (token.type === 'LPAREN') {
        pos++; // consume (
        const expr = parseExpression();
        if (tokens[pos]?.type !== 'RPAREN') throw new Error('Expected )');
        pos++; // consume )
        return expr;
      }

      if (token.type === 'LOGICAL' && token.value === 'NOT') {
        pos++; // consume NOT
        const expr = parsePrimary();
        return {
          type: 'LOGICAL_NOT',
          expr,
        };
      }

      if (token.type === 'IDENTIFIER') {
        const value = token.value;
        pos++;
        return {
          type: 'IDENTIFIER',
          value,
        };
      }

      if (token.type === 'STRING') {
        const value = token.value;
        pos++;
        return {
          type: 'STRING',
          value,
        };
      }

      if (token.type === 'NUMBER') {
        const value = token.value;
        pos++;
        return {
          type: 'NUMBER',
          value,
        };
      }

      throw new Error(`Unexpected token: ${token.type} ${token.value}`);
    };

    return parseExpression();
  }

  /**
   * Evaluate AST node
   * @private
   * @param {Object} node - AST node
   * @param {Object} context - Context { user, data, now }
   * @returns {boolean}
   */
  evaluateAst(node, context) {
    if (node.type === 'LOGICAL_OR') {
      return this.evaluateAst(node.left, context) || this.evaluateAst(node.right, context);
    }

    if (node.type === 'LOGICAL_AND') {
      return this.evaluateAst(node.left, context) && this.evaluateAst(node.right, context);
    }

    if (node.type === 'LOGICAL_NOT') {
      return !this.evaluateAst(node.expr, context);
    }

    if (node.type === 'COMPARISON') {
      const left = this.evaluateAst(node.left, context);
      const right = this.evaluateAst(node.right, context);

      switch (node.operator) {
        case '==':
          return left === right;
        case '!=':
          return left !== right;
        case '<':
          return left < right;
        case '>':
          return left > right;
        case '<=':
          return left <= right;
        case '>=':
          return left >= right;
        default:
          throw new Error(`Unknown operator: ${node.operator}`);
      }
    }

    if (node.type === 'IDENTIFIER') {
      // Resolve identifier from context
      return this.resolveIdentifier(node.value, context);
    }

    if (node.type === 'STRING') {
      return node.value;
    }

    if (node.type === 'NUMBER') {
      return node.value;
    }

    throw new Error(`Unknown node type: ${node.type}`);
  }

  /**
   * Resolve identifier from context (e.g., "user.role", "data.status")
   * @private
   * @param {string} ident - Identifier (dot-separated path)
   * @param {Object} context - Context
   * @returns {*}
   */
  resolveIdentifier(ident, context) {
    const parts = ident.split('.');
    let value = context;

    for (const part of parts) {
      if (value === null || value === undefined) {
        return undefined;
      }
      value = value[part];
    }

    return value;
  }
}

export default ExpressionEvaluator;
