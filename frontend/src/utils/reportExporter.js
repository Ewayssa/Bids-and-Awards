import ExcelJS from 'exceljs';
import { REPORT_COLUMNS, HEADER_GROUPS } from '../constants/reportConstants';
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
    const ws = workbook.addWorksheet('Monitoring Report', { views: [{ state: 'frozen', ySplit: 6 }] });

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
    ws.getCell(rowNum, 1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    ws.getCell(rowNum, 1).fill = makeFill('FF16A34A');
    ws.getCell(rowNum, 1).border = borderAll;
    ws.mergeCells(rowNum, 1, rowNum, totalCols);
    rowNum += 1;

    // 2-Tier Table Header
    const groupStartCols = {};
    let currentCol = 1;

    // Write Top Level (Groups)
    HEADER_GROUPS.forEach(grp => {
        const start = currentCol;
        const width = grp.colKeys.length;
        const end = start + width - 1;

        ws.getCell(rowNum, start).value = grp.groupLabel;
        ws.getCell(rowNum, start).font = { bold: true, color: { argb: 'FFFFFFFF' } };
        ws.getCell(rowNum, start).fill = makeFill('FF15803D'); // Darker green for top header
        ws.getCell(rowNum, start).alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };

        // Merge if it spans multiple columns, else just format
        if (width > 1) {
            ws.mergeCells(rowNum, start, rowNum, end);
        } else {
            ws.mergeCells(rowNum, start, rowNum + 1, start); // Merge down
        }

        for (let i = start; i <= end; i++) {
            ws.getCell(rowNum, i).border = borderAll;
        }

        groupStartCols[grp.groupLabel] = start;
        currentCol += width;
    });

    rowNum += 1;

    // Write Sub Level (Individual Columns)
    currentCol = 1;
    HEADER_GROUPS.forEach(grp => {
        if (grp.colKeys.length > 1) {
            grp.colKeys.forEach((key) => {
                const colDef = REPORT_COLUMNS.find(c => c.key === key);
                const cell = ws.getCell(rowNum, currentCol);
                cell.value = colDef ? (colDef.shortLabel || colDef.label) : key;
                cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
                cell.fill = makeFill('FF16A34A'); // Normal green for sub-header
                cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
                cell.border = borderAll;
                currentCol += 1;
            });
        } else {
            // Already merged vertically, just advance col
            currentCol += 1;
        }
        // Force borders on the second row for merged cells too
        for (let i = groupStartCols[grp.groupLabel]; i < currentCol; i++) {
            ws.getCell(rowNum, i).border = borderAll;
        }
    });

    rowNum += 1;

    // Data rows
    const dataRows = hasEncoded
        ? encodedRows.map((row) =>
            REPORT_COLUMNS.map((col) => {
                const v = row[col.key] ?? '';
                if (col.type === 'date') return v ? (toDDMMYYYY(v) || v) : '—';
                if (col.type === 'number') return formatNumberDisplay(v) || '';
                return v;
            })
        )
        : filteredReports.map((r) => Array(totalCols).fill('').map((_, i) => i === 1 ? r.title : i === 2 ? r.submitting_office : ''));

    const whiteFill = makeFill('FFFFFFFF');
    dataRows.forEach((rowValues) => {
        rowValues.forEach((val, c) => {
            const cell = ws.getCell(rowNum, c + 1);
            cell.value = val;
            cell.fill = whiteFill;
            cell.border = borderAll;
            if (REPORT_COLUMNS[c]?.type === 'number' && val !== '') cell.alignment = { horizontal: 'right', vertical: 'middle' };
            else cell.alignment = { vertical: 'middle', wrapText: true };
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
