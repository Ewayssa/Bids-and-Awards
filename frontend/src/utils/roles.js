/**
 * Simple role system: admin and employee only.
 */

export const ROLES = {
    ADMIN: 'admin',
    EMPLOYEE: 'employee',
};

export const ROLE_DISPLAY_NAMES = {
    [ROLES.ADMIN]: 'Admin',
    [ROLES.EMPLOYEE]: 'Employee',
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
    [ROLES.EMPLOYEE]: [
        PERMISSIONS.UPLOAD_DOCUMENTS,
        PERMISSIONS.VIEW_OWN_DOCUMENTS,
        PERMISSIONS.VIEW_REPORTS,
        PERMISSIONS.VIEW_DASHBOARD,
        PERMISSIONS.MANAGE_EVENTS,
    ],
};

export const NAV_ACCESS_RULES = {
    '/': [ROLES.ADMIN, ROLES.EMPLOYEE],
    '/encode': [ROLES.ADMIN, ROLES.EMPLOYEE],
    '/reports': [ROLES.ADMIN, ROLES.EMPLOYEE],
    '/personnel': [ROLES.ADMIN],
    '/settings': [ROLES.ADMIN],
    '/audit-trail': [ROLES.ADMIN],
};

export const canAccessRoute = (userRole, route) => {
    if (!userRole || !route) return false;
    if (userRole === ROLES.ADMIN) return true;
    const allowed = NAV_ACCESS_RULES[route] || [];
    return allowed.includes(userRole);
};

const ROUTES_ORDER = ['/', '/encode', '/reports', '/personnel', '/audit-trail', '/settings'];

export const getDefaultRouteForRole = (userRole) => {
    if (!userRole) return '/';
    for (const route of ROUTES_ORDER) {
        if (canAccessRoute(userRole, route)) return route;
    }
    return '/';
};

export const hasPermission = (userRole, permission) => {
    if (!userRole || !permission) return false;
    const permissions = ROLE_PERMISSIONS[userRole] || [];
    return permissions.includes(permission);
};

export const hasAnyPermission = (userRole, permissions) => {
    if (!userRole || !permissions?.length) return false;
    return permissions.some((p) => hasPermission(userRole, p));
};

export const getRoleDisplayName = (role) => {
    if (!role) return ROLE_DISPLAY_NAMES[ROLES.EMPLOYEE];
    return ROLE_DISPLAY_NAMES[role] || role || 'Employee';
};

export const getAvailableRoles = () => [
    { value: ROLES.ADMIN, label: ROLE_DISPLAY_NAMES[ROLES.ADMIN] },
    { value: ROLES.EMPLOYEE, label: ROLE_DISPLAY_NAMES[ROLES.EMPLOYEE] },
];

/** Map backend role to frontend (normalize legacy values). */
export const mapOldRoleToNew = (oldRole) => {
    if (!oldRole) return ROLES.EMPLOYEE;
    const r = String(oldRole).toLowerCase().trim();
    if (r === 'admin' || r === 'administrator') return ROLES.ADMIN;
    return ROLES.EMPLOYEE;
};

// Document permission helpers
export const canViewDocument = (user, document) => {
    if (!user || !document) return false;
    if (hasPermission(user.role, PERMISSIONS.VIEW_ALL_DOCUMENTS)) return true;
    if (hasPermission(user.role, PERMISSIONS.VIEW_OWN_DOCUMENTS)) {
        const who = user.fullName || user.username;
        const owner = document.uploadedBy || document.uploaded_by;
        return who === owner;
    }
    return false;
};

export const canEditDocument = (user, document) => {
    if (!user || !document) return false;
    if (hasPermission(user.role, PERMISSIONS.EDIT_DOCUMENTS)) return true;
    const who = user.fullName || user.username;
    const owner = document.uploadedBy || document.uploaded_by;
    return who === owner && hasPermission(user.role, PERMISSIONS.UPLOAD_DOCUMENTS);
};

export const canDeleteDocument = (user) => {
    return user && hasPermission(user.role, PERMISSIONS.DELETE_DOCUMENTS);
};

export const canApproveDocuments = (user) => {
    return user?.role === ROLES.ADMIN;
};
