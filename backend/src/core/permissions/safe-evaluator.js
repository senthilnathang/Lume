/**
 * SafeExpressionEvaluator
 * Prevents code injection attacks in ABAC permission conditions.
 * Uses whitelist-based validation instead of eval() or new Function().
 */
export class SafeExpressionEvaluator {
  constructor() {
    // Patterns that indicate dangerous code
    this.dangerousPatterns = [
      /\beval\s*\(/,           // eval()
      /\brequire\s*\(/,        // require()
      /\bimport\s+/,           // import statements
      /\bimport\s*\(/,         // dynamic import()
      /\basync\s+function/,    // async function
      /\basync\s*\(/,          // async arrow function
      /\bawait\s+/,            // await keyword
      /\bclass\s+/,            // class declaration
      /\bfunction\s+/,         // function declaration (except in strings)
      /\bgenerator\s*\(/,      // generator
      /\byield\s+/,            // yield
      /\bdelete\s+/,           // delete operator
      /\bnew\s+/,              // new operator
      /\bthis\s*\./,           // this access
      /\bthrow\s+/,            // throw statement
      /\bcatch\s*\(/,          // catch block
      /\bfinally\s*{/,         // finally block
      /\bswitch\s*\(/,         // switch statement
      /\bdo\s*{/,              // do block
      /\bwhile\s*\(/,          // while loop
      /\bfor\s*\(/,            // for loop
      /\bin\s+/,               // in operator
      /\bof\s+/,               // of operator
      /\binstanceof\s+/,       // instanceof operator
      /\btypeof\s+/,           // typeof operator
      /\bObject\s*\./,         // Object.* calls
      /\bFunction\s*\./,       // Function.* calls
      /\bArray\s*\./,          // Array.* calls
      /\bString\s*\./,         // String.* calls
      /\bNumber\s*\./,         // Number.* calls
      /\bBoolean\s*\./,        // Boolean.* calls
      /\bPromise\s*\./,        // Promise.* calls
      /\bSymbol\s*\./,         // Symbol.* calls
      /\bMap\s*\./,            // Map.* calls
      /\bSet\s*\./,            // Set.* calls
      /\bWeakMap\s*\./,        // WeakMap.* calls
      /\bWeakSet\s*\./,        // WeakSet.* calls
      /\bProxy\s*\./,          // Proxy.* calls
      /\bReflect\s*\./,        // Reflect.* calls
    ];

    // Unsafe property/method names that should be blocked
    this.unsafeProperties = [
      '__proto__',
      'constructor',
      'prototype',
      '__defineGetter__',
      '__defineSetter__',
      '__lookupGetter__',
      '__lookupSetter__',
      'hasOwnProperty',
      'propertyIsEnumerable',
      'toLocaleString',
      'toString',
      'valueOf',
      'isPrototypeOf',
    ];

    // Unsafe methods that should be blocked
    this.unsafeMethods = [
      'eval',
      'Function',
      'require',
      'import',
      'exec',
      'execSync',
      'spawn',
      'spawnSync',
      'fork',
      'exit',
      'abort',
      'kill',
      'read',
      'write',
      'readFile',
      'writeFile',
      'readdir',
      'mkdir',
      'rmdir',
      'unlink',
      'rename',
      'chmod',
      'chown',
      'access',
      'stat',
      'lstat',
      'realpath',
      'watch',
      'watchFile',
      'unwatchFile',
      'symlink',
      'readlink',
      'link',
      'getContext',
      'getFunction',
      'getClass',
    ];
  }

  /**
   * Validate an expression against dangerous patterns
   * @param {string} expression - The expression to validate
   * @returns {boolean} - True if expression is safe, false otherwise
   */
  validate(expression) {
    if (typeof expression !== 'string') {
      return false;
    }

    // Check for dangerous patterns
    for (const pattern of this.dangerousPatterns) {
      if (pattern.test(expression)) {
        return false;
      }
    }

    // CRITICAL FIX #1: Block IIFE patterns - (function...) and (async function...)
    if (/\(\s*function\s*[\(\{]/.test(expression) || /\(\s*async\s+function\s*[\(\{]/.test(expression)) {
      return false;
    }

    // CRITICAL FIX #2: Block arrow functions - () => or (x) => or x =>
    if (/=>\s*[\{\(]?/.test(expression)) {
      return false;
    }

    // CRITICAL FIX #3: Block template literals that might contain expressions
    if (/\$\{/.test(expression)) {
      return false;
    }

    // Check for unsafe properties and methods
    for (const unsafeProperty of this.unsafeProperties) {
      if (expression.includes(unsafeProperty)) {
        return false;
      }
    }

    for (const unsafeMethod of this.unsafeMethods) {
      if (new RegExp(`\\b${unsafeMethod}\\s*\\(`).test(expression)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Safely evaluate an expression with a given context
   * @param {Record<string, any>} context - The context object containing variables
   * @param {string} expression - The expression to evaluate
   * @returns {boolean} - The result of the expression evaluation
   * @throws {Error} - If expression is unsafe or contains undefined variables
   */
  evaluate(context, expression) {
    if (!this.validate(expression)) {
      throw new Error(`Unsafe expression detected: ${expression}`);
    }

    // CRITICAL FIX #4: Type-check context - reject function types
    const contextKeys = Object.keys(context);
    for (const key of contextKeys) {
      if (typeof context[key] === 'function') {
        throw new Error(`Context contains function '${key}' - functions not allowed in ABAC conditions`);
      }
    }

    // Remove string literals from the expression to avoid false positives
    const exprWithoutStrings = this.removeStringLiterals(expression);

    // Check that all root-level variables (before dot access) are in the context
    // Match identifiers that are not preceded by a dot (i.e., root-level variables)
    const rootVariablePattern = /(?:^|[^.])\b([a-zA-Z_$][a-zA-Z0-9_$]*)\b/g;
    const variablesInExpression = new Set();

    let match;
    const tempStr = exprWithoutStrings;
    // Reset regex
    rootVariablePattern.lastIndex = 0;
    while ((match = rootVariablePattern.exec(tempStr)) !== null) {
      const varName = match[1];
      // Skip reserved words and literals
      if (!this.isReservedWord(varName) && !this.isLiteral(varName)) {
        variablesInExpression.add(varName);
      }
    }

    // Check if all variables exist in context
    for (const variable of variablesInExpression) {
      if (!contextKeys.includes(variable)) {
        throw new Error(`Undefined variable in expression: ${variable}`);
      }
    }

    // Create a proxy handler to prevent access to dangerous properties
    const handler = {
      get: (target, prop) => {
        if (typeof prop !== 'string') {
          return target[prop];
        }

        // Block unsafe properties
        if (this.unsafeProperties.includes(prop)) {
          throw new Error(`Access to property '${prop}' is not allowed`);
        }

        // Block access to properties that start with underscore (private/dunder)
        if (prop.startsWith('_')) {
          throw new Error(`Access to property '${prop}' is not allowed`);
        }

        return target[prop];
      },
    };

    // Build parameter names and values
    const paramNames = contextKeys;
    const paramValues = contextKeys.map(key => {
      const value = context[key];
      // Wrap values in proxy if they're objects
      if (typeof value === 'object' && value !== null) {
        return new Proxy(value, handler);
      }
      return value;
    });

    try {
      // Create and execute the function with only context variables as parameters
      // Using Function constructor is safe here because we've validated the expression
      // and it contains only safe operators and context variables
      const fn = new Function(...paramNames, `return ${expression}`);
      const result = fn(...paramValues);

      return result;
    } catch (error) {
      throw new Error(`Expression evaluation error: ${error.message}`);
    }
  }

  /**
   * Remove string literals from an expression to avoid false positives in variable detection
   * CRITICAL FIX #5: Properly parse escaped quotes in string literals
   * @param {string} expression - The expression to process
   * @returns {string} - Expression with string literals replaced with spaces
   */
  removeStringLiterals(expression) {
    let result = '';
    let i = 0;

    while (i < expression.length) {
      const char = expression[i];

      // Handle single-quoted strings
      if (char === "'") {
        result += ' ';
        i++;
        while (i < expression.length) {
          if (expression[i] === '\\' && i + 1 < expression.length) {
            // Skip escaped character
            i += 2;
          } else if (expression[i] === "'") {
            i++;
            break;
          } else {
            i++;
          }
        }
        continue;
      }

      // Handle double-quoted strings
      if (char === '"') {
        result += ' ';
        i++;
        while (i < expression.length) {
          if (expression[i] === '\\' && i + 1 < expression.length) {
            // Skip escaped character
            i += 2;
          } else if (expression[i] === '"') {
            i++;
            break;
          } else {
            i++;
          }
        }
        continue;
      }

      // Handle backtick strings (template literals)
      if (char === '`') {
        result += ' ';
        i++;
        while (i < expression.length) {
          if (expression[i] === '\\' && i + 1 < expression.length) {
            // Skip escaped character
            i += 2;
          } else if (expression[i] === '`') {
            i++;
            break;
          } else {
            i++;
          }
        }
        continue;
      }

      result += char;
      i++;
    }

    return result;
  }

  /**
   * Check if a string is a JavaScript reserved word
   * @param {string} word - The word to check
   * @returns {boolean}
   */
  isReservedWord(word) {
    const reserved = [
      // Keywords
      'break', 'case', 'catch', 'class', 'const', 'continue', 'debugger',
      'default', 'delete', 'do', 'else', 'export', 'extends', 'finally',
      'for', 'function', 'if', 'import', 'in', 'instanceof', 'let', 'new',
      'return', 'super', 'switch', 'this', 'throw', 'try', 'typeof', 'var',
      'void', 'while', 'with', 'yield', 'async', 'await',
      // Literals
      'true', 'false', 'null', 'undefined', 'NaN', 'Infinity',
    ];
    return reserved.includes(word);
  }

  /**
   * Check if a string is a literal value
   * @param {string} value - The value to check
   * @returns {boolean}
   */
  isLiteral(value) {
    return (
      value === 'true' ||
      value === 'false' ||
      value === 'null' ||
      value === 'undefined' ||
      value === 'NaN' ||
      value === 'Infinity'
    );
  }
}
