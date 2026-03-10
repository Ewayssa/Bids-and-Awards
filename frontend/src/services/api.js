import axios from 'axios';

const API_BASE_URL = '/api';

export const documentService = {
    async getAll() {
        const url = `${API_BASE_URL}/uploaded-documents/`;
        let all = [];
        let nextUrl = url;
        while (nextUrl) {
            const response = await axios.get(nextUrl);
            const body = response.data;
            const page = Array.isArray(body) ? body : (body?.results ?? []);
            all = all.concat(page);
            const next = body?.next;
            if (!next) break;
            nextUrl = next.startsWith('http') ? next : `${window.location.origin}${next.startsWith('/') ? next : '/' + next}`;
        }
        return all;
    },

    async getNextTransactionNumber(dateOrNull) {
        const url = dateOrNull
            ? `${API_BASE_URL}/next-transaction-number/?date=${encodeURIComponent(dateOrNull)}`
            : `${API_BASE_URL}/next-transaction-number/`;
        const response = await axios.get(url);
        return response.data.next_transaction_number;
    },

    async create(formData) {
        const response = await axios.post(`${API_BASE_URL}/upload/`, formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
        return response.data;
    },

    async update(id, formData) {
        const response = await axios.patch(`${API_BASE_URL}/upload/${id}/`, formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
        return response.data;
    },

    async delete(id) {
        const response = await axios.delete(`${API_BASE_URL}/upload/${id}/`);
        return response.data;
    },

    async updateStatus(id, status) {
        const response = await axios.patch(`${API_BASE_URL}/upload/${id}/`, { status });
        return response.data;
    },

    async addComment(id, comment) {
        const response = await axios.post(`${API_BASE_URL}/upload/${id}/comments/`, { comment });
        return response.data;
    },

    async getComments(id) {
        const response = await axios.get(`${API_BASE_URL}/upload/${id}/comments/`);
        return response.data;
    },
};

export const reportService = {
    async getAll() {
        const response = await axios.get(`${API_BASE_URL}/reports/`);
        return response.data;
    },

    async create(formData) {
        const response = await axios.post(`${API_BASE_URL}/reports/`, formData, {
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
        const response = await axios.get(`${API_BASE_URL}/dashboard`, { params });
        return response.data;
    },
};

export const notificationService = {
    async getAll() {
        const response = await axios.get(`${API_BASE_URL}/notifications/`);
        return response.data;
    },
    async markRead(id) {
        const response = await axios.post(`${API_BASE_URL}/notifications/${id}/mark_read/`);
        return response.data;
    },
    async markAllRead() {
        await axios.post(`${API_BASE_URL}/notifications/mark_all_read/`);
    },
};

export const calendarEventService = {
    async getAll() {
        const response = await axios.get(`${API_BASE_URL}/calendar-events/`);
        return response.data;
    },
    async create(data) {
        const response = await axios.post(`${API_BASE_URL}/calendar-events/`, data);
        return response.data;
    },
    async update(id, data) {
        const response = await axios.patch(`${API_BASE_URL}/calendar-events/${id}/`, data);
        return response.data;
    },
    async delete(id) {
        await axios.delete(`${API_BASE_URL}/calendar-events/${id}/`);
    },
};

export const backupRestoreService = {
    async backup(username = '') {
        const params = username ? { username } : undefined;
        const response = await axios.get(`${API_BASE_URL}/backup/`, { responseType: 'json', params });
        return response.data;
    },
    async restore(data, username = '') {
        const payload = username ? { ...(data || {}), username } : data;
        const response = await axios.post(`${API_BASE_URL}/restore/`, payload, {
            headers: { 'Content-Type': 'application/json' },
        });
        return response.data;
    },
};

export const auditLogService = {
    async getAll() {
        const response = await axios.get(`${API_BASE_URL}/audit-log/`);
        const data = response.data;
        if (Array.isArray(data)) return data;
        if (data && Array.isArray(data.results)) return data.results;
        if (data && Array.isArray(data.data)) return data.data;
        return [];
    },
};

export const userService = {
    async getAll() {
        const response = await axios.get(`${API_BASE_URL}/users/`);
        return response.data;
    },

    async register(data) {
        const response = await axios.post(`${API_BASE_URL}/register/`, data);
        return response.data;
    },

    async create(userData) {
        const response = await axios.post(`${API_BASE_URL}/users/`, userData);
        return response.data;
    },

    async changePassword(username, currentPassword, newPassword) {
        const response = await axios.post(`${API_BASE_URL}/change-password/`, {
            username,
            current_password: currentPassword,
            new_password: newPassword,
        });
        return response.data;
    },

    async requestPasswordReset(emailOrUsername) {
        const response = await axios.post(`${API_BASE_URL}/forgot-password/`, {
            username: emailOrUsername,
            email: emailOrUsername,
        });
        return response.data;
    },

    async resetPassword(token, newPassword) {
        const response = await axios.post(`${API_BASE_URL}/reset-password/`, {
            token,
            new_password: newPassword,
        });
        return response.data;
    },

    async updateProfile(username, currentPassword, fullName, position, office) {
        const response = await axios.post(`${API_BASE_URL}/update-profile/`, {
            username,
            current_password: currentPassword,
            fullName: fullName ?? undefined,
            position: position ?? undefined,
            office: office ?? undefined,
        });
        return response.data;
    },

    async update(id, userData) {
        const response = await axios.put(`${API_BASE_URL}/users/${id}/`, userData);
        return response.data;
    },

    async patch(id, userData) {
        const response = await axios.patch(`${API_BASE_URL}/users/${id}/`, userData);
        return response.data;
    },

    async delete(id) {
        const response = await axios.delete(`${API_BASE_URL}/users/${id}/`);
        return response.data;
    },
};
