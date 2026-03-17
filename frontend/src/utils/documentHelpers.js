/**
 * Helper functions for document management
 */

/**
 * Get missing required fields for a document
 * @param {Object} doc - Document object
 * @returns {Array} - List of missing field keys
 */
export function getMissingFields(doc) {
    const required = ['title', 'category', 'subDoc', 'date', 'file'];
    const missing = [];

    required.forEach(field => {
        const value = doc[field];
        if (!value || (typeof value === 'string' && value.trim() === '')) {
            missing.push(field);
        }
    });

    return missing;
}

/**
 * Check if document has all required fields
 * @param {Object} doc - Document object
 * @returns {boolean} - True if complete
 */
export function isDocumentComplete(doc) {
    return getMissingFields(doc).length === 0;
}

/**
 * Get status color for UI display
 * @param {string} status - Document status
 * @returns {string} - CSS class name
 */
export function getStatusColor(status) {
    switch (status) {
        case 'pending': return 'text-yellow-600 bg-yellow-100';
        case 'ongoing': return 'text-blue-600 bg-blue-100';
        case 'complete': return 'text-green-600 bg-green-100';
        default: return 'text-gray-600 bg-gray-100';
    }
}

/**
 * Get status icon for UI display
 * @param {string} status - Document status
 * @returns {string} - Icon name
 */
export function getStatusIcon(status) {
    switch (status) {
        case 'pending': return 'MdSchedule';
        case 'ongoing': return 'MdTimeline';
        case 'complete': return 'MdCheckCircle';
        default: return 'MdDescription';
    }
}

/**
 * Filter documents by search query
 * @param {Array} documents - Document list
 * @param {string} query - Search query
 * @returns {Array} - Filtered documents
 */
export function filterDocumentsByQuery(documents, query) {
    if (!query) return documents;

    const lowerQuery = query.toLowerCase();
    return documents.filter(doc =>
        doc.title?.toLowerCase().includes(lowerQuery) ||
        doc.category?.toLowerCase().includes(lowerQuery) ||
        doc.subDoc?.toLowerCase().includes(lowerQuery) ||
        doc.prNo?.toLowerCase().includes(lowerQuery) ||
        doc.uploadedBy?.toLowerCase().includes(lowerQuery)
    );
}

/**
 * Filter documents by category
 * @param {Array} documents - Document list
 * @param {string} category - Category filter
 * @returns {Array} - Filtered documents
 */
export function filterDocumentsByCategory(documents, category) {
    if (!category) return documents;
    return documents.filter(doc => doc.category === category);
}

/**
 * Filter documents by status
 * @param {Array} documents - Document list
 * @param {string} status - Status filter
 * @returns {Array} - Filtered documents
 */
export function filterDocumentsByStatus(documents, status) {
    if (!status) return documents;
    return documents.filter(doc => doc.status === status);
}

/**
 * Sort documents by field
 * @param {Array} documents - Document list
 * @param {string} sortKey - Sort field
 * @param {string} sortDir - Sort direction ('asc' or 'desc')
 * @returns {Array} - Sorted documents
 */
export function sortDocuments(documents, sortKey, sortDir) {
    if (!sortKey) return documents;

    return [...documents].sort((a, b) => {
        let aVal, bVal;

        switch (sortKey) {
            case 'uploaded_at':
            case 'updated_at':
                aVal = new Date(a[sortKey] || 0).getTime();
                bVal = new Date(b[sortKey] || 0).getTime();
                break;
            case 'status':
                aVal = a[sortKey] || '';
                bVal = b[sortKey] || '';
                break;
            case 'category':
                aVal = a[sortKey] || '';
                bVal = b[sortKey] || '';
                break;
            default:
                aVal = String(a[sortKey] || '').toLowerCase();
                bVal = String(b[sortKey] || '').toLowerCase();
        }

        if (aVal < bVal) return sortDir === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortDir === 'asc' ? 1 : -1;
        return 0;
    });
}

/**
 * Group documents by category
 * @param {Array} documents - Document list
 * @returns {Object} - Grouped documents { category: [docs] }
 */
export function groupDocumentsByCategory(documents) {
    return documents.reduce((groups, doc) => {
        const category = doc.category || 'Uncategorized';
        if (!groups[category]) groups[category] = [];
        groups[category].push(doc);
        return groups;
    }, {});
}