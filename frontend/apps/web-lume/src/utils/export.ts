/**
 * Advanced Data Export Utility
 * Supports CSV, Excel, JSON export with custom templates
 */

import { ref } from 'vue';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

export interface ExportColumn {
  key: string;
  title: string;
  formatter?: (value: any, row: any) => string;
}

export interface ExportOptions {
  filename?: string;
  sheetName?: string;
  columns?: ExportColumn[];
  format?: 'csv' | 'xlsx' | 'json';
  dateFormat?: string;
  title?: string;
  subtitle?: string;
  includeHeaders?: boolean;
}

export interface ExportTemplate {
  id: string;
  name: string;
  description: string;
  columns: ExportColumn[];
  defaultFormat: 'csv' | 'xlsx' | 'json';
}

export const useExport = () => {
  const exporting = ref(false);
  const exportProgress = ref(0);

  /**
   * Export data to CSV format
   */
  const exportToCSV = (data: any[], options: ExportOptions = {}) => {
    const {
      filename = 'export',
      columns = [],
      includeHeaders = true,
      dateFormat = 'YYYY-MM-DD'
    } = options;

    if (!data || data.length === 0) {
      console.warn('No data to export');
      return;
    }

    const headers = columns.length > 0 
      ? columns.map(col => col.title)
      : Object.keys(data[0]);

    const rows = data.map(row => {
      if (columns.length > 0) {
        return columns.map(col => {
          let value = row[col.key];
          if (col.formatter) {
            return col.formatter(value, row);
          }
          if (value instanceof Date) {
            return formatDate(value, dateFormat);
          }
          if (value === null || value === undefined) {
            return '';
          }
          return String(value);
        });
      }
      return Object.values(row).map(val => {
        if (val instanceof Date) {
          return formatDate(val, dateFormat);
        }
        if (val === null || val === undefined) {
          return '';
        }
        return String(val);
      });
    });

    const csvContent = [
      ...(includeHeaders ? [headers.join(',')] : []),
      ...rows.map(row => row.map(cell => {
        // Escape CSV values
        const str = String(cell);
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      }).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    saveAs(blob, `${filename}.csv`);
  };

  /**
   * Export data to Excel format with styling
   */
  const exportToExcel = (data: any[], options: ExportOptions = {}) => {
    const {
      filename = 'export',
      sheetName = 'Sheet1',
      columns = [],
      title,
      subtitle,
      dateFormat = 'YYYY-MM-DD'
    } = options;

    if (!data || data.length === 0) {
      console.warn('No data to export');
      return;
    }

    // Prepare data
    const processedData = data.map(row => {
      const newRow: Record<string, any> = {};
      
      if (columns.length > 0) {
        columns.forEach(col => {
          let value = row[col.key];
          if (col.formatter) {
            value = col.formatter(value, row);
          } else if (value instanceof Date) {
            value = formatDate(value, dateFormat);
          }
          newRow[col.title] = value;
        });
      } else {
        Object.keys(row).forEach(key => {
          let value = row[key];
          if (value instanceof Date) {
            value = formatDate(value, dateFormat);
          }
          newRow[key] = value;
        });
      }
      
      return newRow;
    });

    // Create workbook and worksheet
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(processedData);

    // Add title row if provided
    if (title) {
      XLSX.utils.sheet_add_aoa(ws, [[title]], { origin: 'A1' });
      // Merge cells for title
      const titleRow = XLSX.utils.encode_cell({ r: 0, c: processedData[0] ? Object.keys(processedData[0]).length - 1 : 0 });
      ws['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: titleRow ? 1 : 0 } }];
    }

    // Set column widths
    const colWidths = Object.keys(processedData[0] || {}).map(key => ({
      wch: Math.max(key.length, 15)
    }));
    ws['!cols'] = colWidths;

    XLSX.utils.book_append_sheet(wb, ws, sheetName);

    // Write file
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([wbout], { type: 'application/octet-stream' });
    saveAs(blob, `${filename}.xlsx`);
  };

  /**
   * Export data to JSON format
   */
  const exportToJSON = (data: any[], options: ExportOptions = {}) => {
    const {
      filename = 'export',
      columns = [],
      dateFormat = 'YYYY-MM-DD'
    } = options;

    if (!data || data.length === 0) {
      console.warn('No data to export');
      return;
    }

    const processedData = data.map(row => {
      if (columns.length > 0) {
        const newRow: Record<string, any> = {};
        columns.forEach(col => {
          let value = row[col.key];
          if (col.formatter) {
            value = col.formatter(value, row);
          } else if (value instanceof Date) {
            value = formatDate(value, dateFormat);
          }
          newRow[col.title] = value;
        });
        return newRow;
      }
      return row;
    });

    const jsonContent = JSON.stringify(processedData, null, 2);
    const blob = new Blob([jsonContent], { type: 'application/json' });
    saveAs(blob, `${filename}.json`);
  };

  /**
   * Universal export function
   */
  const exportData = async (data: any[], options: ExportOptions = {}) => {
    exporting.value = true;
    exportProgress.value = 0;

    try {
      const { format = 'xlsx' } = options;

      switch (format) {
        case 'csv':
          exportToCSV(data, options);
          break;
        case 'xlsx':
          exportToExcel(data, options);
          break;
        case 'json':
          exportToJSON(data, options);
          break;
        default:
          exportToExcel(data, options);
      }

      exportProgress.value = 100;
    } catch (error) {
      console.error('Export failed:', error);
      throw error;
    } finally {
      exporting.value = false;
    }
  };

  /**
   * Export filtered data (for use in table components)
   */
  const exportTableData = (
    allData: any[],
    filteredData: any[],
    columns: ExportColumn[],
    options: ExportOptions = {}
  ) => {
    const { includeFiltered = false } = options;
    const dataToExport = includeFiltered ? filteredData : allData;
    return exportData(dataToExport, { ...options, columns });
  };

  /**
   * Get available export templates
   */
  const getExportTemplates = (): ExportTemplate[] => {
    return [
      {
        id: 'basic-csv',
        name: 'Basic CSV',
        description: 'Simple CSV export with all columns',
        columns: [],
        defaultFormat: 'csv'
      },
      {
        id: 'basic-excel',
        name: 'Basic Excel',
        description: 'Excel export with basic formatting',
        columns: [],
        defaultFormat: 'xlsx'
      },
      {
        id: 'data-json',
        name: 'Data JSON',
        description: 'Export as JSON for API integration',
        columns: [],
        defaultFormat: 'json'
      }
    ];
  };

  /**
   * Format date helper
   */
  const formatDate = (date: Date, format: string): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');

    return format
      .replace('YYYY', String(year))
      .replace('MM', month)
      .replace('DD', day)
      .replace('HH', hours)
      .replace('mm', minutes)
      .replace('ss', seconds);
  };

  return {
    exporting,
    exportProgress,
    exportToCSV,
    exportToExcel,
    exportToJSON,
    exportData,
    exportTableData,
    getExportTemplates
  };
};

export default useExport;
