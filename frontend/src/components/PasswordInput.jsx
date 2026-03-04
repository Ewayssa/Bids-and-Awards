import React, { useState } from 'react';
import { MdVisibility, MdVisibilityOff, MdCheck, MdRadioButtonUnchecked } from 'react-icons/md';

/** Default rules: backend enforces 8+ chars only */
export const DEFAULT_PASSWORD_RULES = [
    { test: (v) => v.length >= 8, label: 'At least 8 characters' },
];

/**
 * 21st.dev-style password input with show/hide toggle and live requirements checklist.
 * Checklist items show ✓ (met) or ○ (not met) and update as the user types.
 */
const PasswordInput = ({
    id,
    label,
    value,
    onChange,
    placeholder = 'Enter password',
    autoComplete = 'current-password',
    required = false,
    disabled = false,
    error,
    requirements,
    rules = DEFAULT_PASSWORD_RULES,
    showRequirementsChecklist = false,
    variant = 'underline',
    className = '',
    inputClassName = '',
    showToggle = true,
    'aria-describedby': ariaDescribedby,
    ...rest
}) => {
    const [visible, setVisible] = useState(false);
    const showChecklist = showRequirementsChecklist && rules && rules.length > 0;

    const containerClass = variant === 'rounded'
        ? 'rounded-xl border border-[var(--border)] bg-white/50 focus-within:border-[var(--primary)] focus-within:ring-2 focus-within:ring-[var(--primary)]/20 transition-all'
        : 'border-b border-gray-300 focus-within:border-gray-700 transition-colors';
    const inputBaseClass = variant === 'rounded'
        ? 'px-4 py-3 rounded-xl'
        : 'pl-0 py-2.5';

    return (
        <div className={className}>
            {label && (
                <label
                    htmlFor={id}
                    className="block text-sm font-medium text-gray-700 mb-1.5"
                >
                    {label}
                </label>
            )}
            <div
                className={`relative ${containerClass} ${
                    error ? 'border-red-500 focus-within:border-red-500 focus-within:ring-red-500/20' : ''
                }`}
            >
                <input
                    key={visible ? 'visible' : 'hidden'}
                    id={id}
                    type={visible ? 'text' : 'password'}
                    className={`w-full ${inputBaseClass} bg-transparent text-gray-900 placeholder-gray-400 outline-none border-0 focus:ring-0 disabled:opacity-60 disabled:cursor-not-allowed text-[15px] ${
                        showToggle ? 'pr-11' : 'pr-4'
                    } ${inputClassName}`}
                    value={value}
                    onChange={onChange}
                    placeholder={placeholder}
                    autoComplete={autoComplete}
                    required={required}
                    disabled={disabled}
                    aria-invalid={!!error}
                    aria-describedby={
                        [error && `${id}-error`, showChecklist && `${id}-requirements`, ariaDescribedby]
                            .filter(Boolean)
                            .join(' ') || undefined
                    }
                    {...rest}
                />
                {showToggle && (
                    <button
                        type="button"
                        tabIndex={-1}
                        onClick={(e) => {
                            e.preventDefault();
                            setVisible((v) => !v);
                        }}
                        onMouseDown={(e) => e.preventDefault()}
                        className={`absolute top-1/2 -translate-y-1/2 p-1.5 text-gray-400 hover:text-gray-600 focus:outline-none focus:text-gray-700 rounded-lg transition-colors ${
                            variant === 'rounded' ? 'right-2' : 'right-0'
                        }`}
                        aria-label={visible ? 'Hide password' : 'Show password'}
                        disabled={disabled}
                    >
                        {visible ? (
                            <MdVisibilityOff className="w-5 h-5" aria-hidden />
                        ) : (
                            <MdVisibility className="w-5 h-5" aria-hidden />
                        )}
                    </button>
                )}
            </div>

            {/* Live requirements checklist (21st.dev style) */}
            {showChecklist && (
                <div id={`${id}-requirements`} className="mt-3 space-y-1.5" role="list" aria-label="Password requirements">
                    <p className="text-xs font-medium text-[var(--text-muted)] mb-2">Password must contain:</p>
                    {rules.map((rule, i) => {
                        const met = rule.test(value || '');
                        return (
                            <div
                                key={i}
                                className={`flex items-center gap-2 text-sm transition-colors ${
                                    met ? 'text-green-600' : 'text-[var(--text-subtle)]'
                                }`}
                                role="listitem"
                            >
                                {met ? (
                                    <MdCheck className="w-4 h-4 flex-shrink-0" aria-hidden />
                                ) : (
                                    <MdRadioButtonUnchecked className="w-4 h-4 flex-shrink-0 opacity-60" aria-hidden />
                                )}
                                <span>{rule.label}</span>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Legacy: simple requirements text */}
            {!showChecklist && requirements && (Array.isArray(requirements) ? requirements.length > 0 : true) && (
                <p className="mt-2 text-xs text-[var(--text-muted)]" id={id ? `${id}-requirements` : undefined}>
                    Password must contain: {Array.isArray(requirements) ? requirements.join('; ') : requirements}.
                </p>
            )}

            {error && (
                <p id={`${id}-error`} className="mt-2 text-sm text-red-600" role="alert">
                    {error}
                </p>
            )}
        </div>
    );
};

export default PasswordInput;
