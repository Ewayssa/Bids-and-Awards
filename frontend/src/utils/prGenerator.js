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
    
    // Page Setup for Multi-page support
    worksheet.pageSetup = {
        paperSize: 9, // A4
        orientation: 'portrait',
        fitToWidth: 1,
        fitToHeight: 0, // Allow vertical flow across pages
        margins: { left: 0.5, right: 0.5, top: 0.5, bottom: 0.5, header: 0.3, footer: 0.3 },
        printTitlesRow: '1:6' // Repeat Header and Table Headers on every page
    };

    // Set view to Page Layout and disable gridlines for a clean document look
    worksheet.views = [{ state: 'pageLayout', showGridLines: false }];

    // Set Column Widths (matching photo proportions)
    worksheet.columns = [
        { width: 12 }, // Stock No (A)
        { width: 8 },  // Unit (B)
        { width: 65 }, // Description (C)
        { width: 9 },  // Quantity (D)
        { width: 15 }, // Unit Cost (E)
        { width: 28 }, // Total Cost (F) - Increased width to prevent Fund Cluster overlap
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
    worksheet.getRow(1).height = 20;

    // Row 2: PURCHASE REQUEST
    worksheet.mergeCells('A2:F2');
    const titleCell = worksheet.getCell('A2');
    titleCell.value = 'PURCHASE REQUEST';
    titleCell.font = { name: 'Arial', bold: true, size: 14 };
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    worksheet.getRow(2).height = 35;

    // Row 3: Entity Name & Fund Cluster
    worksheet.mergeCells('A3:E3');
    const entityCell = worksheet.getCell('A3');
    entityCell.value = `Entity Name: DILG RI`;
    entityCell.font = { name: 'Arial', bold: true, size: 10 };
    entityCell.alignment = { vertical: 'middle', horizontal: 'left' };
    applyRangeBorder('A3', 'E3');
    
    const fundCell = worksheet.getCell('F3');
    fundCell.value = {
        richText: [
            { font: { bold: true, size: 10, name: 'Arial' }, text: 'Fund Cluster: ' },
            { font: { bold: true, size: 10, name: 'Arial', underline: 'single' }, text: '                       ' }
        ]
    };
    fundCell.alignment = { vertical: 'bottom', horizontal: 'left', indent: 1 };
    applyBorder(fundCell);
    worksheet.getRow(3).height = 35; 

    // Row 4-5: Office/Section, PR No, Date
    worksheet.mergeCells('A4:B5');
    const officeLabelCell = worksheet.getCell('A4');
    officeLabelCell.value = `Office/Section : \n${office || ''}`;
    officeLabelCell.font = { name: 'Arial', bold: true, size: 10 };
    officeLabelCell.alignment = { vertical: 'top', wrapText: true };
    applyRangeBorder('A4', 'B5');

    worksheet.mergeCells('C4:E4');
    const prNoCell = worksheet.getCell('E4');
    prNoCell.value = {
        richText: [
            { font: { bold: true, size: 10, name: 'Arial' }, text: 'PR No.: ' },
            { font: { bold: true, size: 10, name: 'Arial', underline: 'single' }, text: '                        ' }
        ]
    };
    prNoCell.alignment = { vertical: 'bottom', horizontal: 'left', indent: 1 };
    applyRangeBorder('E4', 'F4');

    worksheet.mergeCells('F4:F5');
    const dateCell = worksheet.getCell('F4');
    dateCell.value = ` Date: ${date || '___________'}`;
    dateCell.font = { name: 'Arial', bold: true, size: 10 };
    dateCell.alignment = { vertical: 'middle', horizontal: 'left' };
    applyRangeBorder('F4', 'F5');

    worksheet.mergeCells('C5:E5');
    const resCodeCell = worksheet.getCell('C6');
    resCodeCell.value = {
        richText: [
            { font: { bold: true, size: 10, name: 'Arial' }, text: 'Responsibility Center Code : ' },
            { font: { bold: true, size: 10, name: 'Arial', underline: 'single' }, text: '                ' }
        ]
    };
    resCodeCell.alignment = { vertical: 'bottom', horizontal: 'left', indent: 1 };
    applyRangeBorder('C6', 'F6');
    worksheet.getRow(4).height = 25;
    worksheet.getRow(5).height = 25;

    // --- Table Headers ---
    const headerRow = worksheet.getRow(6);
    headerRow.values = [
        'Stock/\nProperty\nNo.',
        'Unit',
        'Item Description',
        'Quantity',
        'Unit Cost',
        'Total Cost'
    ];
    headerRow.height = 45;
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
        
        row.getCell(5).numFmt = '"₱"#,##0.00';
        row.getCell(6).numFmt = '"₱"#,##0.00';
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
    totalLabelCell.alignment = { horizontal: 'right', vertical: 'middle' };
    applyRangeBorder(`A${currentRow}`, `E${currentRow}`);
    
    const totalValueCell = worksheet.getCell(`F${currentRow}`);
    totalValueCell.value = parseFloat(total) || 0;
    totalValueCell.numFmt = '"₱"#,##0.00';
    totalValueCell.font = { name: 'Arial', bold: true };
    totalValueCell.alignment = { horizontal: 'right', vertical: 'middle' };
    applyBorder(totalValueCell);
    currentRow++;

    // Purpose Row
    worksheet.mergeCells(`A${currentRow}:F${currentRow + 1}`);
    const purposeCell = worksheet.getCell(`A${currentRow}`);
    purposeCell.value = 'Purpose: ';
    purposeCell.font = { name: 'Arial', size: 10, bold: true };
    purposeCell.alignment = { vertical: 'top', horizontal: 'left', wrapText: true, indent: 1 };
    applyRangeBorder(`A${currentRow}`, `F${currentRow + 1}`);
    currentRow += 2;

    // Signatory Headers
    worksheet.mergeCells(`B${currentRow}:D${currentRow}`);
    const reqByCell = worksheet.getCell(`B${currentRow}`);
    reqByCell.value = 'Requested by:';
    reqByCell.alignment = { horizontal: 'left', vertical: 'middle' };
    
    worksheet.mergeCells(`E${currentRow}:F${currentRow}`);
    const appByCell = worksheet.getCell(`E${currentRow}`);
    appByCell.value = 'Approved by:';
    appByCell.alignment = { horizontal: 'left', vertical: 'middle' };
    
    const sigHeaderRow = worksheet.getRow(currentRow);
    sigHeaderRow.font = { name: 'Arial', size: 10 }; // Not bold
    applyBorder(worksheet.getCell(`A${currentRow}`));
    applyRangeBorder(`B${currentRow}`, `D${currentRow}`);
    applyRangeBorder(`E${currentRow}`, `F${currentRow}`);
    currentRow++;

    // Labels for Signature Area
    const sigLabels = [
        { label: 'Signature', height: 35 },
        { label: 'Printed\nName :', height: 25 },
        { label: 'Designati\non :', height: 25 }
    ];

    sigLabels.forEach((l) => {
        const row = worksheet.getRow(currentRow);
        row.height = l.height;
        
        // Label in Column A
        const labelCell = worksheet.getCell(`A${currentRow}`);
        labelCell.value = l.label;
        labelCell.font = { name: 'Arial', size: 9 };
        labelCell.alignment = { vertical: 'middle', horizontal: 'left' };
        applyBorder(labelCell);

        // Requested side area (B-D)
        worksheet.mergeCells(`B${currentRow}:D${currentRow}`);
        const reqCell = worksheet.getCell(`B${currentRow}`);
        applyRangeBorder(`B${currentRow}`, `D${currentRow}`);

        // Approved side area (E-F)
        worksheet.mergeCells(`E${currentRow}:F${currentRow}`);
        const appCell = worksheet.getCell(`E${currentRow}`);
        applyRangeBorder(`E${currentRow}`, `F${currentRow}`);

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
