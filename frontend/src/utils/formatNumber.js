/**
 * Add commas to integer part of a number string (e.g. "1234" -> "1,234").
 * Uses a simple loop so it works in all environments (no regex).
 */
function addCommasToInteger(str) {
    if (str === '' || str === undefined || str === null) return str === undefined || str === null ? '' : str;
    const s = String(str);
    const isNeg = s.charAt(0) === '-';
    const digits = isNeg ? s.slice(1) : s;
    if (digits === '') return s;
    let out = '';
    const len = digits.length;
    for (let i = 0; i < len; i++) {
        if (i > 0 && (len - i) % 3 === 0) out += ',';
        out += digits.charAt(i);
    }
    return (isNeg ? '-' : '') + out;
}

/**
 * Format number with commas as thousands separators.
 * @param {number|string} value - Value to format
 * @param {number} decimals - Decimal places (0 = round to integer)
 * @returns {string} e.g. formatNumber(1234) -> "1,234", formatNumber(33.5, 0) -> "34", formatNumber(33.33, 1) -> "33.3"
 */
export function formatNumber(value, decimals = 0) {
    if (value === null || value === undefined || value === '') return '';
    const n = Number(value);
    if (Number.isNaN(n)) return String(value);
    const neg = n < 0;
    const abs = Math.abs(n);
    let intPart;
    let decPart = '';
    if (decimals === 0) {
        intPart = String(Math.round(abs));
    } else {
        const fixed = abs.toFixed(decimals);
        const dot = fixed.indexOf('.');
        intPart = dot >= 0 ? fixed.substring(0, dot) : fixed;
        decPart = dot >= 0 ? fixed.substring(dot) : '';
    }
    const withCommas = addCommasToInteger(intPart);
    const out = withCommas + decPart;
    return neg ? '-' + out : out;
}
