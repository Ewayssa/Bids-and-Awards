/**
 * Utility to convert numbers to their English word representation for currency.
 */

export const numberToWords = (num) => {
    if (num === 0) return 'Zero Pesos';
    if (!num || isNaN(num)) return '';

    const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
    const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];

    const convertGroup = (n) => {
        let res = '';
        if (n >= 100) {
            res += ones[Math.floor(n / 100)] + ' Hundred ';
            n %= 100;
        }
        if (n >= 20) {
            res += tens[Math.floor(n / 10)] + ' ';
            n %= 10;
        }
        if (n >= 10) {
            res += teens[n - 10] + ' ';
            n = 0;
        }
        if (n > 0) {
            res += ones[n] + ' ';
        }
        return res.trim();
    };

    const parts = num.toString().split('.');
    const pesos = parseInt(parts[0], 10);
    const centavos = parts.length > 1 ? parseInt(parts[1].substring(0, 2).padEnd(2, '0'), 10) : 0;

    let result = '';

    if (pesos === 0) {
        result = 'Zero';
    } else {
        const billion = Math.floor(pesos / 1000000000);
        const million = Math.floor((pesos % 1000000000) / 1000000);
        const thousand = Math.floor((pesos % 1000000) / 1000);
        const remainder = pesos % 1000;

        if (billion) result += convertGroup(billion) + ' Billion ';
        if (million) result += convertGroup(million) + ' Million ';
        if (thousand) result += convertGroup(thousand) + ' Thousand ';
        if (remainder) result += convertGroup(remainder);
    }

    result = result.trim() + ' Pesos';

    if (centavos > 0) {
        result += ' and ' + convertGroup(centavos) + ' Centavos';
    } else {
        result += ' Only';
    }

    return result;
};
