import axios from 'axios';

/** Same-origin default (Vite dev proxy). Set VITE_API_BASE_URL for a separate API host in production. */
const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/$/, '');

// Create an axios instance
const api = axios.create({
    baseURL: API_BASE_URL,
});

// Add a request interceptor to add the JWT token to the headers
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Add a response interceptor to handle token expiration
api.interceptors.response.use(
    (response) => response,
    async (error) => {
        if (error.response?.status === 401) {
            // Token expired or invalid, clear local storage and redirect to login
            localStorage.removeItem('token');
            localStorage.removeItem('refreshToken');
            localStorage.removeItem('user');
            if (window.location.pathname !== '/login') {
                window.location.href = '/login';
            }
        }
        return Promise.reject(error);
    }
);

export const documentService = {
    async getAll(params = {}) {
        const url = `/uploaded-documents/`;
        let all = [];
        let nextUrl = url;
        
        // Build query string from params object
        const queryParams = new URLSearchParams();
        Object.entries(params).forEach(([key, value]) => {
            if (value) queryParams.append(key, value);
        });
        
        const queryString = queryParams.toString();
        if (queryString) {
            nextUrl += `?${queryString}`;
        }

        while (nextUrl) {
            const response = await api.get(nextUrl);
            const body = response.data;
            const page = Array.isArray(body) ? body : (body?.results ?? []);
            all = all.concat(page);
            const next = body?.next;
            if (!next) break;
            // Handle pagination URLs from backend
            nextUrl = next.includes(API_BASE_URL) 
                ? next.split(API_BASE_URL)[1] 
                : (next.startsWith('http') ? new URL(next).pathname + new URL(next).search : next);
        }
        return all;
    },

    async getNextTransactionNumber(dateOrNull) {
        const url = dateOrNull
            ? `/next-transaction-number/?date=${encodeURIComponent(dateOrNull)}`
            : `/next-transaction-number/`;
        const response = await api.get(url);
        return response.data.next_transaction_number;
    },

    async create(formData, procurementRecordId = null) {
        if (procurementRecordId) {
            formData.append('procurement_record', procurementRecordId);
        }
        const response = await api.post(`/upload/`, formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
        return response.data;
    },

    async update(id, formData) {
        const response = await api.patch(`/upload/${id}/`, formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
        return response.data;
    },

    async delete(id) {
        const response = await api.delete(`/upload/${id}/`);
        return response.data;
    },

    async updateStatus(id, status) {
        const response = await api.patch(`/upload/${id}/`, { status });
        return response.data;
    },
    
    async assignPRNo(id, userPRNo) {
        const response = await api.post(`/upload/${id}/assign_pr_no/`, { user_pr_no: userPRNo });
        return response.data;
    },

    async addComment(id, comment) {
        const response = await api.post(`/upload/${id}/comments/`, { comment });
        return response.data;
    },

    async getComments(id) {
        const response = await api.get(`/upload/${id}/comments/`);
        return response.data;
    },
};

export const reportService = {
    async getAll() {
        const response = await api.get(`/reports/`);
        return response.data;
    },

    async create(formData) {
        const response = await api.post(`/reports/`, formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
        return response.data;
    },
};

export const dashboardService = {
    async getData(bypassCache = false, uploadedBy = '') {
        const params = bypassCache ? { _: Date.now() } : {};
        if (uploadedBy) params.uploadedBy = uploadedBy;
        const response = await api.get(`/dashboard/`, { params });
        return response.data;
    },
};

export const notificationService = {
    async getAll() {
        let all = [];
        let nextUrl = `/notifications/`;
        while (nextUrl) {
            const response = await api.get(nextUrl);
            const body = response.data;
            const page = Array.isArray(body) ? body : (body?.results ?? []);
            all = all.concat(page);
            const next = body?.next;
            if (!next) break;
            nextUrl = next.includes(API_BASE_URL)
                ? next.split(API_BASE_URL)[1]
                : (next.startsWith('http') ? new URL(next).pathname + new URL(next).search : next);
        }
        return all;
    },
    async markRead(id) {
        const response = await api.post(`/notifications/${id}/mark_read/`);
        return response.data;
    },
    async markAllRead() {
        await api.post(`/notifications/mark_all_read/`);
    },
};

export const calendarEventService = {
    async getAll() {
        const response = await api.get(`/calendar-events/`);
        return response.data;
    },
    async create(data) {
        const response = await api.post(`/calendar-events/`, data);
        return response.data;
    },
    async update(id, data) {
        const response = await api.patch(`/calendar-events/${id}/`, data);
        return response.data;
    },
    async delete(id) {
        await api.delete(`/calendar-events/${id}/`);
    },
};

export const procurementRecordService = {
    async getAll() {
        let all = [];
        let nextUrl = `/procurement-records/`;
        while (nextUrl) {
            const response = await api.get(nextUrl);
            const body = response.data;
            const page = Array.isArray(body) ? body : (body?.results ?? []);
            all = all.concat(page);
            const next = body?.next;
            if (!next) break;
            nextUrl = next.includes(API_BASE_URL)
                ? next.split(API_BASE_URL)[1]
                : (next.startsWith('http') ? new URL(next).pathname + new URL(next).search : next);
        }
        return all;
    },

    async getById(id) {
        const response = await api.get(`/procurement-records/${id}/`);
        return response.data;
    },

    async create(data) {
        const response = await api.post(`/procurement-records/`, data);
        return response.data;
    },

    async update(id, data) {
        const response = await api.patch(`/procurement-records/${id}/`, data);
        return response.data;
    },

    async delete(id) {
        const response = await api.delete(`/procurement-records/${id}/`);
        return response.data;
    },

    async getDocuments(id) {
        const response = await api.get(`/procurement-records/${id}/documents/`);
        return response.data;
    },

    async getDocumentsByStage(id, stageId) {
        const response = await api.get(`/procurement-records/${id}/documents/`, {
            params: { stage: stageId }
        });
        return response.data;
    },

    async recalculateStatus(id) {
        const response = await api.post(`/procurement-records/${id}/recalculate_status/`);
        return response.data;
    },
};

export const auditLogService = {
    async getAll() {
        const response = await api.get(`/audit-log/`);
        const body = response.data;
        if (Array.isArray(body)) return body;
        if (body?.results && Array.isArray(body.results)) return body.results;
        return [];
    },
};

export const userService = {
    async login(username, password) {
        const response = await api.post(`/login/`, { username, password });
        if (response.data.access) {
            localStorage.setItem('token', response.data.access);
            localStorage.setItem('refreshToken', response.data.refresh);
            localStorage.setItem('user', JSON.stringify({
                username: response.data.username,
                role: response.data.role,
                fullName: response.data.fullName,
                position: response.data.position,
                office: response.data.office,
                must_change_password: response.data.must_change_password
            }));
        }
        return response.data;
    },

    async getMyProfile() {
        const response = await api.get(`/me/`);
        return response.data;
    },

    async getAll() {
        const response = await api.get(`/users/`);
        return response.data;
    },

    async create(userData) {
        const response = await api.post(`/users/`, userData);
        return response.data;
    },

    async changePassword(username, currentPassword, newPassword) {
        const response = await api.post(`/change-password/`, {
            username,
            current_password: currentPassword,
            new_password: newPassword,
        });
        return response.data;
    },

    async requestPasswordReset(emailOrUsername) {
        const response = await api.post(`/forgot-password/`, {
            username: emailOrUsername,
            email: emailOrUsername,
        });
        return response.data;
    },

    async updateProfile(username, currentPassword, fullName, position, office) {
        const response = await api.post(`/update-profile/`, {
            username,
            current_password: currentPassword,
            fullName: fullName ?? undefined,
            position: position ?? undefined,
            office: office ?? undefined,
        });
        return response.data;
    },

    async update(id, userData) {
        const response = await api.put(`/users/${id}/`, userData);
        return response.data;
    },

    async getBacMembers() {
        const response = await api.get(`/users/bac_members/`);
        return response.data;
    },

    async patch(id, userData) {
        const response = await api.patch(`/users/${id}/`, userData);
        return response.data;
    },

    async delete(id) {
        const response = await api.delete(`/users/${id}/`);
        return response.data;
    },
};

