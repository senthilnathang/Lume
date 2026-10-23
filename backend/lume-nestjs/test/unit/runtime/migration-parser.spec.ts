import { readFileSync } from 'node:fs';
import { sqlStatements } from '../../../migrations/sql-statements';

describe('SQL migration parsing', () => {
  it('preserves semicolons and comment markers in strings and identifiers', () => {
    expect(sqlStatements("SELECT 'a;--b', `x;y`, \"#;\"; SELECT 'it''s;ok';"))
      .toEqual(["SELECT 'a;--b', `x;y`, \"#;\"", "SELECT 'it''s;ok'"]);
  });
  it('removes comments without joining adjacent tokens', () => {
    expect(sqlStatements('-- header;\nSELECT/* comment; */1; # tail;\nSELECT 2'))
      .toEqual(['SELECT 1', 'SELECT 2']);
  });
  it('keeps a real migration trigger body intact', () => {
    const statements = sqlStatements(readFileSync('migrations/002_create_record_versions_table.sql', 'utf8'));
    expect(statements).toHaveLength(3);
    expect(statements[2]).toContain('CREATE TRIGGER');
    expect(statements[2]).toContain('END IF;');
    expect(statements[2]).not.toContain('DELIMITER');
  });
  it('supports delimiter changes and CRLF', () => {
    expect(sqlStatements('DELIMITER $$\r\nSELECT 1$$\r\nDELIMITER ;\r\nSELECT 2;')).toEqual(['SELECT 1', 'SELECT 2']);
  });
  it.each(["SELECT 'broken", 'SELECT /* broken', 'DELIMITER', 'SELECT 1\nDELIMITER $$'])('rejects malformed scripts before execution: %s', source => {
    expect(() => sqlStatements(source)).toThrow();
  });
  it('rejects executable comments instead of silently skipping SQL', () => {
    expect(() => sqlStatements('/*! SELECT 1 */')).toThrow('Executable');
  });
});
