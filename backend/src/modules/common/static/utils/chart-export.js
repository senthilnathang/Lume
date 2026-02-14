/**
 * Chart Export Utilities for Dynamic Module Views
 * Loaded at runtime by vue3-sfc-loader
 *
 * Features:
 * - PDF export using html2canvas + jsPDF
 * - Image export (PNG/JPEG)
 * - CSV data export
 * - ECharts native export
 * - Dashboard JSON import/export
 */

// Dynamically load html2canvas
async function loadHtml2Canvas() {
  if (window.html2canvas) return window.html2canvas;

  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://html2canvas.hertzen.com/dist/html2canvas.min.js';
    script.onload = () => resolve(window.html2canvas);
    script.onerror = () => reject(new Error('Failed to load html2canvas'));
    document.head.appendChild(script);
  });
}

// Dynamically load jsPDF
async function loadJsPDF() {
  if (window.jspdf?.jsPDF) return window.jspdf.jsPDF;
  if (window.jsPDF) return window.jsPDF;

  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
    script.onload = () => resolve(window.jspdf?.jsPDF || window.jsPDF);
    script.onerror = () => reject(new Error('Failed to load jsPDF'));
    document.head.appendChild(script);
  });
}

/**
 * Export element to PDF
 * @param {HTMLElement} element - The element to export
 * @param {string} filename - The filename without extension
 * @param {object} options - Optional configuration
 */
export async function exportToPDF(element, filename, options = {}) {
  const {
    scale = 2,
    orientation = 'auto',
    margin = 10,
    quality = 0.95,
  } = options;

  try {
    const html2canvas = await loadHtml2Canvas();
    const jsPDF = await loadJsPDF();

    const canvas = await html2canvas(element, {
      scale,
      useCORS: true,
      logging: false,
      allowTaint: true,
      backgroundColor: '#ffffff',
    });

    const imgData = canvas.toDataURL('image/jpeg', quality);
    const imgWidth = canvas.width;
    const imgHeight = canvas.height;

    let pdfOrientation = orientation;
    if (orientation === 'auto') {
      pdfOrientation = imgWidth > imgHeight ? 'landscape' : 'portrait';
    }

    const pdf = new jsPDF({
      orientation: pdfOrientation,
      unit: 'px',
      format: [imgWidth + margin * 2, imgHeight + margin * 2],
    });

    pdf.addImage(imgData, 'JPEG', margin, margin, imgWidth, imgHeight);
    pdf.save(`${filename}.pdf`);

    return { success: true };
  } catch (error) {
    console.error('PDF export failed:', error);
    throw error;
  }
}

/**
 * Export element to Image (PNG/JPEG)
 * @param {HTMLElement} element - The element to export
 * @param {string} filename - The filename without extension
 * @param {string} format - 'png' or 'jpeg'
 * @param {object} options - Optional configuration
 */
export async function exportToImage(element, filename, format = 'png', options = {}) {
  const {
    scale = 2,
    quality = 0.95,
    backgroundColor = '#ffffff',
  } = options;

  try {
    const html2canvas = await loadHtml2Canvas();

    const canvas = await html2canvas(element, {
      scale,
      useCORS: true,
      logging: false,
      allowTaint: true,
      backgroundColor,
    });

    const mimeType = format === 'jpeg' ? 'image/jpeg' : 'image/png';
    const dataUrl = canvas.toDataURL(mimeType, quality);

    const link = document.createElement('a');
    link.download = `${filename}.${format}`;
    link.href = dataUrl;
    link.click();

    return { success: true };
  } catch (error) {
    console.error('Image export failed:', error);
    throw error;
  }
}

/**
 * Export data to CSV
 * @param {Array} data - Array of objects to export
 * @param {string} filename - The filename without extension
 * @param {object} options - Optional configuration
 */
export function exportToCSV(data, filename, options = {}) {
  const {
    delimiter = ',',
    includeHeaders = true,
    headers = null,
  } = options;

  if (!data || data.length === 0) {
    console.warn('No data to export');
    return { success: false, reason: 'No data' };
  }

  try {
    const keys = headers || Object.keys(data[0]);
    const csvRows = [];

    if (includeHeaders) {
      csvRows.push(keys.map(escapeCSVValue).join(delimiter));
    }

    for (const row of data) {
      const values = keys.map(key => escapeCSVValue(row[key]));
      csvRows.push(values.join(delimiter));
    }

    const csvContent = csvRows.join('\n');
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${filename}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);

    return { success: true };
  } catch (error) {
    console.error('CSV export failed:', error);
    throw error;
  }
}

function escapeCSVValue(value) {
  if (value === null || value === undefined) return '';
  const stringValue = String(value);
  if (stringValue.includes(',') || stringValue.includes('\n') || stringValue.includes('"')) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  return stringValue;
}

/**
 * Export ECharts instance to image
 * @param {object} chartInstance - The ECharts instance
 * @param {string} filename - The filename without extension
 * @param {string} format - 'png' or 'jpeg'
 */
export function exportEChartToImage(chartInstance, filename, format = 'png', options = {}) {
  const { pixelRatio = 2, backgroundColor = '#fff' } = options;

  try {
    if (!chartInstance || typeof chartInstance.getDataURL !== 'function') {
      throw new Error('Invalid chart instance');
    }

    const dataUrl = chartInstance.getDataURL({
      type: format === 'jpeg' ? 'jpeg' : 'png',
      pixelRatio,
      backgroundColor,
    });

    const link = document.createElement('a');
    link.download = `${filename}.${format}`;
    link.href = dataUrl;
    link.click();

    return { success: true };
  } catch (error) {
    console.error('EChart export failed:', error);
    throw error;
  }
}

/**
 * Export dashboard configuration as JSON
 * @param {object} dashboard - Dashboard configuration
 * @param {Array} widgets - Widget configurations
 * @param {string} filename - The filename without extension
 */
export function exportDashboardJSON(dashboard, widgets, filename) {
  try {
    const exportData = {
      version: '1.0',
      exported_at: new Date().toISOString(),
      dashboard: {
        name: dashboard.name,
        code: dashboard.code,
        description: dashboard.description,
        icon: dashboard.icon,
        visibility: dashboard.visibility,
        refresh_interval: dashboard.refresh_interval,
        layout_config: dashboard.layout_config,
      },
      widgets: widgets.map(w => ({
        name: w.name,
        widget_type: w.widget_type,
        position_x: w.position_x,
        position_y: w.position_y,
        width: w.width,
        height: w.height,
        data_source_type: w.data_source_type,
        data_source_config: w.data_source_config,
        display_config: w.display_config,
        style_config: w.style_config,
        refresh_interval: w.refresh_interval,
        is_visible: w.is_visible,
      })),
    };

    const jsonContent = JSON.stringify(exportData, null, 2);
    const blob = new Blob([jsonContent], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${filename}.json`;
    link.click();
    URL.revokeObjectURL(link.href);

    return { success: true, data: exportData };
  } catch (error) {
    console.error('Dashboard JSON export failed:', error);
    throw error;
  }
}

/**
 * Parse imported dashboard JSON
 * @param {File|string} input - File object or JSON string
 * @returns {Promise<object>} Parsed dashboard data
 */
export async function parseDashboardJSON(input) {
  try {
    let content;
    if (input instanceof File) {
      content = await input.text();
    } else if (typeof input === 'string') {
      content = input;
    } else {
      throw new Error('Invalid input type');
    }

    const data = JSON.parse(content);
    if (!data.dashboard || !Array.isArray(data.widgets)) {
      throw new Error('Invalid dashboard JSON structure');
    }

    return data;
  } catch (error) {
    console.error('Dashboard JSON parse failed:', error);
    throw error;
  }
}

/**
 * Get refresh interval in milliseconds
 * @param {string} interval - Interval string like '1min', '5min', etc.
 * @returns {number} Milliseconds
 */
export function getRefreshIntervalMs(interval) {
  const intervals = {
    'none': 0,
    '30sec': 30 * 1000,
    '1min': 60 * 1000,
    '5min': 5 * 60 * 1000,
    '10min': 10 * 60 * 1000,
    '15min': 15 * 60 * 1000,
    '30min': 30 * 60 * 1000,
    '1hour': 60 * 60 * 1000,
  };
  return intervals[interval] || 0;
}

/**
 * Format refresh interval for display
 * @param {string} interval - Interval string
 * @returns {string} Human-readable format
 */
export function formatRefreshInterval(interval) {
  const labels = {
    'none': 'Manual',
    '30sec': '30 seconds',
    '1min': '1 minute',
    '5min': '5 minutes',
    '10min': '10 minutes',
    '15min': '15 minutes',
    '30min': '30 minutes',
    '1hour': '1 hour',
  };
  return labels[interval] || interval;
}

/**
 * Export chart as PNG image (legacy function)
 * @param {HTMLElement} chartElement - The chart container element
 * @param {string} filename - Filename without extension
 */
export async function exportChartAsPng(chartElement, filename = 'chart') {
  return exportToImage(chartElement, filename, 'png');
}

/**
 * Export chart as SVG
 * @param {HTMLElement} chartElement - The chart container element
 * @param {string} filename - Filename without extension
 */
export function exportChartAsSvg(chartElement, filename = 'chart') {
  try {
    const svgElement = chartElement.querySelector('svg');
    if (!svgElement) {
      console.warn('No SVG found in chart element');
      return;
    }

    const svgData = new XMLSerializer().serializeToString(svgElement);
    const blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.download = `${filename}.svg`;
    link.href = url;
    link.click();

    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Failed to export chart as SVG:', error);
  }
}

/**
 * Export data as CSV (delegates to exportToCSV)
 * @param {Array<object>} data - Array of objects to export
 * @param {string} filename - Filename without extension
 * @param {Array<string>} columns - Optional column order
 */
export function exportDataAsCsv(data, filename = 'data', columns = null) {
  return exportToCSV(data, filename, { headers: columns });
}

/**
 * Export data as JSON
 * @param {any} data - Data to export
 * @param {string} filename - Filename without extension
 */
export function exportDataAsJson(data, filename = 'data') {
  try {
    const jsonContent = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.download = `${filename}.json`;
    link.href = url;
    link.click();

    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Failed to export data as JSON:', error);
  }
}

/**
 * Print chart using a new window
 * @param {HTMLElement} chartElement - The chart container element
 */
export function printChart(chartElement) {
  try {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      console.warn('Pop-up blocked. Please allow pop-ups for printing.');
      return;
    }

    const doc = printWindow.document;
    doc.open();
    const htmlContent = [
      '<!DOCTYPE html>',
      '<html>',
      '<head>',
      '<title>Print Chart</title>',
      '<style>',
      'body { margin: 0; padding: 20px; }',
      '@media print { body { padding: 0; } }',
      '</style>',
      '</head>',
      '<body>',
      chartElement.innerHTML,
      '<script>',
      'window.onload = function() { window.print(); window.close(); };',
      '<\/script>',
      '</body>',
      '</html>',
    ].join('\n');
    doc.write(htmlContent);
    doc.close();
  } catch (error) {
    console.error('Failed to print chart:', error);
  }
}
