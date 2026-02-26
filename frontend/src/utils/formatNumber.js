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

/**
 * Format amount as Peso: add commas for thousands. Whole number when no decimals; 2 decimals when there is a decimal part. Preserves trailing "." while typing.
 * For very large numbers (e.g. > 15 digits), formats from the string only to avoid JavaScript scientific notation (e.g. 1.23e+21).
 * @param {number|string} value - Value to format (can include commas from input)
 * @returns {string} e.g. "1,234" or "1,234.56" or "1,234." while typing
 */
export function formatPeso(value) {
    if (value === null || value === undefined || value === '') return '';
    let cleaned = String(value).replace(/,/g, '').trim();
    // If value was serialized as scientific notation (e.g. 1.23e+21), use only the part before 'e' so we don't display "1.23e+21"
    if (/e/i.test(cleaned)) cleaned = cleaned.split(/e/i)[0] || '';
    cleaned = cleaned.replace(/[^\d.-]/g, '');
    const isNeg = cleaned.charAt(0) === '-';
    if (isNeg) cleaned = cleaned.slice(1);
    if (cleaned === '' || cleaned === '.') return '';
    const parts = cleaned.split('.');
    const intPartRaw = parts[0] || '0';
    const decPartRaw = parts.length > 1 ? parts.slice(1).join('').slice(0, 2) : '';

    // JavaScript safe integer is 2^53-1 (~16 digits). Format from string when integer part is too long to avoid scientific notation.
    const useStringFormat = intPartRaw.length > 15;
    const trailingDot = cleaned.endsWith('.') && parts.length >= 1;

    if (useStringFormat) {
        const intStr = addCommasToInteger(intPartRaw.replace(/^0+/, '') || '0');
        const decStr = decPartRaw.length > 0 ? '.' + decPartRaw.padEnd(2, '0').slice(0, 2) : (trailingDot ? '.' : '');
        return (isNeg ? '-' : '') + intStr + decStr;
    }

    const n = Number((isNeg ? '-' : '') + intPartRaw + (decPartRaw ? '.' + decPartRaw : ''));
    if (Number.isNaN(n)) return '';
    const abs = Math.abs(n);
    if (trailingDot) {
        const intStr = addCommasToInteger(String(Math.floor(abs)));
        return (isNeg ? '-' : '') + intStr + '.';
    }
    const isWhole = abs === Math.floor(abs);
    if (isWhole) {
        const intStr = addCommasToInteger(String(Math.round(abs)));
        return (isNeg ? '-' : '') + intStr;
    }
    const fixed = abs.toFixed(2);
    const dot = fixed.indexOf('.');
    const intPart = dot >= 0 ? fixed.substring(0, dot) : fixed;
    const decPart = dot >= 0 ? fixed.substring(dot) : '.00';
    const withCommas = addCommasToInteger(intPart);
    return (isNeg ? '-' : '') + withCommas + decPart;
}
