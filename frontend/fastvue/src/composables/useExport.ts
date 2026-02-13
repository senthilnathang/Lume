import { ref } from 'vue';

import { message } from 'ant-design-vue';

import type { ExportColumn, ExportOptions } from '#/utils/export';

import {
  exportToCSV,
  exportToExcel,
  exportToPDF,
  formatCurrencyForExport,
  formatDateForExport,
  formatDateTimeForExport,
  formatNumberForExport,
  printToPDF,
} from '#/utils/export';

export type ExportFormat = 'csv' | 'excel' | 'pdf' | 'print';

/**
 * Composable for exporting data in various formats
 *
 * Usage:
 * const { exportData, isExporting } = useExport();
 *
 * await exportData({
 *   format: 'excel',
 *   filename: 'employees',
 *   columns: [...],
 *   data: employeeList,
 * });
 */
export function useExport() {
  const isExporting = ref(false);

  async function exportData(
    options: ExportOptions & { format: ExportFormat },
  ): Promise<void> {
    const { format, ...exportOptions } = options;

    if (!exportOptions.data?.length) {
      message.warning('No data to export');
      return;
    }

    isExporting.value = true;

    try {
      switch (format) {
        case 'csv':
          exportToCSV(exportOptions);
          message.success('CSV exported successfully');
          break;
        case 'excel':
          await exportToExcel(exportOptions);
          message.success('Excel exported successfully');
          break;
        case 'pdf':
          await exportToPDF(exportOptions);
          message.success('PDF exported successfully');
          break;
        case 'print':
          printToPDF(generateHTMLTable(exportOptions), exportOptions.title);
          break;
        default:
          throw new Error(`Unsupported export format: ${format}`);
      }
    } catch (error: any) {
      console.error('Export failed:', error);
      message.error(error.message || 'Export failed');
    } finally {
      isExporting.value = false;
    }
  }

  // Helper to generate HTML table for printing
  function generateHTMLTable(options: ExportOptions): string {
    const { columns, data, title } = options;

    const headerCells = columns
      .map((col) => `<th>${col.title}</th>`)
      .join('');

    const bodyRows = data
      .map((row) => {
        const cells = columns
          .map((col) => {
            let value = row[col.key];
            if (col.formatter) {
              value = col.formatter(value, row);
            }
            return `<td>${value ?? ''}</td>`;
          })
          .join('');
        return `<tr>${cells}</tr>`;
      })
      .join('');

    return `
      ${title ? `<h2>${title}</h2>` : ''}
      <table>
        <thead>
          <tr>${headerCells}</tr>
        </thead>
        <tbody>
          ${bodyRows}
        </tbody>
      </table>
    `;
  }

  // Helper columns for common HRMS data types
  const createEmployeeColumns = (): ExportColumn[] => [
    { key: 'employee_id', title: 'Employee ID', width: 15 },
    { key: 'full_name', title: 'Full Name', width: 25 },
    { key: 'email', title: 'Email', width: 30 },
    { key: 'department_name', title: 'Department', width: 20 },
    { key: 'designation_name', title: 'Designation', width: 20 },
    {
      key: 'date_of_joining',
      title: 'Joining Date',
      width: 15,
      formatter: formatDateForExport,
    },
    { key: 'status', title: 'Status', width: 12 },
  ];

  const createAttendanceColumns = (): ExportColumn[] => [
    {
      key: 'date',
      title: 'Date',
      width: 15,
      formatter: formatDateForExport,
    },
    { key: 'employee_name', title: 'Employee', width: 25 },
    {
      key: 'clock_in',
      title: 'Clock In',
      width: 15,
      formatter: formatDateTimeForExport,
    },
    {
      key: 'clock_out',
      title: 'Clock Out',
      width: 15,
      formatter: formatDateTimeForExport,
    },
    {
      key: 'total_hours',
      title: 'Total Hours',
      width: 12,
      formatter: (v: number) => formatNumberForExport(v, 2),
    },
    { key: 'status', title: 'Status', width: 12 },
  ];

  const createLeaveColumns = (): ExportColumn[] => [
    { key: 'employee_name', title: 'Employee', width: 25 },
    { key: 'leave_type_name', title: 'Leave Type', width: 20 },
    {
      key: 'start_date',
      title: 'Start Date',
      width: 15,
      formatter: formatDateForExport,
    },
    {
      key: 'end_date',
      title: 'End Date',
      width: 15,
      formatter: formatDateForExport,
    },
    { key: 'days', title: 'Days', width: 10 },
    { key: 'status', title: 'Status', width: 12 },
    { key: 'reason', title: 'Reason', width: 30 },
  ];

  const createPayrollColumns = (currency = 'USD'): ExportColumn[] => [
    { key: 'employee_name', title: 'Employee', width: 25 },
    { key: 'employee_id', title: 'Employee ID', width: 15 },
    {
      key: 'month',
      title: 'Month',
      width: 15,
      formatter: formatDateForExport,
    },
    {
      key: 'basic_salary',
      title: 'Basic Salary',
      width: 15,
      formatter: (v: number) => formatCurrencyForExport(v, currency),
    },
    {
      key: 'allowances',
      title: 'Allowances',
      width: 15,
      formatter: (v: number) => formatCurrencyForExport(v, currency),
    },
    {
      key: 'deductions',
      title: 'Deductions',
      width: 15,
      formatter: (v: number) => formatCurrencyForExport(v, currency),
    },
    {
      key: 'net_salary',
      title: 'Net Salary',
      width: 15,
      formatter: (v: number) => formatCurrencyForExport(v, currency),
    },
  ];

  return {
    // State
    isExporting,
    // Actions
    exportData,
    // Column helpers
    createEmployeeColumns,
    createAttendanceColumns,
    createLeaveColumns,
    createPayrollColumns,
    // Format helpers
    formatDateForExport,
    formatDateTimeForExport,
    formatCurrencyForExport,
    formatNumberForExport,
  };
}
