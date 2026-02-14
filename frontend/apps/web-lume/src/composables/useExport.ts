/**
 * Export Composable
 * CSV export for list views. Lightweight — no external dependencies.
 */
import { ref } from 'vue';
import { message } from 'ant-design-vue';

export interface ExportColumn {
  /** Data key in the row object */
  key: string;
  /** Column header title */
  title: string;
  /** Custom formatter for cell value */
  formatter?: (value: any, row: Record<string, any>) => string;
}

/**
 * Composable for exporting data to CSV
 *
 * @example
 * ```ts
 * const { exportCsv, isExporting } = useExport();
 *
 * await exportCsv(employees, [
 *   { key: 'name', title: 'Name' },
 *   { key: 'email', title: 'Email' },
 *   { key: 'status', title: 'Status' },
 *   { key: 'created_at', title: 'Joined', formatter: (v) => new Date(v).toLocaleDateString() },
 * ], 'employees');
 * ```
 */
export function useExport() {
  const isExporting = ref(false);

  /**
   * Export array of objects to CSV and trigger download
   */
  function exportCsv(
    data: Record<string, any>[],
    columns: ExportColumn[],
    filename = 'export',
  ): void {
    if (!data.length) {
      message.warning('No data to export');
      return;
    }

    isExporting.value = true;

    try {
      // Build header row
      const header = columns.map((col) => escapeCsvValue(col.title)).join(',');

      // Build data rows
      const rows = data.map((row) => {
        return columns
          .map((col) => {
            let value = row[col.key];
            if (col.formatter) {
              value = col.formatter(value, row);
            }
            return escapeCsvValue(value);
          })
          .join(',');
      });

      const csv = [header, ...rows].join('\n');
      const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });

      downloadBlob(blob, `${filename}.csv`);
      message.success('CSV exported successfully');
    } catch (err: any) {
      console.error('Export failed:', err);
      message.error(err.message || 'Export failed');
    } finally {
      isExporting.value = false;
    }
  }

  return {
    exportCsv,
    isExporting,
  };
}

/**
 * Escape a value for CSV (handle commas, quotes, newlines)
 */
function escapeCsvValue(value: any): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Trigger browser download of a Blob
 */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
