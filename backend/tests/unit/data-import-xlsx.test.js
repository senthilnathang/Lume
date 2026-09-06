import * as XLSX from 'xlsx';
import { FeaturesDataService } from '../../src/modules/base_features_data/services/index.js';

function toBase64Xlsx(rows) {
  const sheet = XLSX.utils.aoa_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, 'Sheet1');
  return Buffer.from(XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' })).toString('base64');
}

describe('import file parsing (FastVue xlsx parity)', () => {
  const svc = new FeaturesDataService({});

  test('parses xlsx first sheet with headers', () => {
    const b64 = toBase64Xlsx([['Name', 'Amount'], ['Alice', 100], ['Bob', 200]]);
    const { columns, rows, totalRows } = svc.parseFile(b64, 'import.xlsx', true);
    expect(columns).toEqual(['Name', 'Amount']);
    expect(totalRows).toBe(2);
    expect(rows[0]).toEqual({ Name: 'Alice', Amount: '100' });
  });

  test('parses xlsx without headers and skips blank rows', () => {
    const b64 = toBase64Xlsx([['a', 'b'], ['', ''], ['c', 'd']]);
    const { columns, rows } = svc.parseFile(b64, 'data.XLSX', false);
    expect(columns).toEqual(['Column_1', 'Column_2']);
    expect(rows).toHaveLength(2);
  });

  test('csv parsing still works and routes by extension', () => {
    const csv = Buffer.from('a,b\n1,2\n').toString('base64');
    expect(svc.parseFile(csv, 'data.csv', true).columns).toEqual(['a', 'b']);
    expect(() => svc.parseFile(csv, 'data.xlsx', true)).not.toThrow();
  });

  test('rejects empty workbooks', () => {
    const sheet = XLSX.utils.aoa_to_sheet([]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, sheet, 'Sheet1');
    const b64 = Buffer.from(XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' })).toString('base64');
    expect(() => svc.parseFile(b64, 'empty.xlsx', true)).toThrow(/empty/i);
  });
});
