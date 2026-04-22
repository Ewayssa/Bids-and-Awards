import ExcelJS from 'exceljs';

/**
 * Generates a formal Purchase Request Excel file based on the official DILG template (Appendix 60).
 * @param {Object} data - The PR data containing items, prNo, date, etc.
 */
export const generatePR_Excel = async (data) => {
    const {
        items = [],
        total = 0,
        ppmp_no = '',
        prNo = '',
        title = '',
        date = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
        office = '',
        section = ''
    } = data;

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Purchase Request');

    // Set Column Widths
    worksheet.columns = [
        { width: 14 }, // Stock No (A)
        { width: 10 }, // Unit (B)
        { width: 45 }, // Description (C)
        { width: 10 }, // Quantity (D)
        { width: 15 }, // Unit Cost (E)
        { width: 18 }, // Total Cost (F)
    ];

    // Helper: Apply Border to a single cell
    const applyBorder = (cell) => {
        if (!cell) return;
        cell.border = {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' }
        };
    };

    // Helper: Apply Border to a range (important for merged cells)
    const applyRangeBorder = (startCell, endCell) => {
        const start = worksheet.getCell(startCell);
        const end = worksheet.getCell(endCell);
        for (let r = start.row; r <= end.row; r++) {
            for (let c = start.col; c <= end.col; c++) {
                applyBorder(worksheet.getRow(r).getCell(c));
            }
        }
    };

    // Row 1: Appendix 60
    worksheet.mergeCells('A1:F1');
    const appendixCell = worksheet.getCell('A1');
    appendixCell.value = 'Appendix 60';
    appendixCell.font = { name: 'Arial', italic: true, size: 10 };
    appendixCell.alignment = { horizontal: 'right' };

    // Row 2: PURCHASE REQUEST
    worksheet.mergeCells('A2:F2');
    const titleCell = worksheet.getCell('A2');
    titleCell.value = 'PURCHASE REQUEST';
    titleCell.font = { name: 'Arial', bold: true, size: 14 };
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };

    // Row 3: Entity Name & Fund Cluster
    worksheet.mergeCells('A3:D3');
    const entityCell = worksheet.getCell('A3');
    entityCell.value = `Entity Name: DILG R1`;
    entityCell.font = { name: 'Arial', bold: true, size: 10 };
    applyRangeBorder('A3', 'D3');

    worksheet.mergeCells('E3:F3');
    const fundCell = worksheet.getCell('E3');
    fundCell.value = `Fund Cluster: ________________`;
    fundCell.font = { name: 'Arial', bold: true, size: 10 };
    applyRangeBorder('E3', 'F3');

    // Row 4-5: Office/Section, PR No, Date
    worksheet.mergeCells('A4:B5');
    const officeLabelCell = worksheet.getCell('A4');
    officeLabelCell.value = `Office/Section :\n\n${office || '________________'}`;
    officeLabelCell.font = { name: 'Arial', bold: true, size: 10 };
    officeLabelCell.alignment = { vertical: 'top', wrapText: true };
    applyRangeBorder('A4', 'B5');

    worksheet.mergeCells('C4:E4');
    const prNoCell = worksheet.getCell('C4');
    prNoCell.value = `PR No.: ${prNo || '________________'}`;
    prNoCell.font = { name: 'Arial', bold: true, size: 10 };
    applyRangeBorder('C4', 'E4');

    worksheet.mergeCells('F4:F5');
    const dateCell = worksheet.getCell('F4');
    dateCell.value = `Date: ${date}`;
    dateCell.font = { name: 'Arial', bold: true, size: 10 };
    dateCell.alignment = { vertical: 'middle', horizontal: 'center' };
    applyRangeBorder('F4', 'F5');

    worksheet.mergeCells('C5:E5');
    const respCodeCell = worksheet.getCell('C5');
    respCodeCell.value = 'Responsibility Center Code : ________________';
    respCodeCell.font = { name: 'Arial', bold: true, size: 10 };
    applyRangeBorder('C5', 'E5');

    // --- Table Headers ---
    const headerRow = worksheet.getRow(6);
    headerRow.values = [
        'Stock/\nProperty No.',
        'Unit',
        'Item Description',
        'Quantity',
        'Unit Cost',
        'Total Cost'
    ];
    headerRow.height = 35;
    headerRow.font = { name: 'Arial', bold: true, size: 10 };
    headerRow.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    headerRow.eachCell((cell) => applyBorder(cell));

    // --- Table Data ---
    let currentRow = 7;
    items.forEach((item) => {
        const row = worksheet.getRow(currentRow);
        const itemTotal = (parseFloat(item.quantity) || 0) * (parseFloat(item.unit_cost) || 0);
        row.values = [
            '', // Stock No
            item.unit || '',
            item.description || '',
            item.quantity || 0,
            parseFloat(item.unit_cost) || 0,
            itemTotal
        ];
        
        row.getCell(5).numFmt = '#,##0.00';
        row.getCell(6).numFmt = '#,##0.00';
        row.getCell(3).alignment = { wrapText: true, vertical: 'top' };
        row.eachCell((cell) => applyBorder(cell));
        currentRow++;
    });

    // Fill minimum rows to keep template look (standard form has fixed number of rows)
    const minRows = 22;
    while (currentRow < minRows) {
        const row = worksheet.getRow(currentRow);
        for (let c = 1; c <= 6; c++) {
            applyBorder(row.getCell(c));
        }
        currentRow++;
    }

    // --- Footer Section ---

    // Total Row
    worksheet.mergeCells(`A${currentRow}:E${currentRow}`);
    const totalLabelCell = worksheet.getCell(`A${currentRow}`);
    totalLabelCell.value = 'TOTAL  ';
    totalLabelCell.font = { name: 'Arial', bold: true };
    totalLabelCell.alignment = { horizontal: 'right' };
    applyRangeBorder(`A${currentRow}`, `E${currentRow}`);
    
    const totalValueCell = worksheet.getCell(`F${currentRow}`);
    totalValueCell.value = total;
    totalValueCell.numFmt = '#,##0.00';
    totalValueCell.font = { name: 'Arial', bold: true };
    applyBorder(totalValueCell);
    currentRow++;

    // Purpose Row
    worksheet.mergeCells(`A${currentRow}:F${currentRow + 1}`);
    const purposeCell = worksheet.getCell(`A${currentRow}`);
    purposeCell.value = `Purpose: ${title || 'For official use of DILG R1'}`;
    purposeCell.font = { name: 'Arial', size: 10 };
    purposeCell.alignment = { vertical: 'top', wrapText: true };
    applyRangeBorder(`A${currentRow}`, `F${currentRow + 1}`);
    currentRow += 2;

    // Signatory Headers
    worksheet.mergeCells(`A${currentRow}:C${currentRow}`);
    worksheet.getCell(`A${currentRow}`).value = 'Requested by:';
    worksheet.mergeCells(`D${currentRow}:F${currentRow}`);
    worksheet.getCell(`D${currentRow}`).value = 'Approved by:';
    const sigHeaderRow = worksheet.getRow(currentRow);
    sigHeaderRow.font = { name: 'Arial', bold: true, size: 10 };
    applyRangeBorder(`A${currentRow}`, `C${currentRow}`);
    applyRangeBorder(`D${currentRow}`, `F${currentRow}`);
    currentRow++;

    // Signature Area
    worksheet.mergeCells(`A${currentRow}:C${currentRow}`);
    worksheet.mergeCells(`D${currentRow}:F${currentRow}`);
    worksheet.getRow(currentRow).height = 40; // Provide space for actual signature
    applyRangeBorder(`A${currentRow}`, `C${currentRow}`);
    applyRangeBorder(`D${currentRow}`, `F${currentRow}`);
    currentRow++;

    // Labels for Signature/Name/Designation
    const labels = [
        { label: 'Signature:', height: 20 },
        { label: 'Printed Name:', height: 20 },
        { label: 'Designation:', height: 20 }
    ];

    labels.forEach((l) => {
        const row = worksheet.getRow(currentRow);
        row.height = l.height;
        
        // Requested side
        worksheet.mergeCells(`A${currentRow}:C${currentRow}`);
        const leftCell = worksheet.getCell(`A${currentRow}`);
        leftCell.value = l.label;
        leftCell.font = { name: 'Arial', size: 9 };
        leftCell.alignment = { vertical: 'bottom', horizontal: 'left' };
        applyRangeBorder(`A${currentRow}`, `C${currentRow}`);

        // Approved side
        worksheet.mergeCells(`D${currentRow}:F${currentRow}`);
        const rightCell = worksheet.getCell(`D${currentRow}`);
        rightCell.value = l.label;
        rightCell.font = { name: 'Arial', size: 9 };
        rightCell.alignment = { vertical: 'bottom', horizontal: 'left' };
        applyRangeBorder(`D${currentRow}`, `F${currentRow}`);

        currentRow++;
    });

    // Download
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `PR_${prNo || 'Document'}.xlsx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
};
