/**
 * Password validation with clear error messages for each failed rule.
 *
 * Requirements:
 * - Minimum 8 characters
 * - At least 1 uppercase letter
 * - At least 1 lowercase letter
 * - At least 1 number
 * - At least 1 special character
 *
 * @param {string} password - The password to validate
 * @returns {{ valid: boolean; errors?: string[] }} - Validation result with optional error messages
 */
export function validatePassword(password) {
    const errors = [];

    if (typeof password !== 'string') {
        return { valid: false, errors: ['Password must be a string.'] };
    }

    if (password.length < 8) {
        errors.push('Password must be at least 8 characters.');
    }

    if (!/[A-Z]/.test(password)) {
        errors.push('Password must contain at least 1 uppercase letter.');
    }

    if (!/[a-z]/.test(password)) {
        errors.push('Password must contain at least 1 lowercase letter.');
    }

    if (!/[0-9]/.test(password)) {
        errors.push('Password must contain at least 1 number.');
    }

    if (!/[^A-Za-z0-9]/.test(password)) {
        errors.push('Password must contain at least 1 special character (e.g. !@#$%^&*).');
    }

    return errors.length === 0
        ? { valid: true }
        : { valid: false, errors };
}

/** Rules for PasswordInput checklist (same requirements as validatePassword) */
export const STRICT_PASSWORD_RULES = [
    { test: (v) => (v || '').length >= 8, label: 'At least 8 characters' },
    { test: (v) => /[A-Z]/.test(v || ''), label: 'At least 1 uppercase letter' },
    { test: (v) => /[a-z]/.test(v || ''), label: 'At least 1 lowercase letter' },
    { test: (v) => /[0-9]/.test(v || ''), label: 'At least 1 number' },
    { test: (v) => /[^A-Za-z0-9]/.test(v || ''), label: 'At least 1 special character' },
];
