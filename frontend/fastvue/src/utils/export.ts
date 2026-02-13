/**
 * Export utilities for Excel and PDF generation
 */

export interface ExportColumn {
  key: string;
  title: string;
  width?: number;
  formatter?: (value: any, row: any) => string;
}

export interface ExportOptions {
  filename: string;
  columns: ExportColumn[];
  data: Record<string, any>[];
  title?: string;
  sheetName?: string;
}

/**
 * Export data to CSV format
 */
export function exportToCSV(options: ExportOptions): void {
  const { filename, columns, data } = options;

  // Build CSV header
  const header = columns.map((col) => `"${col.title}"`).join(',');

  // Build CSV rows
  const rows = data.map((row) => {
    return columns
      .map((col) => {
        let value = row[col.key];
        if (col.formatter) {
          value = col.formatter(value, row);
        }
        // Escape double quotes and wrap in quotes
        value = value === null || value === undefined ? '' : String(value);
        value = value.replace(/"/g, '""');
        return `"${value}"`;
      })
      .join(',');
  });

  // Combine header and rows
  const csv = [header, ...rows].join('\n');

  // Add BOM for Excel UTF-8 compatibility
  const BOM = '\uFEFF';
  const blob = new Blob([BOM + csv], { type: 'text/csv;charset=utf-8;' });

  downloadBlob(blob, `${filename}.csv`);
}

/**
 * Export data to Excel format (XLS)
 * Uses HTML table format compatible with Excel
 */
export async function exportToExcel(options: ExportOptions): Promise<void> {
  const { filename, columns, data, sheetName = 'Sheet1', title } = options;

  // Build HTML table
  let html = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
    <head>
      <meta charset="utf-8">
      <!--[if gte mso 9]>
      <xml>
        <x:ExcelWorkbook>
          <x:ExcelWorksheets>
            <x:ExcelWorksheet>
              <x:Name>${sheetName}</x:Name>
              <x:WorksheetOptions>
                <x:DisplayGridlines/>
              </x:WorksheetOptions>
            </x:ExcelWorksheet>
          </x:ExcelWorksheets>
        </x:ExcelWorkbook>
      </xml>
      <![endif]-->
      <style>
        table { border-collapse: collapse; }
        th, td { border: 1px solid #000; padding: 5px; }
        th { background-color: #4472C4; color: white; font-weight: bold; }
      </style>
    </head>
    <body>
  `;

  // Add title if provided
  if (title) {
    html += `<h2>${title}</h2>`;
  }

  // Build table
  html += '<table>';

  // Header row
  html += '<thead><tr>';
  columns.forEach((col) => {
    html += `<th>${col.title}</th>`;
  });
  html += '</tr></thead>';

  // Data rows
  html += '<tbody>';
  data.forEach((row) => {
    html += '<tr>';
    columns.forEach((col) => {
      let value = row[col.key];
      if (col.formatter) {
        value = col.formatter(value, row);
      }
      html += `<td>${value ?? ''}</td>`;
    });
    html += '</tr>';
  });
  html += '</tbody></table>';

  html += '</body></html>';

  // Download as .xls file
  const blob = new Blob([html], { type: 'application/vnd.ms-excel' });
  downloadBlob(blob, `${filename}.xls`);
}

/**
 * Export data to PDF format
 * Uses browser print dialog with PDF option
 */
export async function exportToPDF(options: ExportOptions): Promise<void> {
  const { filename, columns, data, title } = options;

  // Build HTML content for printing
  let html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>${filename}</title>
      <style>
        @media print {
          @page {
            size: landscape;
            margin: 10mm;
          }
        }
        body {
          font-family: Arial, sans-serif;
          padding: 20px;
        }
        h1 {
          color: #333;
          margin-bottom: 20px;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 20px;
        }
        th, td {
          border: 1px solid #ddd;
          padding: 8px;
          text-align: left;
          font-size: 11px;
        }
        th {
          background-color: #2196f3;
          color: white;
          font-weight: bold;
        }
        tr:nth-child(even) {
          background-color: #f5f5f5;
        }
        .footer {
          text-align: center;
          font-size: 10px;
          color: #666;
          margin-top: 20px;
        }
      </style>
    </head>
    <body>
  `;

  // Add title
  if (title) {
    html += `<h1>${title}</h1>`;
  }

  // Build table
  html += '<table>';
  html += '<thead><tr>';
  columns.forEach((col) => {
    html += `<th>${col.title}</th>`;
  });
  html += '</tr></thead>';

  html += '<tbody>';
  data.forEach((row) => {
    html += '<tr>';
    columns.forEach((col) => {
      let value = row[col.key];
      if (col.formatter) {
        value = col.formatter(value, row);
      }
      html += `<td>${value ?? ''}</td>`;
    });
    html += '</tr>';
  });
  html += '</tbody></table>';

  html += `<div class="footer">Generated on ${new Date().toLocaleString()}</div>`;
  html += '</body></html>';

  // Open print window
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    throw new Error('Could not open print window. Please allow popups.');
  }

  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.focus();

  // Wait for content to load then print
  setTimeout(() => {
    printWindow.print();
    // Close after print dialog
    printWindow.onafterprint = () => {
      printWindow.close();
    };
  }, 500);
}

/**
 * Export table data using native HTML table to Excel
 * Works without any external libraries
 */
export function exportTableToExcel(
  tableId: string,
  filename: string,
  sheetName = 'Sheet1',
): void {
  const table = document.getElementById(tableId);
  if (!table) {
    throw new Error(`Table with id "${tableId}" not found`);
  }

  const html = table.outerHTML;
  const blob = new Blob(
    [
      `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta charset="utf-8">
        <!--[if gte mso 9]>
        <xml>
          <x:ExcelWorkbook>
            <x:ExcelWorksheets>
              <x:ExcelWorksheet>
                <x:Name>${sheetName}</x:Name>
                <x:WorksheetOptions>
                  <x:DisplayGridlines/>
                </x:WorksheetOptions>
              </x:ExcelWorksheet>
            </x:ExcelWorksheets>
          </x:ExcelWorkbook>
        </xml>
        <![endif]-->
      </head>
      <body>${html}</body>
      </html>`,
    ],
    { type: 'application/vnd.ms-excel' },
  );

  downloadBlob(blob, `${filename}.xls`);
}

/**
 * Print content as PDF using browser print dialog
 */
export function printToPDF(
  content: string | HTMLElement,
  title?: string,
): void {
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    throw new Error('Could not open print window. Please allow popups.');
  }

  const htmlContent = typeof content === 'string' ? content : content.outerHTML;

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>${title || 'Print'}</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          padding: 20px;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 20px;
        }
        th, td {
          border: 1px solid #ddd;
          padding: 8px;
          text-align: left;
        }
        th {
          background-color: #2196f3;
          color: white;
        }
        tr:nth-child(even) {
          background-color: #f5f5f5;
        }
        @media print {
          .no-print {
            display: none;
          }
        }
      </style>
    </head>
    <body>
      ${title ? `<h1>${title}</h1>` : ''}
      ${htmlContent}
    </body>
    </html>
  `);

  printWindow.document.close();
  printWindow.focus();

  // Wait for content to load then print
  setTimeout(() => {
    printWindow.print();
    printWindow.close();
  }, 250);
}

/**
 * Helper function to download a blob as a file
 */
function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Format date for export
 */
export function formatDateForExport(date: string | Date | null | undefined): string {
  if (!date) return '';
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}

/**
 * Format datetime for export
 */
export function formatDateTimeForExport(date: string | Date | null | undefined): string {
  if (!date) return '';
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleString('en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Format currency for export
 */
export function formatCurrencyForExport(
  value: number | null | undefined,
  currency = 'USD',
): string {
  if (value === null || value === undefined) return '';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(value);
}

/**
 * Format number for export
 */
export function formatNumberForExport(
  value: number | null | undefined,
  decimals = 2,
): string {
  if (value === null || value === undefined) return '';
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}
