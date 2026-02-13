import html2canvas from 'html2canvas';
import * as XLSX from 'xlsx';

/**
 * Export chart or element as PNG/JPG image
 */
export async function exportAsImage(
  element: HTMLElement,
  filename: string,
  format: 'png' | 'jpg' = 'png'
): Promise<void> {
  const canvas = await html2canvas(element, {
    backgroundColor: '#ffffff',
    scale: 2,
  });

  const link = document.createElement('a');
  link.download = `${filename}.${format}`;
  link.href = canvas.toDataURL(`image/${format === 'jpg' ? 'jpeg' : 'png'}`);
  link.click();
}

/**
 * Export chart or element as PDF using browser print
 * Uses a simpler approach that opens a print dialog
 */
export async function exportAsPDF(
  element: HTMLElement,
  filename: string,
  title?: string
): Promise<void> {
  const canvas = await html2canvas(element, {
    backgroundColor: '#ffffff',
    scale: 2,
  });

  // Create a new window with the image for printing
  const imgData = canvas.toDataURL('image/png');
  const printWindow = window.open('', '_blank');

  if (printWindow) {
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${filename}</title>
          <style>
            body {
              margin: 0;
              padding: 20px;
              font-family: Arial, sans-serif;
            }
            h1 {
              text-align: center;
              margin-bottom: 20px;
              font-size: 18px;
            }
            img {
              max-width: 100%;
              height: auto;
            }
            .footer {
              text-align: center;
              font-size: 10px;
              color: #888;
              margin-top: 20px;
            }
            @media print {
              body { padding: 0; }
              @page { margin: 15mm; }
            }
          </style>
        </head>
        <body>
          ${title ? `<h1>${title}</h1>` : ''}
          <img src="${imgData}" alt="Chart" />
          <div class="footer">
            Generated on ${new Date().toLocaleString()}
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();

    // Wait for image to load then print
    printWindow.onload = () => {
      setTimeout(() => {
        printWindow.print();
      }, 500);
    };
  }
}

/**
 * Export data as Excel file
 */
export function exportAsExcel(
  data: Record<string, any>[],
  filename: string,
  sheetName: string = 'Sheet1'
): void {
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  XLSX.writeFile(workbook, `${filename}.xlsx`);
}

/**
 * Export multiple sheets as Excel file
 */
export function exportMultiSheetExcel(
  sheets: { name: string; data: Record<string, any>[] }[],
  filename: string
): void {
  const workbook = XLSX.utils.book_new();

  sheets.forEach((sheet) => {
    const worksheet = XLSX.utils.json_to_sheet(sheet.data);
    XLSX.utils.book_append_sheet(workbook, worksheet, sheet.name);
  });

  XLSX.writeFile(workbook, `${filename}.xlsx`);
}

/**
 * Export data as CSV
 */
export function exportAsCSV(
  data: Record<string, any>[],
  filename: string
): void {
  if (data.length === 0) return;

  const headers = Object.keys(data[0]!);
  const csvRows = [
    headers.join(','),
    ...data.map(row =>
      headers.map(header => {
        const value = row[header];
        // Escape commas and quotes
        if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value ?? '';
      }).join(',')
    ),
  ];

  const csvContent = csvRows.join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `${filename}.csv`;
  link.click();
}

/**
 * Get ECharts instance from ref and export as image
 */
export function exportEChartsAsImage(
  chartInstance: any,
  filename: string,
  format: 'png' | 'jpg' = 'png'
): void {
  if (!chartInstance) return;

  const dataURL = chartInstance.getDataURL({
    type: format === 'jpg' ? 'jpeg' : 'png',
    pixelRatio: 2,
    backgroundColor: '#fff',
  });

  const link = document.createElement('a');
  link.download = `${filename}.${format}`;
  link.href = dataURL;
  link.click();
}
