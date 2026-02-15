import { ref } from 'vue';

/**
 * useExport - Composable for exporting table data to CSV or JSON.
 *
 * Returns `exportCSV`, `exportJSON`, and a reactive `exporting` flag
 * that can be used for loading indicators during export.
 */

interface ColumnDef {
  key: string;
  title: string;
}

/**
 * Flatten a nested object into dot-notation keys.
 *
 * Example: { user: { name: 'Alice' } } => { 'user.name': 'Alice' }
 */
function flattenObject(
  obj: Record<string, any>,
  prefix = '',
  result: Record<string, any> = {}
): Record<string, any> {
  for (const key of Object.keys(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    const value = obj[key];

    if (
      value !== null &&
      typeof value === 'object' &&
      !Array.isArray(value) &&
      !(value instanceof Date)
    ) {
      flattenObject(value, fullKey, result);
    } else {
      result[fullKey] = value;
    }
  }
  return result;
}

/**
 * Escape a value for safe CSV inclusion.
 * Wraps in double quotes if the value contains commas, quotes, or newlines.
 * Internal double quotes are escaped by doubling them.
 */
function escapeCSVValue(value: any): string {
  if (value === null || value === undefined) {
    return '';
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (Array.isArray(value)) {
    return escapeCSVValue(JSON.stringify(value));
  }

  const str = String(value);

  // If the value contains a comma, double quote, newline, or carriage return,
  // wrap it in quotes and escape internal quotes.
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }

  return str;
}

/**
 * Trigger a file download in the browser.
 */
function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Generate a default filename with a timestamp.
 */
function defaultFilename(extension: string): string {
  const now = new Date();
  const timestamp = now.toISOString().replace(/[:.]/g, '-').slice(0, 19);
  return `export-${timestamp}.${extension}`;
}

export function useExport() {
  const exporting = ref<boolean>(false);

  /**
   * Export data to CSV with BOM for Excel compatibility.
   *
   * @param data - Array of row objects
   * @param columns - Column definitions (key + title) determining which fields to export and header names
   * @param filename - Optional filename (defaults to timestamped name)
   */
  function exportCSV(
    data: any[],
    columns: ColumnDef[],
    filename?: string
  ): void {
    exporting.value = true;

    try {
      // Flatten all rows
      const flatData = data.map(row => flattenObject(row));

      // Build header row from column titles
      const headers = columns.map(col => escapeCSVValue(col.title));
      const headerLine = headers.join(',');

      // Build data rows
      const rows = flatData.map(row => {
        return columns
          .map(col => escapeCSVValue(row[col.key]))
          .join(',');
      });

      // BOM (Byte Order Mark) for Excel UTF-8 compatibility
      const BOM = '\uFEFF';
      const csvContent = BOM + [headerLine, ...rows].join('\r\n');

      downloadFile(
        csvContent,
        filename || defaultFilename('csv'),
        'text/csv;charset=utf-8'
      );
    } finally {
      exporting.value = false;
    }
  }

  /**
   * Export data to JSON.
   *
   * @param data - Array of row objects
   * @param filename - Optional filename (defaults to timestamped name)
   */
  function exportJSON(data: any[], filename?: string): void {
    exporting.value = true;

    try {
      const jsonContent = JSON.stringify(data, null, 2);

      downloadFile(
        jsonContent,
        filename || defaultFilename('json'),
        'application/json;charset=utf-8'
      );
    } finally {
      exporting.value = false;
    }
  }

  return {
    exportCSV,
    exportJSON,
    exporting,
  };
}
