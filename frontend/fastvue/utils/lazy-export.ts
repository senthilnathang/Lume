/**
 * Lazy-loaded Export Utilities
 *
 * This module provides async versions of export functions that dynamically
 * import heavy dependencies (xlsx, html2canvas) only when needed.
 *
 * Benefits:
 * - Reduces initial bundle size by ~700KB
 * - xlsx (432KB) and html2canvas (258KB) only loaded on first export
 * - Better first contentful paint (FCP) metrics
 *
 * Usage:
 * ```ts
 * import { lazyExportAsExcel, lazyExportAsImage } from '#/utils/lazy-export';
 *
 * // Dependencies loaded on first call, cached for subsequent calls
 * await lazyExportAsExcel(data, 'report');
 * await lazyExportAsImage(element, 'chart');
 * ```
 */

import { message } from 'ant-design-vue';

// Module cache for lazy-loaded dependencies
let xlsxModule: typeof import('xlsx') | null = null;
let html2canvasModule: typeof import('html2canvas').default | null = null;

/**
 * Lazy load xlsx module
 */
async function getXlsx() {
  if (!xlsxModule) {
    const module = await import('xlsx');
    xlsxModule = module;
  }
  return xlsxModule;
}

/**
 * Lazy load html2canvas module
 */
async function getHtml2Canvas() {
  if (!html2canvasModule) {
    const module = await import('html2canvas');
    html2canvasModule = module.default;
  }
  return html2canvasModule;
}

/**
 * Export chart or element as PNG/JPG image (lazy-loaded)
 */
export async function lazyExportAsImage(
  element: HTMLElement,
  filename: string,
  format: 'png' | 'jpg' = 'png',
): Promise<void> {
  try {
    message.loading({ content: 'Preparing export...', key: 'export' });

    const html2canvas = await getHtml2Canvas();
    const canvas = await html2canvas(element, {
      backgroundColor: '#ffffff',
      scale: 2,
    });

    const link = document.createElement('a');
    link.download = `${filename}.${format}`;
    link.href = canvas.toDataURL(`image/${format === 'jpg' ? 'jpeg' : 'png'}`);
    link.click();

    message.success({ content: 'Export completed!', key: 'export' });
  } catch (error) {
    console.error('Export failed:', error);
    message.error({ content: 'Export failed', key: 'export' });
    throw error;
  }
}

/**
 * Export chart or element as PDF using browser print (lazy-loaded)
 */
export async function lazyExportAsPDF(
  element: HTMLElement,
  filename: string,
  title?: string,
): Promise<void> {
  try {
    message.loading({ content: 'Preparing PDF...', key: 'export' });

    const html2canvas = await getHtml2Canvas();
    const canvas = await html2canvas(element, {
      backgroundColor: '#ffffff',
      scale: 2,
    });

    const imgData = canvas.toDataURL('image/png');
    const printWindow = window.open('', '_blank');

    if (printWindow) {
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>${filename}</title>
            <style>
              body { margin: 0; padding: 20px; font-family: Arial, sans-serif; }
              h1 { text-align: center; margin-bottom: 20px; font-size: 18px; }
              img { max-width: 100%; height: auto; }
              .footer { text-align: center; font-size: 10px; color: #888; margin-top: 20px; }
              @media print { body { padding: 0; } @page { margin: 15mm; } }
            </style>
          </head>
          <body>
            ${title ? `<h1>${title}</h1>` : ''}
            <img src="${imgData}" alt="Chart" />
            <div class="footer">Generated on ${new Date().toLocaleString()}</div>
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.onload = () => {
        setTimeout(() => printWindow.print(), 500);
      };
    }

    message.success({ content: 'PDF ready!', key: 'export' });
  } catch (error) {
    console.error('PDF export failed:', error);
    message.error({ content: 'PDF export failed', key: 'export' });
    throw error;
  }
}

/**
 * Export data as Excel file (lazy-loaded)
 */
export async function lazyExportAsExcel(
  data: Record<string, any>[],
  filename: string,
  sheetName: string = 'Sheet1',
): Promise<void> {
  try {
    message.loading({ content: 'Generating Excel...', key: 'export' });

    const XLSX = await getXlsx();
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
    XLSX.writeFile(workbook, `${filename}.xlsx`);

    message.success({ content: 'Excel exported!', key: 'export' });
  } catch (error) {
    console.error('Excel export failed:', error);
    message.error({ content: 'Excel export failed', key: 'export' });
    throw error;
  }
}

/**
 * Export multiple sheets as Excel file (lazy-loaded)
 */
export async function lazyExportMultiSheetExcel(
  sheets: { name: string; data: Record<string, any>[] }[],
  filename: string,
): Promise<void> {
  try {
    message.loading({ content: 'Generating Excel...', key: 'export' });

    const XLSX = await getXlsx();
    const workbook = XLSX.utils.book_new();

    sheets.forEach((sheet) => {
      const worksheet = XLSX.utils.json_to_sheet(sheet.data);
      XLSX.utils.book_append_sheet(workbook, worksheet, sheet.name);
    });

    XLSX.writeFile(workbook, `${filename}.xlsx`);

    message.success({ content: 'Excel exported!', key: 'export' });
  } catch (error) {
    console.error('Excel export failed:', error);
    message.error({ content: 'Excel export failed', key: 'export' });
    throw error;
  }
}

/**
 * Export data as CSV (no external dependencies)
 */
export function exportAsCSV(
  data: Record<string, any>[],
  filename: string,
): void {
  if (data.length === 0) {
    message.warning('No data to export');
    return;
  }

  const headers = Object.keys(data[0]!);
  const csvRows = [
    headers.join(','),
    ...data.map((row) =>
      headers
        .map((header) => {
          const value = row[header];
          if (
            typeof value === 'string' &&
            (value.includes(',') || value.includes('"'))
          ) {
            return `"${value.replace(/"/g, '""')}"`;
          }
          return value ?? '';
        })
        .join(','),
    ),
  ];

  const csvContent = csvRows.join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `${filename}.csv`;
  link.click();

  message.success('CSV exported!');
}

/**
 * Export ECharts instance as image (uses native ECharts export, no external deps)
 */
export function exportEChartsAsImage(
  chartInstance: any,
  filename: string,
  format: 'png' | 'jpg' = 'png',
): void {
  if (!chartInstance) {
    message.warning('No chart to export');
    return;
  }

  const dataURL = chartInstance.getDataURL({
    type: format === 'jpg' ? 'jpeg' : 'png',
    pixelRatio: 2,
    backgroundColor: '#fff',
  });

  const link = document.createElement('a');
  link.download = `${filename}.${format}`;
  link.href = dataURL;
  link.click();

  message.success('Chart exported!');
}

/**
 * Preload export dependencies in background
 * Call this when user hovers over export button or enters analytics page
 */
export function preloadExportDependencies(): void {
  // Preload in background without blocking
  setTimeout(() => {
    getXlsx().catch(() => {});
    getHtml2Canvas().catch(() => {});
  }, 1000);
}
