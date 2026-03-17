import { useState, useEffect, useCallback, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { dashboardService, documentService } from '../services/api';

export const useDashboard = (user) => {
    const location = useLocation();
    const [stats, setStats] = useState({ 
        pieData: [0, 0, 0, 0], 
        totalDocumentsUploaded: 0, 
        calendarEvents: [], 
        procurementMethodCounts: { 
            'List of Venue': 0, 
            'Small Value Procurement': 0, 
            'Public Bidding': 0 
        } 
    });
    const [documents, setDocuments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [ringProgress, setRingProgress] = useState(0);

    const loadData = useCallback(async () => {
        if (location.pathname !== '/') return;
        try {
            const [data, docsResponse] = await Promise.all([
                dashboardService.getData(true, ''),
                documentService.getAll(),
            ]);
            const list = Array.isArray(docsResponse) ? docsResponse : (docsResponse?.results ?? []);
            const sorted = [...list].sort((a, b) => (new Date(b.uploaded_at || 0).getTime() - new Date(a.uploaded_at || 0).getTime()));
            
            setStats({
                pieData: data?.pieData ?? [0, 0, 0, 0],
                totalDocumentsUploaded: typeof data?.totalDocumentsUploaded === 'number' 
                    ? data.totalDocumentsUploaded 
                    : (data?.pieData ? (Number(data.pieData[1]) + Number(data.pieData[2])) : 0),
                calendarEvents: data?.calendarEvents ?? [],
                procurementMethodCounts: data?.procurementMethodCounts ?? { 
                    'List of Venue': 0, 
                    'Small Value Procurement': 0, 
                    'Public Bidding': 0 
                },
            });
            setDocuments(sorted);
        } catch {
            setStats({ 
                pieData: [0, 0, 0, 0], 
                totalDocumentsUploaded: 0, 
                calendarEvents: [], 
                procurementMethodCounts: { 
                    'List of Venue': 0, 
                    'Small Value Procurement': 0, 
                    'Public Bidding': 0 
                } 
            });
            setDocuments([]);
        } finally {
            setLoading(false);
        }
    }, [location.pathname]);

    useEffect(() => {
        if (location.pathname !== '/') return;
        setLoading(true);
        let cancelled = false;
        loadData().then(() => {
            if (cancelled) return;
        });
        return () => { cancelled = true; };
    }, [user, location.pathname, loadData]);

    // Animate the document-status ring
    useEffect(() => {
        if (loading || location.pathname !== '/') return;
        setRingProgress(0);
        const duration = 700;
        const start = performance.now();
        let rafId;
        const tick = (now) => {
            const elapsed = now - start;
            const t = Math.min(elapsed / duration, 1);
            const eased = 1 - Math.pow(1 - t, 2.2);
            setRingProgress(eased);
            if (t < 1) rafId = requestAnimationFrame(tick);
        };
        rafId = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(rafId);
    }, [loading, stats.pieData, location.pathname]);

    // Focus and periodic refresh
    useEffect(() => {
        if (location.pathname !== '/') return;
        const onFocus = () => loadData();
        window.addEventListener('focus', onFocus);
        const interval = setInterval(loadData, 30000);
        
        const onDocumentChanged = () => loadData();
        window.addEventListener('documentChanged', onDocumentChanged);

        return () => {
            window.removeEventListener('focus', onFocus);
            clearInterval(interval);
            window.removeEventListener('documentChanged', onDocumentChanged);
        };
    }, [location.pathname, loadData]);

    return {
        stats,
        setStats,
        documents,
        loading,
        ringProgress,
        loadData
    };
};
