/**
 * Authentication and authorization utilities, including role management and password validation.
 */

// --- Roles & Permissions ---

export const ROLES = {
    ADMIN: 'admin',
    USER: 'user',
    ENCODER: 'encoder',
    VIEWER: 'viewer',
};

export const ROLE_DISPLAY_NAMES = {
    [ROLES.ADMIN]: 'Admin',
    [ROLES.USER]: 'User',
};

export const PERMISSIONS = {
    MANAGE_USERS: 'manage_users',
    VIEW_USERS: 'view_users',
    UPLOAD_DOCUMENTS: 'upload_documents',
    EDIT_DOCUMENTS: 'edit_documents',
    DELETE_DOCUMENTS: 'delete_documents',
    VIEW_ALL_DOCUMENTS: 'view_all_documents',
    VIEW_OWN_DOCUMENTS: 'view_own_documents',
    VIEW_REPORTS: 'view_reports',
    UPLOAD_REPORTS: 'upload_reports',
    MANAGE_SETTINGS: 'manage_settings',
    VIEW_DASHBOARD: 'view_dashboard',
    MANAGE_EVENTS: 'manage_events',
};

const ROLE_PERMISSIONS = {
    [ROLES.ADMIN]: Object.values(PERMISSIONS),
    [ROLES.USER]: [
        PERMISSIONS.UPLOAD_DOCUMENTS,
        PERMISSIONS.VIEW_OWN_DOCUMENTS,
        PERMISSIONS.VIEW_REPORTS,
        PERMISSIONS.VIEW_DASHBOARD,
        PERMISSIONS.MANAGE_EVENTS,
    ],
};

export const NAV_ACCESS_RULES = {
    '/': [ROLES.ADMIN, ROLES.USER, ROLES.ENCODER, ROLES.VIEWER],
    '/encode': [ROLES.ADMIN, ROLES.USER, ROLES.ENCODER],
    '/ppmp': [ROLES.ADMIN, ROLES.USER, ROLES.ENCODER],
    '/app': [ROLES.ADMIN, ROLES.USER, ROLES.ENCODER],
    '/pr': [ROLES.ADMIN, ROLES.USER, ROLES.ENCODER],
    '/reports': [ROLES.ADMIN, ROLES.USER, ROLES.ENCODER, ROLES.VIEWER],
    '/personnel': [ROLES.ADMIN],
    '/settings': [ROLES.ADMIN],
    '/audit-trail': [ROLES.ADMIN],
};

/**
 * Check if a role can access a specific route
 */
export const canAccessRoute = (userRole, route) => {
    if (!userRole || !route) return false;
    // Normalize string and trim for safety
    const normalizedRole = String(userRole).toLowerCase().trim();
    if (normalizedRole === ROLES.ADMIN) return true;
    
    const allowed = NAV_ACCESS_RULES[route] || [];
    return allowed.includes(normalizedRole);
};

const ROUTES_ORDER = ['/', '/encode', '/ppmp', '/app', '/pr', '/reports', '/personnel', '/audit-trail', '/settings'];

/**
 * Get the default landing page for a role
 */
export const getDefaultRouteForRole = (userRole) => {
    if (!userRole) return '/';
    for (const route of ROUTES_ORDER) {
        if (canAccessRoute(userRole, route)) return route;
    }
    return '/';
};

/**
 * Check if a role has a specific permission
 */
export const hasPermission = (userRole, permission) => {
    if (!userRole || !permission) return false;
    const permissions = ROLE_PERMISSIONS[userRole] || [];
    return permissions.includes(permission);
};

/**
 * Get the display name for a role
 */
export const getRoleDisplayName = (role) => {
    if (!role) return ROLE_DISPLAY_NAMES[ROLES.USER];
    return ROLE_DISPLAY_NAMES[role] || role || 'User';
};

/**
 * Get all available roles for select inputs
 */
export const getAvailableRoles = () => [
    { value: ROLES.ADMIN, label: ROLE_DISPLAY_NAMES[ROLES.ADMIN] },
    { value: ROLES.USER, label: ROLE_DISPLAY_NAMES[ROLES.USER] },
];

/**
 * Normalize legacy role values from backend
 */
export const mapOldRoleToNew = (oldRole) => {
    if (!oldRole) return ROLES.USER;
    const r = String(oldRole).toLowerCase().trim();
    
    // Admin variants
    if (r === 'admin' || r === 'administrator') return ROLES.ADMIN;
    
    // Encoder / Secretariat variants
    if (r.includes('encoder') || r.includes('secretariat') || r.includes('editor')) return ROLES.ENCODER;
    
    // Viewer / Member variants
    if (r.includes('viewer') || r.includes('guest') || r.includes('member')) return ROLES.VIEWER;
    
    return ROLES.USER;
};

// --- Password Validation ---

/**
 * Password validation with clear error messages
 */
export function validatePassword(password) {
    const errors = [];
    if (typeof password !== 'string') return { valid: false, errors: ['Password must be a string.'] };

    if (password.length < 8) errors.push('Password must be at least 8 characters.');
    if (!/[A-Z]/.test(password)) errors.push('Password must contain at least 1 uppercase letter.');
    if (!/[a-z]/.test(password)) errors.push('Password must contain at least 1 lowercase letter.');
    if (!/[0-9]/.test(password)) errors.push('Password must contain at least 1 number.');
    if (!/[^A-Za-z0-9]/.test(password)) errors.push('Password must contain at least 1 special character.');

    return errors.length === 0 ? { valid: true } : { valid: false, errors };
}

/**
 * Rules for PasswordInput checklist
 */
export const STRICT_PASSWORD_RULES = [
    { test: (v) => (v || '').length >= 8, label: 'At least 8 characters' },
    { test: (v) => /[A-Z]/.test(v || ''), label: 'At least 1 uppercase letter' },
    { test: (v) => /[a-z]/.test(v || ''), label: 'At least 1 lowercase letter' },
    { test: (v) => /[0-9]/.test(v || ''), label: 'At least 1 number' },
    { test: (v) => /[^A-Za-z0-9]/.test(v || ''), label: 'At least 1 special character' },
];
