/**
 * Authentication and authorization utilities, including role management and password validation.
 */

// --- Roles & Permissions ---

export const ROLES = {
    ADMIN: 'admin',
    SECRETARIAT: 'bac_secretariat',
    MEMBER: 'bac_member',
};

export const ROLE_DISPLAY_NAMES = {
    [ROLES.ADMIN]: 'Admin',
    [ROLES.SECRETARIAT]: 'BAC Secretariat',
    [ROLES.MEMBER]: 'BAC Member',
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
    VIEW_DASHBOARD: 'view_dashboard',
    MANAGE_EVENTS: 'manage_events',
};

const ROLE_PERMISSIONS = {
    [ROLES.ADMIN]: Object.values(PERMISSIONS),
    [ROLES.SECRETARIAT]: [
        PERMISSIONS.UPLOAD_DOCUMENTS,
        PERMISSIONS.VIEW_ALL_DOCUMENTS,
        PERMISSIONS.VIEW_REPORTS,
        PERMISSIONS.VIEW_DASHBOARD,
        PERMISSIONS.MANAGE_EVENTS,
    ],
    [ROLES.MEMBER]: [
        PERMISSIONS.VIEW_ALL_DOCUMENTS,
        PERMISSIONS.VIEW_REPORTS,
        PERMISSIONS.VIEW_DASHBOARD,
    ],
};

export const NAV_ACCESS_RULES = {
    '/': [ROLES.ADMIN, ROLES.SECRETARIAT, ROLES.MEMBER],
    '/encode': [ROLES.ADMIN, ROLES.SECRETARIAT],
    '/ppmp': [ROLES.ADMIN, ROLES.SECRETARIAT, ROLES.MEMBER],
    '/app': [ROLES.ADMIN, ROLES.SECRETARIAT, ROLES.MEMBER],
    '/pr': [ROLES.ADMIN, ROLES.SECRETARIAT, ROLES.MEMBER],
    '/reports': [ROLES.ADMIN, ROLES.SECRETARIAT, ROLES.MEMBER],
    '/personnel': [ROLES.ADMIN],
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

const ROUTES_ORDER = ['/', '/encode', '/ppmp', '/app', '/pr', '/reports', '/personnel', '/audit-trail'];

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
    { value: ROLES.SECRETARIAT, label: ROLE_DISPLAY_NAMES[ROLES.SECRETARIAT] },
    { value: ROLES.MEMBER, label: ROLE_DISPLAY_NAMES[ROLES.MEMBER] },
];

/**
 * Normalize legacy role values from backend
 */
export const mapOldRoleToNew = (oldRole, position = '') => {
    const r = String(oldRole || '').toLowerCase().trim();
    const p = String(position || '').toLowerCase().trim();
    
    // Admin variants
    if (r === 'admin' || r === 'administrator') return ROLES.ADMIN;
    
    // Position-based mapping (Preferred)
    if (p === 'bac secretariat') return ROLES.SECRETARIAT;
    if (p === 'bac member') return ROLES.MEMBER;
    
    // Legacy mapping
    if (r.includes('secretariat') || r.includes('encoder')) return ROLES.SECRETARIAT;
    if (r.includes('member') || r.includes('viewer')) return ROLES.MEMBER;
    
    return ROLES.MEMBER; // Default to least privileged new role
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
