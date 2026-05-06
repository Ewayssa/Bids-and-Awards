
import { jsPDF } from 'jspdf';
import { numberToWords } from './numberToWords';

const formatAmount = (value) => {
    // If it's a string, strip commas first
    const cleanValue = typeof value === 'string' ? value.replace(/,/g, '') : value;
    const num = Number(cleanValue || 0);
    return isNaN(num) ? '0.00' : num.toLocaleString('en-PH', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
};

const safePOFilenamePart = (value) => String(value || 'Document').replace(/[/\\?%*:|"<>]/g, '_');

export const generatePO_PDFBlob = async (data) => {
    const doc = new jsPDF({ unit: 'pt', format: 'a4', orientation: 'portrait' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 40;
    const contentWidth = pageWidth - (margin * 2);

    // Fonts and styling helpers
    const setFont = (type = 'normal', size = 10) => {
        if (type === 'bold') doc.setFont('times', 'bold');
        else if (type === 'italic') doc.setFont('times', 'italic');
        else if (type === 'bolditalic') doc.setFont('times', 'bolditalic');
        else doc.setFont('times', 'normal');
        doc.setFontSize(size);
    };

    const drawLine = (x1, y1, x2, y2) => {
        doc.setLineWidth(1);
        doc.line(x1, y1, x2, y2);
    };

    const drawRect = (x, y, w, h) => {
        doc.setLineWidth(1);
        doc.rect(x, y, w, h);
    };

    // ---------------- PAGE HEADER ----------------
    let startY = margin;

    setFont('italic', 10);
    doc.text('Appendix 61', pageWidth - margin, startY, { align: 'right' });
    startY += 20;

    setFont('bold', 14);
    doc.text('PURCHASE ORDER', pageWidth / 2, startY, { align: 'center' });
    startY += 14;
    setFont('bold', 12);
    doc.text('DILG REGION 1', pageWidth / 2, startY, { align: 'center' });
    startY += 20;

    // Start Main Box
    const boxStartX = margin;
    let currentY = startY;

    // ---------------- SUPPLIER INFO (Row 1) ----------------
    const row1Height = 50;
    drawRect(boxStartX, currentY, contentWidth, row1Height);

    const midX = boxStartX + (contentWidth * 0.55);
    drawLine(midX, currentY, midX, currentY + row1Height); // Vertical divider

    // Left Side
    setFont('normal', 10);
    doc.text('Supplier:', boxStartX + 5, currentY + 14);
    setFont('bold', 10);
    doc.text(String(data.supplier_name || '').toUpperCase(), boxStartX + 50, currentY + 14);

    setFont('normal', 10);
    doc.text('Address:', boxStartX + 5, currentY + 28);
    setFont('normal', 9);
    doc.text(String(data.supplier_address || '').toUpperCase(), boxStartX + 50, currentY + 28, { maxWidth: midX - boxStartX - 55 });

    setFont('normal', 10);
    doc.text('TIN:', boxStartX + 5, currentY + 42);
    doc.text(String(data.tin || ''), boxStartX + 50, currentY + 42);

    // Right Side
    setFont('normal', 10);
    doc.text('P.O. No.:', midX + 5, currentY + 14);
    setFont('bold', 10);
    doc.text(String(data.po_no || ''), midX + 95, currentY + 14);

    setFont('normal', 10);
    doc.text('Date:', midX + 5, currentY + 28);
    doc.text(String(data.po_date || data.date || ''), midX + 95, currentY + 28);

    doc.text('Mode of Procurement:', midX + 5, currentY + 42);
    setFont('bold', 8); // Slightly smaller to fit long strings like NEGOTIATED PROCUREMENT
    doc.text(String(data.mode_of_procurement || '').toUpperCase(), midX + 95, currentY + 42, { maxWidth: contentWidth - (midX - boxStartX) - 100 });

    currentY += row1Height;

    // ---------------- SALUTATION (Row 2) ----------------
    const row2Height = 30;
    drawRect(boxStartX, currentY, contentWidth, row2Height);

    setFont('normal', 10);
    doc.text('Gentlemen:', boxStartX + 5, currentY + 12);
    doc.text('Please furnish this Office the following articles subject to the terms and conditions contained herein:', boxStartX + 30, currentY + 24);

    currentY += row2Height;

    // ---------------- DELIVERY INFO (Row 3) ----------------
    const row3Height = 35;
    drawRect(boxStartX, currentY, contentWidth, row3Height);
    drawLine(pageWidth / 2, currentY, pageWidth / 2, currentY + row3Height);

    // Left
    doc.text('Place of Delivery:', boxStartX + 5, currentY + 14);
    setFont('bold', 10);
    doc.text(String(data.place_of_delivery || ''), boxStartX + 90, currentY + 14);

    setFont('normal', 10);
    doc.text('Date of Delivery:', boxStartX + 5, currentY + 28);
    setFont('bold', 10);
    doc.text(String(data.date_of_delivery || ''), boxStartX + 90, currentY + 28);

    // Right
    setFont('normal', 10);
    doc.text('Payment Term:', (pageWidth / 2) + 5, currentY + 14);
    setFont('bold', 10);
    doc.text(String(data.payment_term || '').toUpperCase(), (pageWidth / 2) + 80, currentY + 14);

    currentY += row3Height;

    // ---------------- ITEMS TABLE ----------------
    const colWidths = [
        contentWidth * 0.12, // Stock No
        contentWidth * 0.08, // Unit
        contentWidth * 0.45, // Description
        contentWidth * 0.09, // Qty
        contentWidth * 0.12, // Unit Cost
        contentWidth * 0.14  // Amount
    ];

    const colX = [];
    let acc = boxStartX;
    for (let w of colWidths) {
        colX.push(acc);
        acc += w;
    }

    const headerHeight = 25;
    drawRect(boxStartX, currentY, contentWidth, headerHeight);

    for (let i = 1; i < colX.length; i++) {
        drawLine(colX[i], currentY, colX[i], currentY + headerHeight);
    }

    setFont('bold', 9);
    doc.text('Stock/ Property No.', colX[0] + (colWidths[0] / 2), currentY + 12, { align: 'center', maxWidth: colWidths[0] - 4 });
    doc.text('Unit', colX[1] + (colWidths[1] / 2), currentY + 15, { align: 'center' });
    doc.text('Description', colX[2] + (colWidths[2] / 2), currentY + 15, { align: 'center' });
    doc.text('Quantity', colX[3] + (colWidths[3] / 2), currentY + 15, { align: 'center' });
    doc.text('Unit Cost', colX[4] + (colWidths[4] / 2), currentY + 15, { align: 'center' });
    doc.text('Amount', colX[5] + (colWidths[5] / 2), currentY + 15, { align: 'center' });

    currentY += headerHeight;

    // Draw Items
    const items = data.purchase_request_details?.items || data.items || [];
    let tableYStart = currentY;
    let minRows = 15;
    let rowsDrawn = 0;

    const drawRow = (item, isBlank = false) => {
        // If getting near the bottom margin, create a new page
        if (currentY > pageHeight - margin - 200) {
            // Draw outer borders for the current page table before moving
            drawRect(boxStartX, tableYStart, contentWidth, currentY - tableYStart);
            for (let i = 1; i < colX.length; i++) {
                drawLine(colX[i], tableYStart, colX[i], currentY);
            }

            doc.addPage();
            currentY = margin;
            tableYStart = currentY;

            // Re-draw headers on new page
            drawRect(boxStartX, currentY, contentWidth, headerHeight);
            for (let i = 1; i < colX.length; i++) {
                drawLine(colX[i], currentY, colX[i], currentY + headerHeight);
            }
            setFont('bold', 9);
            doc.text('Stock/ Property No.', colX[0] + (colWidths[0] / 2), currentY + 12, { align: 'center', maxWidth: colWidths[0] - 4 });
            doc.text('Unit', colX[1] + (colWidths[1] / 2), currentY + 15, { align: 'center' });
            doc.text('Description', colX[2] + (colWidths[2] / 2), currentY + 15, { align: 'center' });
            doc.text('Quantity', colX[3] + (colWidths[3] / 2), currentY + 15, { align: 'center' });
            doc.text('Unit Cost', colX[4] + (colWidths[4] / 2), currentY + 15, { align: 'center' });
            doc.text('Amount', colX[5] + (colWidths[5] / 2), currentY + 15, { align: 'center' });
            currentY += headerHeight;
            tableYStart = currentY;
        }

        let rowHeight = 20;

        if (!isBlank) {
            const quantity = parseFloat(item.quantity) || 0;
            const unitCost = parseFloat(item.unit_cost) || 0;
            const rowTotal = quantity * unitCost;

            setFont('bold', 9);
            const descLines = doc.splitTextToSize(item.description || '', colWidths[2] - 8);
            rowHeight = Math.max(20, (descLines.length * 12) + 8);

            doc.text(item.stockNo || '', colX[0] + (colWidths[0] / 2), currentY + 12, { align: 'center' });
            setFont('normal', 9);
            doc.text(item.unit || '', colX[1] + (colWidths[1] / 2), currentY + 12, { align: 'center' });

            setFont('bold', 9);
            doc.text(descLines, colX[2] + 4, currentY + 12);

            setFont('normal', 9);
            doc.text(quantity.toString(), colX[3] + (colWidths[3] / 2), currentY + 12, { align: 'center' });
            doc.text(formatAmount(unitCost), colX[4] + colWidths[4] - 4, currentY + 12, { align: 'right' });
            setFont('bold', 9);
            doc.text(formatAmount(rowTotal), colX[5] + colWidths[5] - 4, currentY + 12, { align: 'right' });
        }

        currentY += rowHeight;
        rowsDrawn++;
    };

    items.forEach(item => drawRow(item, false));
    while (rowsDrawn < minRows) {
        drawRow({}, true);
    }

    // Draw table vertical borders
    drawRect(boxStartX, tableYStart, contentWidth, currentY - tableYStart);
    for (let i = 1; i < colX.length; i++) {
        drawLine(colX[i], tableYStart, colX[i], currentY);
    }

    // ---------------- TOTAL ROW ----------------
    const totalRowHeight = 25;
    drawRect(boxStartX, currentY, contentWidth, totalRowHeight);
    drawLine(colX[2], currentY, colX[2], currentY + totalRowHeight); // Label divider
    drawLine(colX[5], currentY, colX[5], currentY + totalRowHeight); // Amount divider

    setFont('bold', 9);
    const labelCenterX = boxStartX + ((colX[2] - boxStartX) / 2);
    doc.text('(Total Amount in Words)', labelCenterX, currentY + 16, { align: 'center' });

    setFont('normal', 10);
    const amountInWords = String(data.amount_in_words || numberToWords(data.total_amount || 0));
    const amountMaxWidth = (colX[5] - colX[2]) - 10;
    const amountLines = doc.splitTextToSize(amountInWords, amountMaxWidth);
    const textHeight = amountLines.length * 10;
    const textYOffset = currentY + ((totalRowHeight - textHeight) / 2) + 8;
    doc.text(amountLines, colX[2] + 5, textYOffset);
    setFont('bold', 10);
    doc.text(formatAmount(data.total_amount || 0), colX[5] + colWidths[5] - 4, currentY + 16, { align: 'right' });

    currentY += totalRowHeight;

    // ---------------- PENALTY CLAUSE ----------------
    const penaltyHeight = 35;
    drawRect(boxStartX, currentY, contentWidth, penaltyHeight);
    setFont('normal', 9);
    doc.text('In case of failure to make the full delivery within the time specified above, a penalty of one-tenth (1/10) of one percent for every day of delay shall be imposed on the undelivered item/s.', boxStartX + 5, currentY + 14, { maxWidth: contentWidth - 10 });

    currentY += penaltyHeight;

    // ---------------- SIGNATURE SECTION ----------------
    const sigHeight = 105;
    drawRect(boxStartX, currentY, contentWidth, sigHeight);
    drawLine(pageWidth / 2, currentY, pageWidth / 2, currentY + sigHeight);

    // Conforme
    doc.text('Conforme:', boxStartX + 5, currentY + 15);

    const conformeCenter = boxStartX + (contentWidth / 4);
    drawLine(conformeCenter - 80, currentY + 60, conformeCenter + 80, currentY + 60);
    setFont('normal', 8);
    doc.text('Signature over Printed Name of Supplier', conformeCenter, currentY + 70, { align: 'center' });

    drawLine(conformeCenter - 40, currentY + 88, conformeCenter + 40, currentY + 88);
    doc.text('Date', conformeCenter, currentY + 98, { align: 'center' });

    // Very truly yours
    setFont('normal', 9);
    doc.text('Very truly yours,', (pageWidth / 2) + 5, currentY + 15);

    const approverCenter = (pageWidth / 2) + (contentWidth / 4);
    setFont('bold', 10);
    doc.text('JONATHAN PAUL M. LEUSEN, JR., CESO III', approverCenter, currentY + 55, { align: 'center' });
    // draw underline
    const txtWidth = doc.getTextWidth('JONATHAN PAUL M. LEUSEN, JR., CESO III');
    drawLine(approverCenter - (txtWidth / 2), currentY + 57, approverCenter + (txtWidth / 2), currentY + 57);

    setFont('bold', 9);
    doc.text('Regional Director', approverCenter, currentY + 68, { align: 'center' });

    drawLine(approverCenter - 60, currentY + 88, approverCenter + 60, currentY + 88);
    setFont('normal', 8);
    doc.text('Designation', approverCenter, currentY + 98, { align: 'center' });

    currentY += sigHeight;

    // ---------------- ACCOUNTING SECTION ----------------
    const accHeight = 90;
    drawRect(boxStartX, currentY, contentWidth, accHeight);
    drawLine(pageWidth / 2, currentY, pageWidth / 2, currentY + accHeight);

    // Left (Fund Cluster)
    setFont('bold', 9);
    doc.text('Fund Cluster :', boxStartX + 5, currentY + 15);
    setFont('normal', 9);
    doc.text(String(data.fund_cluster || ''), boxStartX + 70, currentY + 14);
    drawLine(boxStartX + 70, currentY + 16, boxStartX + 200, currentY + 16);

    setFont('bold', 9);
    doc.text('Funds Available :', boxStartX + 5, currentY + 30);
    setFont('normal', 9);
    const faText = data.funds_available ? `P${formatAmount(data.funds_available)}` : '';
    doc.text(faText, boxStartX + 85, currentY + 29);
    drawLine(boxStartX + 85, currentY + 31, boxStartX + 200, currentY + 31);

    const accountantCenter = boxStartX + (contentWidth / 4);
    setFont('bold', 10);
    doc.text('DENNIS A. LIM', accountantCenter, currentY + 60, { align: 'center' });
    const accWidth = doc.getTextWidth('DENNIS A. LIM');
    drawLine(accountantCenter - (accWidth / 2), currentY + 62, accountantCenter + (accWidth / 2), currentY + 62);

    setFont('bold', 9);
    doc.text('ACCOUNTANT II', accountantCenter, currentY + 72, { align: 'center' });

    setFont('italic', 8);
    doc.text('Signature over Printed Name of Authorized Official', accountantCenter, currentY + 84, { align: 'center' });

    // Right (ORS/BURS)
    const endX = pageWidth - margin - 80;

    setFont('bold', 9);
    const label1 = 'ORS/BURS No. :';
    doc.text(label1, (pageWidth / 2) + 5, currentY + 20);
    const start1 = (pageWidth / 2) + 5 + doc.getTextWidth(label1) + 3;
    setFont('bold', 10);
    doc.text(String(data.ors_burs_no || ''), start1 + 5, currentY + 19);
    drawLine(start1, currentY + 21, endX, currentY + 21);

    setFont('bold', 9);
    const label2 = 'Date of the ORS/BURS:';
    doc.text(label2, (pageWidth / 2) + 5, currentY + 40);
    const start2 = (pageWidth / 2) + 5 + doc.getTextWidth(label2) + 3;
    setFont('normal', 9);
    doc.text(String(data.date_of_ors_burs || ''), start2 + 5, currentY + 39);
    drawLine(start2, currentY + 41, endX, currentY + 41);

    setFont('bold', 9);
    const label3 = 'Amount :';
    doc.text(label3, (pageWidth / 2) + 5, currentY + 60);
    const start3 = (pageWidth / 2) + 5 + doc.getTextWidth(label3) + 3;
    setFont('bold', 10);
    const amountText = (data.total_amount) ? formatAmount(data.total_amount) : '';
    doc.text(amountText, start3 + 5, currentY + 59);
    drawLine(start3, currentY + 61, endX, currentY + 61);

    return doc.output('blob');
};
