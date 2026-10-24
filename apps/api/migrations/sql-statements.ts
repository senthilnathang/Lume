/** Split mysql scripts without splitting strings or stored-program bodies. */
export function sqlStatements(source: string): string[] {
  const result: string[] = [];
  let delimiter = ';', buffer = '', quote = '', lineComment = false, blockComment = false;
  for (let i = 0; i < source.length;) {
    const ch = source[i], next = source[i + 1];
    if (lineComment) {
      if (ch === '\n') { lineComment = false; buffer += '\n'; }
      i++; continue;
    }
    if (blockComment) {
      if (ch === '*' && next === '/') { blockComment = false; buffer += ' '; i += 2; }
      else i++;
      continue;
    }
    if (quote) {
      buffer += ch; i++;
      if (ch === '\\' && quote !== '\x60' && i < source.length) { buffer += source[i++]; continue; }
      if (ch === quote) {
        if (source[i] === quote) buffer += source[i++];
        else quote = '';
      }
      continue;
    }
    if ((i === 0 || source[i - 1] === '\n') && /^\s*DELIMITER\b/i.test(source.slice(i).split('\n', 1)[0])) {
      const end = source.indexOf('\n', i);
      const line = source.slice(i, end < 0 ? source.length : end).trim();
      const match = /^DELIMITER\s+(\S+)$/i.exec(line);
      if (!match || buffer.trim()) throw new Error('Invalid DELIMITER directive');
      delimiter = match[1]; i = end < 0 ? source.length : end + 1; continue;
    }
    if (source.startsWith(delimiter, i)) {
      if (buffer.trim()) result.push(buffer.trim());
      buffer = ''; i += delimiter.length; continue;
    }
    if (ch === '#' || (ch === '-' && next === '-' && /\s/.test(source[i + 2] || ' '))) {
      lineComment = true; i += ch === '#' ? 1 : 2; continue;
    }
    if (ch === '/' && next === '*') {
      if (source[i + 2] === '!' || source.slice(i + 2, i + 4) === 'M!') throw new Error('Executable SQL comments are not supported');
      blockComment = true; i += 2; continue;
    }
    if (ch === "'" || ch === '"' || ch === '\x60') quote = ch;
    buffer += ch; i++;
  }
  if (quote || blockComment) throw new Error('Unterminated SQL quote or comment');
  if (buffer.trim()) result.push(buffer.trim());
  return result;
}
