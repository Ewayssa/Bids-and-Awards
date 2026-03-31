import ExcelJS from 'exceljs';
import { REPORT_COLUMNS } from './reportConstants';
import { formatNumberDisplay, toDDMMYYYY } from './reportHelpers';

/**
 * Handles exporting report data to an Excel file with detailed styling.
 */
export const exportToExcel = async (encodedRows, filteredReports) => {
    const hasEncoded = encodedRows.length > 0;
    const hasUploaded = filteredReports.length > 0;
    if (!hasEncoded && !hasUploaded) return;

    const today = new Date();
    const reportDateLabel = today.toLocaleDateString('en-PH', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    });
    const reportDateUpper = reportDateLabel.toUpperCase();
    const totalCols = REPORT_COLUMNS.length;

    const workbook = new ExcelJS.Workbook();
    const ws = workbook.addWorksheet('Monitoring Report', { views: [{ state: 'frozen', ySplit: 7 }] });

    const makeFill = (argb) => ({
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb },
        bgColor: { argb },
    });
    const borderThin = { style: 'thin', color: { argb: 'FF000000' } };
    const borderAll = { top: borderThin, left: borderThin, bottom: borderThin, right: borderThin };

    let rowNum = 1;

    // Row 1: Header title
    ws.getCell(rowNum, 1).value = 'DEPARTMENT OF THE INTERIOR AND LOCAL GOVERNMENT - REGION 1';
    ws.getCell(rowNum, 1).font = { bold: true };
    ws.getCell(rowNum, 1).fill = makeFill('FFFFFFFF');
    ws.getCell(rowNum, 1).border = borderAll;
    ws.mergeCells(rowNum, 1, rowNum, Math.floor(totalCols / 2));
    
    const midStart = Math.floor(totalCols / 2) + 1;
    ws.getCell(rowNum, midStart).value = 'Procurement Monitoring Report';
    ws.getCell(rowNum, midStart).font = { bold: true };
    ws.getCell(rowNum, midStart).fill = makeFill('FFFFFFFF');
    ws.getCell(rowNum, midStart).alignment = { horizontal: 'center' };
    ws.getCell(rowNum, midStart).border = borderAll;
    ws.mergeCells(rowNum, midStart, rowNum, totalCols);
    rowNum += 1;

    // Row 2: Date label
    ws.getCell(rowNum, 1).value = `Monitoring Report as of ${reportDateUpper}`;
    ws.getCell(rowNum, 1).font = { bold: true };
    ws.getCell(rowNum, 1).fill = makeFill('FFF9FAFB');
    ws.getCell(rowNum, 1).border = borderAll;
    ws.mergeCells(rowNum, 1, rowNum, totalCols);
    rowNum += 1;
    rowNum += 1; // Empty row

    // Section header
    ws.getCell(rowNum, 1).value = 'COMPLETED PROCUREMENT ACTIVITIES';
    ws.getCell(rowNum, 1).font = { bold: true };
    ws.getCell(rowNum, 1).fill = makeFill('FFD1D5DB');
    ws.getCell(rowNum, 1).border = borderAll;
    ws.mergeCells(rowNum, 1, rowNum, totalCols);
    rowNum += 1;

    // Placeholder rows
    for (let c = 1; c <= totalCols; c++) {
        ws.getCell(rowNum, c).fill = makeFill('FFE5E7EB');
        ws.getCell(rowNum, c).border = borderAll;
        ws.getCell(rowNum + 1, c).fill = makeFill('FFFEF3C7');
        ws.getCell(rowNum + 1, c).border = borderAll;
    }
    rowNum += 2;

    // Table Header
    REPORT_COLUMNS.forEach((col, c) => {
        const cell = ws.getCell(rowNum, c + 1);
        cell.value = col.label;
        cell.font = { bold: true };
        cell.fill = makeFill('FFD1D5DB');
        cell.border = borderAll;
    });
    rowNum += 1;

    // Data rows
    const dataRows = hasEncoded
        ? encodedRows.map((row) =>
            REPORT_COLUMNS.map((col) => {
                const v = row[col.key] ?? '';
                if (col.type === 'date') return v ? (toDDMMYYYY(v) || v) : 'N/A';
                if (col.type === 'number') return formatNumberDisplay(v) || '';
                return v;
            })
        )
        : filteredReports.map((r) => Array(totalCols).fill('').map((_, i) => i === 1 ? r.title : i === 2 ? r.submitting_office : ''));

    const pinkFill = makeFill('FFFDF2F8');
    dataRows.forEach((rowValues) => {
        rowValues.forEach((val, c) => {
            const cell = ws.getCell(rowNum, c + 1);
            cell.value = val;
            cell.fill = pinkFill;
            cell.border = borderAll;
            if (REPORT_COLUMNS[c]?.type === 'number' && val !== '') cell.alignment = { horizontal: 'right' };
        });
        rowNum += 1;
    });

    // Column widths
    const colWidths = [14, 40, 24, 18, 20, 16, 16, 14, 14, 16, 14, 12, 26, 16, 16, 16, 18, 20, 22, 16, 14, 14, 20, 18, 18, 30];
    colWidths.forEach((w, i) => { if (ws.getColumn(i + 1)) ws.getColumn(i + 1).width = w; });

    // Download file
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `procurement-monitoring-report-${today.toISOString().split('T')[0]}.xlsx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
};
